import type { FastifyPluginAsync } from "fastify";
// import { verifySchema } from "../schemas/otp.js";
import * as OTP from "../services/otp.js";
import { hashApiKey } from "../utils/crypto.js";
import { EzAuthAnalyticsDocument } from "../__generated__/documentTypes.js";
import Stripe from "stripe";
import { EzAuthSendOtpResponse } from "../__generated__/responseTypes.js";
import {
  ApiKeyRulesConfig,
  EzAuthServiceConfig,
} from "../__generated__/configTypes.js";

export const kSendOtpUsageByProject = (
  apikeyPepper: string,
  userId: string,
  projectId: string
) => hashApiKey(`${userId}:${projectId}`, apikeyPepper);
export const kSendOtpUsageByKey = (
  apikeyPepper: string,
  userId: string,
  projectId: string,
  keyId: string
) => hashApiKey(`${userId}:${projectId}:${keyId}`, apikeyPepper);

const routes: FastifyPluginAsync = async (app) => {
  const db = app.firebase.db;
  const stripe = app.stripe as Stripe;
  // Health/readiness check. Unauthenticated by auth plugin exemption.
  app.get("/healthz", async (_req, rep) => {
    let redisOk = false;
    try {
      const pong = await app.redis.ping();
      redisOk = pong === "PONG";
    } catch {
      redisOk = false;
    }

    let sqsOk: boolean | undefined = undefined;

    // Check SQS using the new service methods
    if (app.sqsService) {
      try {
        const sqsStatus = app.sqsService.getStatus();
        const sqsConnection = await app.sqsService.testConnection();
        sqsOk = sqsStatus.configured && sqsConnection.success;
      } catch {
        sqsOk = false;
      }
    }

    const ok = redisOk && sqsOk !== false;

    const payload: any = {
      ok,
      checks: {
        redis: redisOk,
        sqs: sqsOk,
      },
    };

    return rep.code(ok ? 200 : 503).send(payload);
  });

  async function update_topdown_analytics_send_otp() {
    if (!db) {
      throw new Error("Firebase firestore not initialized");
    }

    const dateKey = new Date().toISOString().substring(0, 7); // YYYY-MM format
    const usageRef = db.doc(`analytics/ezauth/topdown/${dateKey}`);

    await db.runTransaction(async (transaction) => {
      const usageDoc = await transaction.get(usageRef);

      if (!usageDoc.exists) {
        transaction.set(usageRef, {
          send_otp_completed_requests: 1,
        } as EzAuthAnalyticsDocument);
      }

      const data = usageDoc.data();
      const send_otp_completed_requests =
        data?.send_otp_completed_requests || 0;
      transaction.set(
        usageRef,
        {
          send_otp_completed_requests: send_otp_completed_requests + 1,
        },
        { merge: true }
      );
    });
  }

  async function update_topdown_analytics_verify_otp() {
    if (!db) {
      throw new Error("Firebase firestore not initialized");
    }

    const dateKey = new Date().toISOString().substring(0, 7); // YYYY-MM format
    const usageRef = db.doc(`analytics/ezauth/topdown/${dateKey}`);

    await db.runTransaction(async (transaction) => {
      const usageDoc = await transaction.get(usageRef);

      if (!usageDoc.exists) {
        transaction.set(usageRef, {
          verify_otp_completed_requests: 1,
        } as EzAuthAnalyticsDocument);
      }

      const data = usageDoc.data();
      const verify_otp_completed_requests =
        data?.verify_otp_completed_requests || 0;
      transaction.set(
        usageRef,
        {
          verify_otp_completed_requests: verify_otp_completed_requests + 1,
        },
        { merge: true }
      );
    });
  }

  async function check_and_increment_otp_send_usage(
    trySendOtp: () => Promise<EzAuthSendOtpResponse>,
    usage_key_lookup_id: string,
    stripe_customer_id: string,
    request_limits?: {
      max_free_requests_per_month?: number;
    }
  ): Promise<EzAuthSendOtpResponse | undefined> {
    if (!db) {
      throw new Error("Firebase firestore not initialized");
    }

    const usageRef = db.doc(`analytics/ezauth/otp/${usage_key_lookup_id}`);

    const result: EzAuthSendOtpResponse | undefined = await db.runTransaction(
      async (transaction) => {
        const dateKey = new Date().toISOString().substring(0, 7); // YYYY-MM format

        const usageDoc = await transaction.get(usageRef);

        // Initialize document if it doesn't exist
        if (!usageDoc.exists) {
          transaction.set(usageRef, {
            send_otp_completed_requests: 1,
            send_otp_completed_monthly_requests: {
              [dateKey]: 1,
            },
          } as EzAuthAnalyticsDocument);
        }

        const data = usageDoc.data();
        const completed_requests = data?.send_otp_completed_requests || 0;
        const completed_monthly_requests =
          data?.send_otp_completed_monthly_requests || {};
        const currentCount = completed_monthly_requests[dateKey] || 0;

        let should_charge: boolean = false;
        if (
          request_limits?.max_free_requests_per_month &&
          currentCount >= request_limits.max_free_requests_per_month
        ) {
          should_charge = true;
        }

        const requestId = await trySendOtp();

        if (should_charge) {
          await stripe.billing.meterEvents.create({
            event_name: "otp_send_api_requests", // your meter name from Stripe dashboard
            payload: {
              value: "1", // usage amount
              stripe_customer_id: stripe_customer_id, // target customer
            },
          });
        }

        transaction.set(
          usageRef,
          {
            send_otp_completed_requests: completed_requests + 1,
            send_otp_completed_monthly_requests: {
              ...completed_monthly_requests,
              [dateKey]: currentCount + 1,
            },
          } as EzAuthAnalyticsDocument,
          { merge: true }
        );

        // no need to wait for this to complete
        update_topdown_analytics_send_otp();

        return requestId;
      }
    );

    return result;
  }

  async function check_and_increment_otp_verify_usage(
    usage_key_lookup_id: string,
    stripe_customer_id: string,
    request_limits?: {
      max_free_requests_per_month?: number;
    }
  ): Promise<void> {
    if (!db) {
      throw new Error("Firebase firestore not initialized");
    }

    const usageRef = db.doc(`analytics/ezauth/otp/${usage_key_lookup_id}`);

    await db.runTransaction(async (transaction) => {
      const dateKey = new Date().toISOString().substring(0, 7); // YYYY-MM format

      const usageDoc = await transaction.get(usageRef);

      // Initialize document if it doesn't exist
      if (!usageDoc.exists) {
        transaction.set(usageRef, {
          verify_otp_completed_requests: 1,
          verify_otp_completed_monthly_requests: {
            [dateKey]: 1,
          },
        } as EzAuthAnalyticsDocument);
      }

      const data = usageDoc.data();
      const completed_requests = data?.verify_otp_completed_requests || 0;
      const completed_monthly_requests =
        data?.verify_otp_completed_monthly_requests || {};
      const currentCount = completed_monthly_requests[dateKey] || 0;

      let should_charge: boolean = false;
      if (
        request_limits?.max_free_requests_per_month &&
        currentCount >= request_limits.max_free_requests_per_month
      ) {
        should_charge = true;
      }

      try {
        if (should_charge) {
          await stripe.billing.meterEvents.create({
            event_name: "otp_verify_api_request", // your meter name from Stripe dashboard
            payload: {
              value: "1", // usage amount
              stripe_customer_id: stripe_customer_id, // target customer
            },
          });
        }

        transaction.set(
          usageRef,
          {
            verify_otp_completed_requests: completed_requests + 1,
            verify_otp_completed_monthly_requests: {
              ...completed_monthly_requests,
              [dateKey]: currentCount + 1,
            },
          } as EzAuthAnalyticsDocument,
          { merge: true }
        );
        // no need to wait for this to complete
        update_topdown_analytics_verify_otp();
      } catch (error) {
        throw new Error("Failed to verify OTP");
      }
    });
  }

  // Issue an OTP and queue a send (if SQS configured). Returns requestId.
  app.post(
    "/send",
    {
      // schema: { body: sendSchema, headers: sendHeadersSchema },
      preHandler: [app.rlPerRoute()],
    },
    async (req: any, rep: any) => {
      const userId = req.user_id as string | undefined;
      const keyId = req.key_id as string | undefined;
      const projectId = req.project_id as string | undefined;
      const stripe_customer_id = req.stripe_customer_id as string | undefined;
      const apiKeyRules = req.apiKeyRules as ApiKeyRulesConfig | undefined;
      if (
        !userId ||
        !keyId ||
        !projectId ||
        !stripe_customer_id ||
        !apiKeyRules
      ) {
        return rep.status(401).send({
          error: { message: "Unauthenticated or missing keyId / projectId" },
        });
      }

      if (!apiKeyRules.ezauth_send_otp_enabled) {
        return rep.status(403).send({
          error: { message: "EzAuth send OTP is not enabled on this API key" },
        });
      }

      const destination = req.body["destination"];
      const channel = req.body["channel"];
      const payload = {
        ...(req.body as any),
        userId,
        projectId,
        serviceInfo: req.service_info,
      };

      // Validate destination based on channel
      if (channel === "sms") {
        // Validate phone number format (10 digits for US)
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(destination)) {
          return rep.status(400).send({
            error: {
              message: "Invalid phone number format. Must be 10 digits.",
            },
          });
        }

        try {
          const trySendOtp = async (): Promise<EzAuthSendOtpResponse> => {
            return await OTP.send(app, payload);
          };

          // update analytics for the user after successfully sending the OTP
          const response = await check_and_increment_otp_send_usage(
            trySendOtp,
            kSendOtpUsageByProject(app.apikeyPepper, userId, projectId),
            stripe_customer_id,
            {
              max_free_requests_per_month: 3,
            }
          );

          if (response === undefined) {
            throw new Error("OTP Send Failed");
          }
          await check_and_increment_otp_send_usage(
            (): Promise<EzAuthSendOtpResponse> => Promise.resolve(response),
            kSendOtpUsageByKey(app.apikeyPepper, userId, projectId, keyId),
            ""
          );

          return rep.status(200).send(response);
        } catch (error: any) {
          req.log.error({ message: error.message }, "otp/send: error");
          return rep.status(500).send({ error: error.message });
        }
      } else if (channel === "email") {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(destination)) {
          return rep
            .status(400)
            .send({ error: { message: "Invalid email format." } });
        }

        return rep
          .status(400)
          .send({ error: { message: "Email sending is not supported yet." } });
      }
    }
  );

  // Verify a previously issued OTP by requestId.
  app.get(
    "/verify/:requestId/:code",
    {
      // schema: { body: verifySchema },
      preHandler: [app.rlPerRoute()],
    },
    async (req: any, rep: any) => {
      const userId = req.user_id as string | undefined;
      const projectId = req.project_id as string | undefined;
      const requestId = req.params.requestId as string | undefined;
      const stripe_customer_id = req.stripe_customer_id as string | undefined;
      const code = req.params.code as string | undefined;
      const apiKeyRules = req.apiKeyRules as ApiKeyRulesConfig | undefined;
      const serviceInfo = req.service_info as EzAuthServiceConfig | undefined;
      if (
        !userId ||
        !requestId ||
        !code ||
        !projectId ||
        !stripe_customer_id ||
        !apiKeyRules ||
        !serviceInfo
      ) {
        return rep.status(401).send({
          error: { message: "Unauthenticated or missing requestId / code" },
        });
      }

      if (!apiKeyRules?.ezauth_verify_otp_enabled) {
        return rep.status(403).send({
          error: {
            message: "EzAuth verify OTP is not enabled on this API key",
          },
        });
      }

      const { verified, error } = await OTP.verify(app, {
        userId,
        requestId,
        code,
        serviceInfo,
      });
      if (!verified) {
        return rep.status(400).send({ error: { message: error } });
      }

      await check_and_increment_otp_verify_usage(
        kSendOtpUsageByProject(app.apikeyPepper, userId, projectId),
        stripe_customer_id,
        {
          max_free_requests_per_month: 2,
        }
      );

      return rep.send({ verified });
    }
  );
};

export default routes;

import type { FastifyPluginAsync } from "fastify";
// import { verifySchema } from "../schemas/otp.js";
import * as OTP from "../services/otp.js";
import Stripe from "stripe";
import { EzAuthSendResponse } from "../__generated__/responseTypes.js";
import {
  ApiKeyRulesConfig,
  EzAuthServiceConfig,
} from "../__generated__/configTypes.js";
import {
  check_and_increment_otp_send_usage,
  kSendOtpUsageByProject,
  kSendOtpUsageByKey,
  check_and_increment_otp_verify_usage,
} from "../services/analytics.js";

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

      try {
        if (channel !== "sms" && channel !== "email") {
          return rep.status(400).send({
            error: {
              message: "Invalid channel. Must be sms or email.",
            },
          });
        }

        if (channel === "email") {
          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(destination)) {
            throw new Error("Invalid email format.");
          }
        }
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
        }

        const trySendOtp = async (): Promise<EzAuthSendResponse> => {
          return await OTP.send(app, payload);
        };

        // update analytics for the user after successfully sending the OTP
        const response = await check_and_increment_otp_send_usage(
          trySendOtp,
          channel === "sms",
          db,
          stripe,
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
          (): Promise<EzAuthSendResponse> => Promise.resolve(response),
          channel === "sms",
          db,
          stripe,
          kSendOtpUsageByKey(app.apikeyPepper, userId, projectId, keyId),
          ""
        );

        return rep.status(200).send(response);
      } catch (error: any) {
        return rep.status(500).send({ error: error.message });
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
        db,
        stripe,
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

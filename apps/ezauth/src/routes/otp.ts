import type { FastifyPluginAsync } from "fastify";
// import { verifySchema } from "../schemas/otp.js";
import * as OTP from "../services/otp.js";
import { hashApiKey } from "../utils/crypto.js";
import { ProjectAnalyticsDocument } from "../__generated__/documentTypes.js";

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

  async function check_and_increment_otp_usage_by_project(
    trySendOtp: () => Promise<string>,
    userId: string,
    projectId: string
  ): Promise<string | undefined> {
    const usage_project_lookup_id = kSendOtpUsageByProject(
      app.apikeyPepper,
      userId,
      projectId
    );
    return check_and_increment_otp_send_usage(
      trySendOtp,
      usage_project_lookup_id,
      {
        max_requests_per_month: 2,
      }
    );
  }

  async function check_and_increment_otp_usage_by_key(
    trySendOtp: () => Promise<string>,
    userId: string,
    projectId: string,
    keyId: string
  ): Promise<string | undefined> {
    const usage_key_lookup_id = kSendOtpUsageByKey(
      app.apikeyPepper,
      userId,
      projectId,
      keyId
    );
    return check_and_increment_otp_send_usage(trySendOtp, usage_key_lookup_id);
  }

  async function check_and_increment_otp_send_usage(
    trySendOtp: () => Promise<string>,
    usage_key_lookup_id: string,
    request_limits?: {
      max_requests_per_month?: number;
      max_requests?: number;
    }
  ): Promise<string | undefined> {
    if (!db) {
      throw new Error("Firebase firestore not initialized");
    }

    const usageRef = db.doc(`analytics/ezauth/send-otp/${usage_key_lookup_id}`);

    const result: string | undefined = await db.runTransaction(
      async (transaction) => {
        const dateKey = new Date().toISOString().substring(0, 7); // YYYY-MM format

        const usageDoc = await transaction.get(usageRef);

        // Initialize document if it doesn't exist
        if (!usageDoc.exists) {
          transaction.set(usageRef, {
            completed_requests: 1,
            completed_monthly_requests: {
              [dateKey]: 1,
            },
          } as ProjectAnalyticsDocument);
        }

        const data = usageDoc.data();
        const completed_requests = data?.completed_requests || 0;
        const completed_monthly_requests =
          data?.completed_monthly_requests || {};
        const currentCount = completed_monthly_requests[dateKey] || 0;

        if (
          request_limits?.max_requests_per_month &&
          currentCount >= request_limits.max_requests_per_month
        ) {
          throw new Error("OTP Send limit per month exceeded");
        }
        if (
          request_limits?.max_requests &&
          completed_requests >= request_limits.max_requests
        ) {
          throw new Error("OTP Send limit per request exceeded");
        }

        try {
          const requestId = await trySendOtp();

          transaction.set(
            usageRef,
            {
              completed_requests: completed_requests + 1,
              completed_monthly_requests: {
                ...completed_monthly_requests,
                [dateKey]: currentCount + 1,
              },
            } as ProjectAnalyticsDocument,
            { merge: true }
          );

          return requestId;
        } catch (error) {
          throw new Error("Failed to send OTP");
        }
      }
    );

    return result;
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
      if (!userId || !keyId || !projectId) {
        return rep.status(401).send({
          error: { message: "Unauthenticated or missing keyId / projectId" },
        });
      }

      const destination = req.body["destination"];
      const channel = req.body["channel"];
      const payload = { ...(req.body as any), userId };

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
          const trySendOtp = async (): Promise<string> => {
            return await OTP.send(app, payload);
          };

          // update analytics for the user after successfully sending the OTP
          const requestId = await check_and_increment_otp_usage_by_project(
            trySendOtp,
            userId,
            projectId
          );
          if (requestId === undefined) {
            throw new Error("OTP Send Failed");
          }
          await check_and_increment_otp_usage_by_key(
            () => Promise.resolve(""),
            userId,
            projectId,
            keyId
          );

          return rep.status(200).send({ requestId });
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
  app.post(
    "/verify",
    {
      // schema: { body: verifySchema },
      preHandler: [app.rlPerRoute()],
    },
    async (req: any, rep: any) => {
      const userId = req.userId as string | undefined;
      if (!userId) {
        return rep.status(401).send({ error: { message: "Unauthenticated" } });
      }
      const payload = { ...(req.body as any), userId };
      console.log("payload: ", JSON.stringify(payload));
      const verified = await OTP.verify(app, payload);
      return rep.send({ verified });
    }
  );

  // Regenerate and (re)send an OTP for an existing request. Enforces cooldown.
  // app.post(
  //   "/resend",
  //   {
  //     schema: { body: resendSchema },
  //     preHandler: [app.rlPerRoute()]
  //   },
  //   async (req: any) => {
  //     const r = await OTP.resend(app, { ...(req.body as any), tenantId: req.tenantId });

  //     if (r.ok) {
  //       req.log.info({ requestId: (req.body as any)?.requestId }, "otp/resend: ok");
  //       return { ok: true };
  //     }

  //     const err: any = new Error(r.code === "not_found" ? "Request not found" : "Resend cooldown in effect");
  //     err.statusCode = r.code === "not_found" ? 404 : 429;
  //     err.code = r.code === "not_found" ? "not_found" : "cooldown";
  //     throw err;
  //   }
  // );
};

export default routes;

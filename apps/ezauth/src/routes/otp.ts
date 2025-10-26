import type { FastifyPluginAsync } from "fastify";
// import { verifySchema } from "../schemas/otp.js";
import * as OTP from "../services/otp.js";

const routes: FastifyPluginAsync = async (app) => {
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
      const userId = req.userId as string | undefined;
      if (!userId) {
        return rep.status(401).send({ error: { message: "Unauthenticated" } });
      }

      const destination = req.body["destination"];
      const channel = req.body["channel"];
      const payload = { ...(req.body as any), userId };

      // Validate destination based on channel
      if (channel === "sms") {
        // Validate phone number format (10 digits for US)
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(destination)) {
          return rep
            .status(400)
            .send({
              error: {
                message: "Invalid phone number format. Must be 10 digits.",
              },
            });
        }

        const requestId = await OTP.send(app, payload);
        req.log.info({ requestId }, "otp/send: issued");
        return rep.send({ requestId });
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

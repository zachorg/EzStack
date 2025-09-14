import type { FastifyPluginAsync } from "fastify";
import { GetQueueUrlCommand } from "@aws-sdk/client-sqs";
import { sendSchema, sendHeadersSchema, verifySchema, resendSchema } from "../schemas/otp.js";
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
    if (app.sqs && app.sqsQueueName) {
      try {
        const r = await app.sqs.send(
          new GetQueueUrlCommand({ QueueName: app.sqsQueueName })
        );
        sqsOk = Boolean(r.QueueUrl);
      } catch {
        sqsOk = false;
      }
    }

    const ok = redisOk && (sqsOk !== false);

    const payload: any = { ok, checks: { redis: redisOk } };
    if (sqsOk !== undefined) {
      payload.checks.sqs = sqsOk;
    }

    return rep.code(ok ? 200 : 503).send(payload);
  });

  // Issue an OTP and queue a send (if SQS configured). Returns requestId.
  app.post(
    "/send",   
    { 
      schema: { body: sendSchema, headers: sendHeadersSchema },
      preHandler: [app.rlPerRoute()]
    },
    async (req: any, rep: any) => {
      // Extract idempotency key from header or body for safe retries
      const hdr = req.headers?.["idempotency-key"] as undefined | string | string[];
      const headerIdem = Array.isArray(hdr) ? hdr[0] : hdr;
      const bodyIdem = (req.body && (req.body as any).idempotencyKey) as undefined | string;
      const idempotencyKey = headerIdem || bodyIdem;
      const payload = { ...(req.body as any), idempotencyKey, tenantId: req.tenantId };
      const requestId = await OTP.send(app, payload);
      req.log.info({ requestId }, "otp/send: issued");
      return rep.send({ requestId });
    }
  );

  // Verify a previously issued OTP by requestId.
  app.post(
    "/verify", 
    {
      schema: { body: verifySchema },
      preHandler: [app.rlPerRoute()]
    },
    async (req: any) => {
      const verified = await OTP.verify(app, { ...(req.body as any), tenantId: req.tenantId });
      return { verified };
    }
  );

  // Regenerate and (re)send an OTP for an existing request. Enforces cooldown.
  app.post(
    "/resend", 
    {
      schema: { body: resendSchema },
      preHandler: [app.rlPerRoute()]
    },
    async (req: any) => {
      const r = await OTP.resend(app, { ...(req.body as any), tenantId: req.tenantId });
      
      if (r.ok) {
        req.log.info({ requestId: (req.body as any)?.requestId }, "otp/resend: ok");
        return { ok: true };
      }
      
      const err: any = new Error(r.code === "not_found" ? "Request not found" : "Resend cooldown in effect");
      err.statusCode = r.code === "not_found" ? 404 : 429;
      err.code = r.code === "not_found" ? "not_found" : "cooldown";
      throw err;
    }
  );
};

export default routes;



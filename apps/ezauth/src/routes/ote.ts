import type { FastifyPluginAsync } from "fastify";
import { sendSchema, sendHeadersSchema, verifySchema, resendSchema } from "../schemas/ote.js";
import * as OTE from "../services/ote.js";

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

    const ok = redisOk;
    const payload: any = { ok, checks: { redis: redisOk } };

    return rep.code(ok ? 200 : 503).send(payload);
  });

  // Issue an OTE and send via SES. Returns requestId.
  app.post(
    "/send",
    {
      schema: { body: sendSchema, headers: sendHeadersSchema },
      preHandler: [app.rlPerRoute()]
    },
    async (req: any, rep: any) => {
      const hdr = req.headers?.["idempotency-key"] as undefined | string | string[];
      const headerIdem = Array.isArray(hdr) ? hdr[0] : hdr;
      const bodyIdem = (req.body && (req.body as any).idempotencyKey) as undefined | string;
      const idempotencyKey = headerIdem || bodyIdem;
      const payload = { ...(req.body as any), idempotencyKey, tenantId: req.tenantId };
      return rep.send({
        requestId: await OTE.send(app, payload)
      });
    }
  );

  // Verify a previously issued OTE by requestId.
  app.post(
    "/verify",
    {
      schema: { body: verifySchema },
      preHandler: [app.rlPerRoute()]
    },
    async (req: any) => {
      return {
        verified: await OTE.verify(app, { ...(req.body as any), tenantId: req.tenantId })
      };
    }
  );

  // Regenerate and (re)send an OTE for an existing request. Enforces cooldown.
  app.post(
    "/resend",
    {
      schema: { body: resendSchema },
      preHandler: [app.rlPerRoute()]
    },
    async (req: any, rep: any) => {
      const r = await OTE.resend(app, { ...(req.body as any), tenantId: req.tenantId });

      if (r.ok) {
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



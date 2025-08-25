import type { FastifyPluginAsync } from "fastify";
import { sendSchema, verifySchema, resendSchema } from "../schemas/otp.js";
import * as OTP from "../services/otp.js";

const routes: FastifyPluginAsync = async (app) => {
  // Issue an OTP and queue a send (if SQS configured). Returns requestId.
  app.post("/send",   
    { schema: { body: sendSchema },
    preHandler: [app.rlPerRoute()] },
    async (req: any, rep: any) => 
        rep.send({ requestId: await OTP.send(app, req.body as any) }));

  // Verify a previously issued OTP by requestId.
  app.post("/verify", 
    { schema: { body: verifySchema },
    preHandler: [app.rlPerRoute()] },
    async (req: any) => 
        ({ verified: await OTP.verify(app, req.body as any) }));

  // Regenerate and (re)send an OTP for an existing request. Enforces cooldown.
  app.post("/resend", 
    { schema: { body: resendSchema }, 
    preHandler: [app.rlPerRoute()] },
    async (req: any, rep: any) => {
        const r = await OTP.resend(app, req.body as any);
        return r.ok 
            ? { ok: true } 
            : rep.code(r.code === "not_found" ? 404 : 429).send({ error: r.code });
  });
};

export default routes;
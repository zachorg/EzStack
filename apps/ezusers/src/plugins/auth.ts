import fp from "fastify-plugin";

// Firebase-backed API key authentication with short TTL caching.
export default fp(async (app) => {
  const PEPPER = (app as any).apikeyPepper as string;

  app.addHook("preHandler", async (req: any, _rep) => {
    // Allow unauthenticated health checks so uptime probes don't require auth.
    if (
      req.routeOptions.url === "/v1/otp/healthz" ||
      req.routeOptions.url === "/v1/ote/healthz" ||
      req.routeOptions.url === "/v1/apikeys/healthz" ||
      req.routeOptions.url === "/healthz"
    ) {
      return;
    }

    const apiKey = req.headers ? (req.headers["eza-api-key"] as string) : null;
    if (apiKey !== null) {
      try {
        const res = await app.introspectApiKey(apiKey);

        if (res === null) {
          const err: any = new Error(`Missing or invalid token ${apiKey}`);
          err.statusCode = 401;
          err.code = "unauthorized";
          throw err;
        }
        req.user_id = res.userId;
        req.key_id = res.keyId;
        req.project_id = res.projectId;
        req.service_info = res.serviceInfo;
        req.stripe_customer_id = res.stripeCustomerId;
        req.apiKeyRules = res.apiKeyRules;
        
        if (!res.serviceInfo.enabled) {
          const err: any = new Error("EzAuth service is not enabled");
          err.statusCode = 403;
          err.code = "forbidden";
          throw err;
        }
        return;
      } catch (e: any) {
        const err: any = new Error(e?.message);
        err.statusCode = 401;
        err.code = "unauthorized";
        throw err;
      }
    }

    // Branch: API key (for user or tenant scoped routes)
    if (!PEPPER) {
      try {
        req.log.error("auth: missing FASTIFY_PUBLIC_APIKEY_PEPPER");
      } catch {}
      const err: any = new Error(
        "Server misconfigured: FASTIFY_PUBLIC_APIKEY_PEPPER not set"
      );
      err.statusCode = 500;
      err.code = "internal_error";
      throw err;
    }

    if (apiKey === null) {
      try {
        req.log.warn("auth: invalid api key");
      } catch {}
      const err: any = new Error("Missing or invalid API key");
      err.statusCode = 401;
      err.code = "unauthorized";
      throw err;
    }
  });
});

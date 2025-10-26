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

    const apiKey = req.headers ? req.headers["eza-api-key"] as string : null;
    if (apiKey !== null) {
      try {
        req.log.info(
          { route: req.routeOptions?.url },
          "auth: using firebase jwt"
        );
      } catch {}
      try {
        const res = await app.introspectApiKey(apiKey);

        if (res === null) {
          const err: any = new Error(`Missing or invalid token ${apiKey}`);
          err.statusCode = 401;
          err.code = "unauthorized";
          throw err;
        }
        req.userId = res.userId;
        try {
          req.log.debug({ userId: res.userId }, "auth: firebase token verified");
        } catch {}
        return;
      } catch (e) {
        try {
          req.log.warn(
            { err: e && (e as any).message },
            "auth: api key verification failed"
          );
        } catch {}
        const err: any = new Error(`Missing or invalid api key ${apiKey}`);
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
      const err: any = new Error("Server misconfigured: FASTIFY_PUBLIC_APIKEY_PEPPER not set");
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

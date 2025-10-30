import fp from "fastify-plugin";

// Firebase-backed API key authentication with short TTL caching.
export default fp(async (app) => {
  app.addHook("preHandler", async (req: any, _rep) => {
    // Allow unauthenticated health checks so uptime probes don't require auth.
    if (req.routeOptions.url === "/api/v1/otp/healthz" 
      || req.routeOptions.url === "/api/v1/ote/healthz" 
      || req.routeOptions.url === "/api/v1/keys/healthz"
      || req.routeOptions.url === "/healthz") {
      return;
    }

    const idToken = req.headers?.["authorization"] as string;

    // Branch: Firebase Auth JWT
    if (idToken) {
      try {
        const res = await app.introspectIdToken(idToken);
        if (!res?.uid) {
          const err: any = new Error("Missing or invalid token");
          err.statusCode = 401;
          err.code = "unauthorized";
          throw err;
        }
        req.userId = res.uid;
        if (res.plan) {
          req.authz = { plan: res.plan, features: res.user?.featureFlags || {} };
          const rpm = res.plan?.limits?.requestsPerMinute;
          if (typeof rpm === "number" && rpm > 0) {
            const rk = `quota:user:${res.uid}:rpm`;
            const count = await app.redis.incr(rk);
            if (count === 1) {
              await app.redis.expire(rk, 60);
            }
            if (count > rpm) {
              const err: any = new Error("Plan request limit exceeded");
              err.statusCode = 429;
              err.code = "rate_limited";
              throw err;
            }
          }
        }
        try { req.log.debug({ uid: res.uid }, "auth: firebase token verified"); } catch {}
        return;
      } catch (e) {
        try { req.log.warn({ err: e && (e as any).message }, "auth: firebase token verification failed"); } catch {}
        const err: any = new Error("Missing or invalid token");
        err.statusCode = 401;
        err.code = "unauthorized";
        throw err;
      }
    }
  });
});
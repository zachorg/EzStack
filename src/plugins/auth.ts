import fp from "fastify-plugin";
import { hashApiKey } from "../utils/crypto.js";

// Firebase-backed API key authentication with short TTL caching.
export default fp(async (app) => {
  // Simple in-memory cache
  const memCache = new Map<string, { value: any; expiresAt: number }>();
  const MEM_TTL_MS = Number(process.env.APIKEY_CACHE_TTL_MS || 30_000);
  const REDIS_TTL_SEC = Number(process.env.APIKEY_REDIS_TTL_SEC || 60);
  const PEPPER = (app as any).apikeyPepper as string;

  app.addHook("preHandler", async (req: any, _rep) => {
    // Allow unauthenticated health checks
    if (req.routeOptions.url === "/v1/otp/healthz" || req.routeOptions.url === "/v1/ote/healthz") {
      return;
    }


    // Allow disabling auth entirely (tests/dev only)
    if (process.env.AUTH_DISABLE === "true") {
      return;
    }

    const apiKey = req.headers?.["x-ezauth-key"];
    const authzHeader = req.headers?.["authorization"] as undefined | string;
    const bearer = typeof authzHeader === "string" && authzHeader.toLowerCase().startsWith("bearer ")
      ? authzHeader.slice(7).trim()
      : undefined;
    const idToken = (req.headers?.["x-firebase-token"] as undefined | string) || bearer;

    if (typeof apiKey !== "string" && typeof idToken !== "string") {
      const err: any = new Error("Missing credentials: provide x-ezauth-key or x-firebase-token");
      err.statusCode = 401;
      err.code = "unauthorized";
      throw err;
    }

    // Branch: Firebase Auth ID token
    if (typeof idToken === "string") {
      try {
        const res = await (app as any).introspectIdToken(idToken);
        if (!res?.uid) {
          const err: any = new Error("Missing or invalid Firebase token");
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
        return;
      } catch (e) {
        const err: any = new Error("Missing or invalid Firebase token");
        err.statusCode = 401;
        err.code = "unauthorized";
        throw err;
      }
    }

    // Branch: API key
    if (!PEPPER) {
      const err: any = new Error("Server misconfigured: APIKEY_PEPPER not set");
      err.statusCode = 500;
      err.code = "internal_error";
      throw err;
    }

    if (typeof apiKey !== "string" || apiKey.length < 10) {
      const err: any = new Error("Missing or invalid API key");
      err.statusCode = 401;
      err.code = "unauthorized";
      throw err;
    }

    const hash = hashApiKey(apiKey, PEPPER);
    const redis = app.redis;

    // Check in-memory cache
    const now = Date.now();
    const hit = memCache.get(hash);
    if (hit && hit.expiresAt > now) {
      const { tenant, key, plan } = hit.value;
      if (!key || key.status !== "active") {
        const err: any = new Error("Missing or invalid API key");
        err.statusCode = 401;
        err.code = "unauthorized";
        throw err;
      }
      if (!tenant || (tenant.status && tenant.status !== "active")) {
        const err: any = new Error("Tenant suspended");
        err.statusCode = 403;
        err.code = "forbidden";
        throw err;
      }
      req.tenantId = tenant.tenantId;
      req.authz = { plan, features: tenant.featureFlags || {} };
      return;
    }

    // Check Redis cache
    const cacheKey = `apikey:introspect:${hash}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      memCache.set(hash, { value: parsed, expiresAt: now + MEM_TTL_MS });
      const { tenant, key, plan } = parsed;
      if (!key || key.status !== "active") {
        const err: any = new Error("Missing or invalid API key");
        err.statusCode = 401;
        err.code = "unauthorized";
        throw err;
      }
      if (!tenant || (tenant.status && tenant.status !== "active")) {
        const err: any = new Error("Tenant suspended");
        err.statusCode = 403;
        err.code = "forbidden";
        throw err;
      }
      req.tenantId = tenant.tenantId;
      req.authz = { plan, features: tenant.featureFlags || {} };
      return;
    }

    // Query Firestore
    try {
      const result = await (app as any).introspectApiKey(hash);
      // Cache both in Redis and memory (short TTLs)
      await redis.set(cacheKey, JSON.stringify(result), "EX", REDIS_TTL_SEC);
      memCache.set(hash, { value: result, expiresAt: now + MEM_TTL_MS });

      const { tenant, key, plan } = result as any;
      if (!key || key.status !== "active") {
        const err: any = new Error("Missing or invalid API key");
        err.statusCode = 401;
        err.code = "unauthorized";
        throw err;
      }
      if (!tenant || (tenant.status && tenant.status !== "active")) {
        const err: any = new Error("Tenant suspended");
        err.statusCode = 403;
        err.code = "forbidden";
        throw err;
      }
      req.tenantId = tenant.tenantId;
      req.authz = { plan, features: tenant.featureFlags || {} };

      // Quota enforcement (requests per minute) if plan limit provided
      const rpm = plan?.limits?.requestsPerMinute;
      if (typeof rpm === "number" && rpm > 0) {
        const rk = `quota:tenant:${tenant.tenantId}:rpm`;
        const count = await redis.incr(rk);
        if (count === 1) {
          await redis.expire(rk, 60);
        }
        if (count > rpm) {
          const err: any = new Error("Plan request limit exceeded");
          err.statusCode = 429;
          err.code = "rate_limited";
          throw err;
        }
      }
    } catch (e: any) {
      const failSafe = process.env.AUTH_FAIL_SAFE === "true";
      if (failSafe && cached) {
        // If Firestore fails but we had some cache earlier, allow
        const parsed = JSON.parse(cached);
        req.tenantId = parsed.tenant?.tenantId;
        req.authz = { plan: parsed.plan, features: parsed.tenant?.featureFlags || {} };
        return;
      }
      // Log the underlying error for diagnostics
      try {
        (app as any).log.error({ err: e }, "API key introspection failed");
      } catch {}
      // If the error already has a statusCode of 401/403, rethrow as-is
      if (e && (e.statusCode === 401 || e.statusCode === 403)) {
        throw e;
      }
      const err: any = new Error("Authentication service unavailable");
      err.statusCode = 503;
      err.code = "auth_unavailable";
      throw err;
    }
  });
});
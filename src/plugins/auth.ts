import fp from "fastify-plugin";

// Simple API key authentication. Exempts the health check route.
export default fp(async (app) => {
  app.addHook("preHandler", async (req, rep) => {
    // Allow disabling auth in local/dev or when no API key configured
    if (process.env.AUTH_DISABLE === "true" || !process.env.EZAUTH_API_KEY) {
      return;
    }
    // Allow unauthenticated health check
    if (req.routeOptions.url === "/v1/otp/healthz" || req.routeOptions.url === "/v1/ote/healthz") {
      return;
    }

    // Expect a shared secret in x-ezauth-key header; accept master key in dev
    const k = req.headers["x-ezauth-key"];
    const master = process.env.EZAUTH_MASTER_KEY;
    const valid = (typeof k === "string") && (k === process.env.EZAUTH_API_KEY || (master && k === master));

    if (!valid) {
      const err: any = new Error("Missing or invalid API key");
      err.statusCode = 401;
      err.code = "unauthorized";
      throw err;
    }
  });
});
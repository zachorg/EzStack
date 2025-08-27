import fp from "fastify-plugin";

// Simple API key authentication. Exempts the health check route.
export default fp(async (app) => {
  app.addHook("preHandler", async (req, rep) => {
    // Allow unauthenticated health check
    if (req.routeOptions.url === "/v1/otp/healthz") {
      return;
    }

    // Expect a shared secret in x-ezauth-key header
    const k = req.headers["x-ezauth-key"];
    
    if (!k || k !== process.env.EZAUTH_API_KEY) {
      const err: any = new Error("Missing or invalid API key");
      err.statusCode = 401;
      err.code = "unauthorized";
      throw err;
    }
  });
});
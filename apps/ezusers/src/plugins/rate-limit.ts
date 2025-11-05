import fp from "fastify-plugin";
import "@fastify/rate-limit";

export default fp(async (app) => {
  const RATE_ROUTE_MAX = Number(process.env.RATE_ROUTE_MAX || 30);

  app.decorate(
    "rlPerRoute", 
    (max?: number) => {
      // Returns a per-route rate limit preHandler that respects per-tenant overrides
      // from tenant settings. This keeps burst limits consistent across tenants.
      return app.rateLimit({
        timeWindow: "1 minute",
        max: async (req: any) => {
          const tenantId = req.tenantId as string | undefined;
          const ts = await app.getTenantSettings?.(tenantId);
          const perTenantMax = ts?.routePerMinute ?? RATE_ROUTE_MAX;
          return max ?? perTenantMax;
        }
      });
    }
  );
  app.log.info({ defaultMaxPerMinute: RATE_ROUTE_MAX }, "Rate limit plugin initialized");
});




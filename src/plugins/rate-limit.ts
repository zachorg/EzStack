import fp from "fastify-plugin";
import "@fastify/rate-limit";

// Adds helper to apply per-route rate limiting with a default max per minute.
export default fp(async (app) => {
  const RATE_ROUTE_MAX = Number(process.env.RATE_ROUTE_MAX || 30);

  app.decorate(
    "rlPerRoute", 
    (max?: number) => {
      return (app as any).rateLimit({
        timeWindow: "1 minute",
        max: async (req: any) => {
          const tenantId = (req.body && (req.body as any).tenantId) || (req.headers && (req.headers as any)["x-tenant-id"]) || undefined;
          const ts = await (app as any).getTenantSettings?.(tenantId);
          const perTenantMax = ts?.routePerMinute ?? RATE_ROUTE_MAX;
          return max ?? perTenantMax;
        }
      });
    }
  );
});
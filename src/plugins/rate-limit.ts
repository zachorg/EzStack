import fp from "fastify-plugin";
import "@fastify/rate-limit";

export default fp(async (app) => {
  const RATE_ROUTE_MAX = Number(process.env.RATE_ROUTE_MAX || 30);
  app.decorate("rlPerRoute", (max?: number) => 
    app.rateLimit({ max: max ?? RATE_ROUTE_MAX, timeWindow: "1 minute" }));
});
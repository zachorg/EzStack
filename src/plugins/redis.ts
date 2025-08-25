import fp from "fastify-plugin";
import Redis from "ioredis";

// Creates a shared Redis client and decorates the app with it.
export default fp(async (app) => {
  const redis = new Redis(process.env.REDIS_URL!);
  app.decorate("redis", redis);
});
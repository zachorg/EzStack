import fp from "fastify-plugin";
import Redis from "ioredis";

// Creates a shared Redis client and decorates the app with it.
export default fp(async (app) => {
  // Create Redis client using connection URL from env
  const redis = new Redis(
    process.env.REDIS_URL!
  );

  // Decorate fastify app with Redis client
  app.decorate(
    "redis",
    redis
  );
});
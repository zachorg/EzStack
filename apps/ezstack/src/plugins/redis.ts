import fp from "fastify-plugin";
import Redis from "ioredis";

// Creates a shared Redis client and decorates the app with it.
export default fp(async (app) => {
  // Create Redis client using connection URL from env. This will throw if unset.
  const redis = new Redis(
    process.env.REDIS_URL!
  );

  // Basic connection visibility
  redis.on("connect", () => {
    try { app.log.info("redis: connecting"); } catch {}
  });
  redis.on("ready", () => {
    try { app.log.info("redis: ready"); } catch {}
  });
  redis.on("error", (err) => {
    try { app.log.error({ err: err && err.message }, "redis: error"); } catch {}
  });
  redis.on("end", () => {
    try { app.log.warn("redis: connection closed"); } catch {}
  });

  // Decorate fastify app with Redis client
  app.decorate(
    "redis",
    redis
  );
});
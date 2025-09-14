import fp from "fastify-plugin";
import Redis from "ioredis";

export default fp(async (app) => {
  // Initialize Redis client from REDIS_URL. The Fastify logger will redact sensitive fields.
  const redis = new Redis(
    process.env.REDIS_URL!
  );

  // Basic connection lifecycle logs for operability.
  redis.on("connect", () => app.log.info("Redis connecting"));
  redis.on("ready", () => app.log.info("Redis connected and ready"));
  redis.on("error", (err) => app.log.error({ err }, "Redis error"));
  redis.on("end", () => app.log.warn("Redis connection closed"));

  app.decorate(
    "redis",
    redis
  );

  // Verify connectivity early so startup failures are visible.
  try {
    const pong = await redis.ping();
    if (pong === "PONG") {
      app.log.info("Redis ping OK");
    } else {
      app.log.warn({ pong }, "Redis ping unexpected response");
    }
  } catch (err) {
    app.log.error({ err }, "Redis ping failed");
  }

  // Ensure we cleanly quit on server close.
  app.addHook("onClose", async () => {
    try { await redis.quit(); } catch {}
  });
});



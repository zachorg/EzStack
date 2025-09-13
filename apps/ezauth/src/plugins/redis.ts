import fp from "fastify-plugin";
import Redis from "ioredis";

export default fp(async (app) => {
  const redis = new Redis(
    process.env.REDIS_URL!
  );
  app.decorate(
    "redis",
    redis
  );
});



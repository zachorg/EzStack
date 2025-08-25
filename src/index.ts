import Fastify from "fastify";
import fastifyRateLimit from "@fastify/rate-limit";
import auth from "./plugins/auth.js";
import redis from "./plugins/redis.js";
import sqs from "./plugins/sqs.js";
import rl from "./plugins/rate-limit.js";

const app = Fastify({ logger: { level: "info" } });

await app.register(redis);                          // required
await app.register(fastifyRateLimit, { global: false });
await app.register(rl);
await app.register(auth);
if (process.env.AWS_SQS_ENDPOINT || process.env.AWS_ACCESS_KEY_ID) {
  await app.register(sqs);                          // optional for MVP
}

// mount one file that owns all OTP endpoints
await app.register(import("./routes/otp.js"), { prefix: "/otp" });

await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT || 8080) });

import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import auth from "./plugins/auth.js";
import redis from "./plugins/redis.js";
import rl from "./plugins/rate-limit.js";
import errors from "./plugins/errors.js";
import tenantSettings from "./plugins/tenant-settings.js";
import secrets from "./plugins/secrets.js";
import firebase from "./plugins/firebase.js";
import email from "./plugins/email.js";
import apikeyRoutes from "./routes/apikeys.js";

const app = Fastify({
  logger: {
    level: "info",
    redact: {
      paths: ["destination", "body.destination", "req.body.destination"],
      censor: "[REDACTED]"
    }
  }
});

await app.register(fastifyCors, {
  origin: process.env.CORS_ORIGIN === "true" ? true : (process.env.CORS_ORIGIN || false),
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
});

await app.register(redis);
await app.register(errors);
await app.register(tenantSettings);
await app.register(secrets);
await app.register(firebase);
await app.register(email);
await app.register(fastifyRateLimit, { global: false });
await app.register(rl);
await app.register(auth);

await app.register(apikeyRoutes, { prefix: "/v1/apikeys" });

await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT || 8080) });



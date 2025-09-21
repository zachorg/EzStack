import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import auth from "./plugins/auth.js";
import redis from "./plugins/redis.js";
import rl from "./plugins/rate-limit.js";
import errors from "./plugins/errors.js";
import tenantSettings from "./plugins/tenant-settings.js";
import secrets from "./plugins/secrets.js";
import supabase from "./plugins/supabase.js";
import apikeyRoutes from "./routes/apikeys.js";

// Fastify app with structured logging enabled. We redact sensitive fields by
// default to avoid leaking destinations/PII in application logs.
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

// Core platform plugins. Registration order matters for dependencies:
// - redis before anything that relies on app.redis
// - errors early to ensure consistent error shaping
await app.register(redis);
await app.register(errors);
await app.register(tenantSettings);
await app.register(secrets);
await app.register(supabase);
await app.register(fastifyRateLimit, { global: false });
await app.register(rl);
await app.register(auth);

// Business routes
await app.register(apikeyRoutes, { prefix: "/v1/apikeys" });

// Startup log to aid operational visibility
app.log.info({
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 8080),
  cors: process.env.CORS_ORIGIN || false
}, "Starting EzStack API server");

await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT || 8080) });



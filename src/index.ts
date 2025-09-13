import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import auth from "./plugins/auth.js";
import redis from "./plugins/redis.js";
import sqs from "./plugins/sqs.js";
import rl from "./plugins/rate-limit.js";
import errors from "./plugins/errors.js";
import tenantSettings from "./plugins/tenant-settings.js";
import secrets from "./plugins/secrets.js";
import firebase from "./plugins/firebase.js";
import email from "./plugins/email.js";
import apikeyRoutes from "./routes/apikeys.js";
import otpRoutes from "./routes/otp.js";
import oteRoutes from "./routes/ote.js";

// Create Fastify app with info-level logging and redaction for sensitive fields
const app = Fastify({
  logger: {
    level: "info",
    // Redact potentially sensitive destination values from all logs
    redact: {
      paths: [
        "destination",           // top-level fields in our own logs
        "body.destination",      // explicit body shape
        "req.body.destination"   // Fastify request logs if enabled
      ],
      censor: "[REDACTED]"
    }
  }
});

// CORS for frontend origins
await app.register(fastifyCors, {
  origin: process.env.CORS_ORIGIN === "true" ? true : (process.env.CORS_ORIGIN || false),
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
});

// Used for OTP storage, rate limiting, and idempotency
await app.register(redis);
// Global error/404 handler (must be registered before routes)
await app.register(errors);
// Tenant settings loader backed by Redis with small in-memory cache
await app.register(tenantSettings);
// Secrets (APIKEY_PEPPER from Google Secret Manager or env fallback)
await app.register(secrets);
// Firebase Admin (Firestore access)
await app.register(firebase);
// Email plugin (SES-backed)
await app.register(email);
// Install @fastify/rate-limit in non-global mode; we'll apply per-route
await app.register(fastifyRateLimit, { global: false });
// Decorates app with helper `rlPerRoute(max?)` to apply per-route limits
await app.register(rl);
// Simple API key auth for all routes except health check
await app.register(auth);
// SQS client is optional; enable explicitly via SQS_ENABLE or by providing an endpoint unless disabled
const SQS_ENABLE = process.env.SQS_ENABLE;
if (SQS_ENABLE === "true" || (process.env.AWS_SQS_ENDPOINT && SQS_ENABLE !== "false")) {
  await app.register(sqs);
}

// Mount the OTP route module under /v1/otp
await app.register(otpRoutes, { prefix: "/v1/otp" });
// Mount the OTE route module under /v1/ote
await app.register(oteRoutes, { prefix: "/v1/ote" });
// API key management routes (healthz + create/list/revoke)
await app.register(apikeyRoutes, { prefix: "/v1/apikeys" });

// Start the HTTP server
await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT || 8080) });

import Fastify from "fastify";
import fastifyRateLimit from "@fastify/rate-limit";
import auth from "./plugins/auth.js";
import redis from "./plugins/redis.js";
import sqs from "./plugins/sqs.js";
import rl from "./plugins/rate-limit.js";
import errors from "./plugins/errors.js";
import tenantSettings from "./plugins/tenant-settings.js";

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

// Used for OTP storage, rate limiting, and idempotency
await app.register(redis);
// Global error/404 handler (must be registered before routes)
await app.register(errors);
// Tenant settings loader backed by Redis with small in-memory cache
await app.register(tenantSettings);
// Install @fastify/rate-limit in non-global mode; we'll apply per-route
await app.register(fastifyRateLimit, { global: false });
// Decorates app with helper `rlPerRoute(max?)` to apply per-route limits
await app.register(rl);
// Simple API key auth for all routes except health check
await app.register(auth);
// SQS client is optional; if not configured, OTPs are only logged
if (process.env.AWS_SQS_ENDPOINT || process.env.AWS_ACCESS_KEY_ID) {
  await app.register(sqs);
}

// Mount the OTP route module under /v1/otp
await app.register(import("./routes/otp.js"), { prefix: "/v1/otp" });

// Start the HTTP server
await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT || 8080) });

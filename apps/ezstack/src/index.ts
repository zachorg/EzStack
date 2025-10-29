import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import auth from "./plugins/auth.js";
import redis from "./plugins/redis.js";
import rl from "./plugins/rate-limit.js";
import errors from "./plugins/errors.js";
import tenantSettings from "./plugins/tenant-settings.js";
import firebase from "./plugins/firebase.js";
import stripe from "./plugins/stripe.js";
import apikeyRoutes from "./routes/apikeys.js";
import userProfileRoutes from "./routes/userProfile.js";
import userProjectsRoutes from "./routes/userProjects.js";
import analyticsRoutes from "./routes/analytics.js";
import userServicesRoutes from "./routes/userServices.js";
import userBillingRoutes from "./routes/userBilling.js";

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
  origin: true, // Accept any origin
  credentials: true, // Allow credentials
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "project_name"],
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
});

// Core platform plugins. Registration order matters for dependencies:
// - redis before anything that relies on app.redis
// - errors early to ensure consistent error shaping
await app.register(redis);
await app.register(errors);
await app.register(tenantSettings);
await app.register(firebase);
await app.register(fastifyRateLimit, { global: false });
await app.register(rl);
await app.register(auth);
await app.register(stripe);

// Business routes
await app.register(apikeyRoutes, { prefix: "/api/v1/keys" });
await app.register(userProfileRoutes, { prefix: "/api/v1/userProfile" });
await app.register(userProjectsRoutes, { prefix: "/api/v1/userProjects" });
await app.register(analyticsRoutes, { prefix: "/api/v1/analytics" });
await app.register(userServicesRoutes, { prefix: "/api/v1/userProjects/services" });
await app.register(userBillingRoutes, { prefix: "/api/v1/user/billing" });

app.apikeyPepper = (process.env.FASTIFY_PUBLIC_APIKEY_PEPPER || "").trim();
if (!app.apikeyPepper) {
  throw new Error("API key pepper not configured. Set FASTIFY_PUBLIC_APIKEY_PEPPER to a secret ID, a GSM resource (projects/.../secrets/...), or a dev literal.");
}

// Startup log to aid operational visibility
app.log.info({
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT_EZSTACK || 8080),
  cors: process.env.CORS_ORIGIN || false
}, "Starting EzStack API server");

await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT || 8080) });



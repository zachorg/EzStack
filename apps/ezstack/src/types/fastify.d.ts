import "fastify";
import type { preHandlerHookHandler } from "fastify";
import type Redis from "ioredis";

declare module "fastify" {
  interface FastifyInstance {
    // Apply per-route rate limiting; default resolved from tenant settings
    rlPerRoute: (max?: number) => preHandlerHookHandler;
    redis: Redis;
    // Tenant-configurable operational limits
    getTenantSettings: (tenantId?: string) => Promise<{
      otpLength: number;
      resendCooldownSec: number;
      destPerMinute: number;
      routePerMinute: number;
      otpMaxAttempts: number;
      oteLength: number;
      oteMaxAttempts: number;
    }>;
    firebase: {
      auth: import("firebase-admin/auth").Auth;
      db: import("firebase-admin/firestore").Firestore;
      app: import("firebase-admin/app").App;
    };
    apikeyPepper: string;
    // Look up an API key hash and assemble tenant and plan context
    introspectApiKey: (hash: string) => Promise<{
      key?: { keyId: string; tenantId: string; status: string; createdAt?: string | number };
      tenant?: { tenantId: string; name?: string; status?: string; planId?: string; featureFlags?: Record<string, boolean> };
      plan?: { planId: string; name?: string; limits?: Record<string, number>; features?: Record<string, boolean> };
    }>;
    // Verify Firebase ID token and enrich with optional user/plan
    introspectIdToken: (idToken: string) => Promise<{
      uid?: string;
      email?: string;
      emailVerified?: boolean;
      user?: { uid: string; status?: string; planId?: string; featureFlags?: Record<string, boolean> };
      plan?: { planId: string; name?: string; limits?: Record<string, number>; features?: Record<string, boolean> };
    }>;
    // Convenience helpers for tenant metadata and role checks
    getTenant: (tenantId: string) => Promise<{ tenantId: string; name?: string; status?: string; planId?: string; featureFlags?: Record<string, boolean> } | undefined>;
    hasTenantRole: (
      userId: string | undefined,
      tenantId: string | undefined,
      rolesAllowed?: Array<"owner" | "admin" | "dev" | "viewer">
    ) => Promise<boolean>;
  }
  interface FastifyRequest {
    tenantId?: string;
    userId?: string;
    authz?: {
      plan?: { planId: string; name?: string; limits?: Record<string, number>; features?: Record<string, boolean> };
      features?: Record<string, boolean>;
    };
  }
}



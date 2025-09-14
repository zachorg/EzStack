import "fastify";
import type { preHandlerHookHandler } from "fastify";
import type Redis from "ioredis";
import type { SQSClient } from "@aws-sdk/client-sqs";

declare module "fastify" {
  interface FastifyInstance {
    rlPerRoute: (max?: number) => preHandlerHookHandler;
    redis: Redis;
    getTenantSettings: (tenantId?: string) => Promise<{
      otpLength: number;
      resendCooldownSec: number;
      destPerMinute: number;
      routePerMinute: number;
      otpMaxAttempts: number;
      oteLength: number;
      oteMaxAttempts: number;
    }>;
    sqs?: SQSClient;
    sqsQueueName?: string;
    sendEmail: (args: { to: string; from?: string; subject: string; text?: string; html?: string }) => Promise<void>;
    supabase: import("@supabase/supabase-js").SupabaseClient<any, "public", any>;
    apikeyPepper: string;
    introspectApiKey: (hash: string) => Promise<{
      key?: { keyId: string; tenantId: string; status: string; createdAt?: string | number };
      tenant?: { tenantId: string; name?: string; status?: string; planId?: string; featureFlags?: Record<string, boolean> };
      plan?: { planId: string; name?: string; limits?: Record<string, number>; features?: Record<string, boolean> };
    }>;
    introspectIdToken: (idToken: string) => Promise<{
      uid?: string;
      email?: string;
      emailVerified?: boolean;
      user?: { uid: string; status?: string; planId?: string; featureFlags?: Record<string, boolean> };
      plan?: { planId: string; name?: string; limits?: Record<string, number>; features?: Record<string, boolean> };
    }>;
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



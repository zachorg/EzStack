import "fastify";
import type { preHandlerHookHandler } from "fastify";
import type Redis from "ioredis";
import type { SQSClient } from "@aws-sdk/client-sqs";

declare module "fastify" {
  interface FastifyInstance {
    // Helper added by rate-limit plugin to apply per-route limits
    rlPerRoute: (max?: number) => preHandlerHookHandler;
    // Redis client provided by redis plugin
    redis: Redis;
    // Tenant settings resolver provided by tenant-settings plugin
    getTenantSettings: (tenantId?: string) => Promise<{
      otpLength: number;
      resendCooldownSec: number;
      destPerMinute: number;
      routePerMinute: number;
      otpMaxAttempts: number;
      oteLength: number;
      oteMaxAttempts: number;
    }>;
    // Optional SQS client and queue name when SQS is configured
    sqs?: SQSClient;
    sqsQueueName?: string;
    // Email sender helper (SES-backed)
    sendEmail: (args: { to: string; from?: string; subject: string; text?: string; html?: string }) => Promise<void>;
    // Firebase Firestore
    firestore: import("firebase-admin/firestore").Firestore;
    // API key introspection helper backed by Firestore
    introspectApiKey: (hash: string) => Promise<{
      key?: { keyId: string; tenantId: string; status: string; createdAt?: string | number };
      tenant?: { tenantId: string; name?: string; status?: string; planId?: string; featureFlags?: Record<string, boolean> };
      plan?: { planId: string; name?: string; limits?: Record<string, number>; features?: Record<string, boolean> };
    }>;
  }
  interface FastifyRequest {
    tenantId?: string;
    authz?: {
      plan?: { planId: string; name?: string; limits?: Record<string, number>; features?: Record<string, boolean> };
      features?: Record<string, boolean>;
    };
  }
}
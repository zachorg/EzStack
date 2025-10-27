import "fastify";
import type { preHandlerHookHandler } from "fastify";
import type Redis from "ioredis";
import type { SQSClient } from "@aws-sdk/client-sqs";
import { Firestore } from "firebase/firestore";

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
    sqsService?: {
      isReady(): boolean;
      getStatus(): { configured: boolean; region?: string; queueName?: string; hasCredentials: boolean; endpoint?: string };
      testConnection(): Promise<{ success: boolean; error?: string }>;
    };
    sendEmail: (args: { to: string; from?: string; subject: string; text?: string; html?: string }) => Promise<void>;
    firebase: {
      auth: import("firebase-admin/auth").Auth;
      db: import("firebase-admin/firestore").Firestore;
      firestore: Firestore;
      app: import("firebase-admin/app").App;
    };
    apikeyPepper: string;
    introspectApiKey: (apiKey: string) => Promise<{
      keyId: string;
      userId: string;
      projectId: string;
    } | null>;
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



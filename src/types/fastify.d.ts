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
    }>;
    // Optional SQS client and queue name when SQS is configured
    sqs?: SQSClient;
    sqsQueueName?: string;
  }
}
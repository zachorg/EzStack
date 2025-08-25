import "fastify";
import type { preHandlerHookHandler } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    // Helper added by rate-limit plugin to apply per-route limits
    rlPerRoute: (max?: number) => preHandlerHookHandler;
  }
}
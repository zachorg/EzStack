import "fastify";
import type { preHandlerHookHandler } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    rlPerRoute: (max?: number) => preHandlerHookHandler;
  }
}
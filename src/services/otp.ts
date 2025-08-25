import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import type Redis from "ioredis";
import { SendMessageCommand, GetQueueUrlCommand } from "@aws-sdk/client-sqs";
import { destHash, randomOtp, hashOtp } from "../utils/crypto.js";

const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS || 300);
const OTP_LENGTH = Number(process.env.OTP_LENGTH || 6);
const DEST_PER_MINUTE = Number(process.env.DEST_PER_MINUTE || 5);
const RESEND_COOLDOWN_SEC = Number(process.env.RESEND_COOLDOWN_SEC || 30);

const kOtp    = (t: string, id: string) => `otp:${t}:${id}`;
const kIdem   = (t: string, k: string) => `idem:${t}:${k}`;
const kRate   = (dh: string)           => `rate:dest:${dh}`;
const kResend = (id: string)           => `resend:${id}`;

async function queueUrl(app: FastifyInstance) {
  const sqs = (app as any).sqs as import("@aws-sdk/client-sqs").SQSClient | undefined;
  if (!sqs) return undefined;
  const name = (app as any).sqsQueueName as string;
  const res = await sqs.send(new GetQueueUrlCommand({ QueueName: name }));
  return res.QueueUrl!;
}

export async function send(app: FastifyInstance, body: any) {
  const { tenantId, destination, channel, idempotencyKey, contextId } = body;
  const redis = (app as any).redis as Redis;
  if (idempotencyKey) {
    const i = await redis.get(kIdem(tenantId, idempotencyKey));
    if (i) return i;
  }

  const dh = destHash(destination);
  const rc = await redis.incr(kRate(dh));
  if (rc === 1) await redis.expire(kRate(dh), 60);
  if (rc > DEST_PER_MINUTE) { const e: any = new Error("destination rate limit"); e.statusCode = 429; throw e; }

  const requestId = randomUUID();
  const otp  = randomOtp(OTP_LENGTH);
  const salt = randomUUID().replace(/-/g, "");
  const blob = { hash: hashOtp(otp, salt), salt, dest_hash: dh, attempts: 0, channel, destination, tenantId };

  // Prefer SET with EX (SETEX is deprecated in Redis docs) :contentReference[oaicite:5]{index=5}
  await redis.set(kOtp(tenantId, requestId), JSON.stringify(blob), "EX", OTP_TTL_SECONDS);
  if (idempotencyKey) await redis.set(kIdem(tenantId, idempotencyKey), requestId, "EX", OTP_TTL_SECONDS);

  const url = await queueUrl(app);
  if (url) {
    const sqs = (app as any).sqs as import("@aws-sdk/client-sqs").SQSClient;
    await sqs.send(new SendMessageCommand({ QueueUrl: url, MessageBody: JSON.stringify({ type: "otp.send", requestId, tenantId, destination, channel, contextId, otp }) }));
  } else {
    app.log.warn({ requestId, destination }, "SQS not configured; OTP will only be visible in logs");
  }
  app.log.info({ requestId, otp, destination }, "OTP generated");
  return requestId;
}

export async function verify(app: FastifyInstance, body: any) {
  const { tenantId, requestId, code } = body;
  const redis = (app as any).redis as Redis;
  const key = kOtp(tenantId, requestId);
  const raw = await redis.get(key);
  if (!raw) return false;
  const data = JSON.parse(raw);
  data.attempts = (data.attempts || 0) + 1;
  if (data.attempts > 5) { await redis.del(key); return false; }
  const ok = hashOtp(code, data.salt) === data.hash;
  if (!ok) { await redis.set(key, JSON.stringify(data), "EX", OTP_TTL_SECONDS); return false; }
  await redis.del(key);
  return true;
}

export async function resend(app: FastifyInstance, body: any) {
  const { tenantId, requestId } = body;
  const redis = (app as any).redis as Redis;
  const key = kOtp(tenantId, requestId);
  const raw = await redis.get(key);
  if (!raw) return { ok: false, code: "not_found" };

  const can = await redis.set(kResend(requestId), "1", "EX", RESEND_COOLDOWN_SEC, "NX");
  if (!can) return { ok: false, code: "cooldown" };

  const data = JSON.parse(raw);
  const otp  = randomOtp(OTP_LENGTH);
  const salt = randomUUID().replace(/-/g, "");
  data.salt = salt; data.hash = hashOtp(otp, salt);
  await redis.set(key, JSON.stringify(data), "EX", OTP_TTL_SECONDS);

  const url = await queueUrl(app);
  if (url) {
    const sqs = (app as any).sqs as import("@aws-sdk/client-sqs").SQSClient;
    await sqs.send(new SendMessageCommand({ QueueUrl: url, MessageBody: JSON.stringify({ type: "otp.resend", requestId, tenantId, destination: data.destination, channel: data.channel, otp }) }));
  }
  app.log.info({ requestId, otp }, "OTP resent");
  return { ok: true };
}
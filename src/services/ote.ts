import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import type Redis from "ioredis";
import { destHash, randomOtp, hashOtp } from "../utils/crypto.js";

const OTE_TTL_SECONDS = Number(process.env.OTE_TTL_SECONDS || process.env.OTP_TTL_SECONDS || 300);

const kOte    = (t: string, id: string) => `ote:${t}:${id}`;
const kIdem   = (t: string, k: string)  => `idem:${t}:${k}`;
const kRate   = (h: string)             => `rate:${h}`;
const kResend = (id: string)            => `resend:${id}`;

export async function send(app: FastifyInstance, body: any) {
  const { tenantId, email, idempotencyKey, contextId } = body;
  const log = app.log.child({ tenantId, contextId });
  const redis = (app as any).redis as Redis;
  const ts = await (app as any).getTenantSettings?.(tenantId);
  const OTE_LENGTH = (ts?.oteLength ?? ts?.otpLength ?? Number(process.env.OTE_LENGTH || process.env.OTP_LENGTH || 6));
  const DEST_PER_MINUTE = ts?.destPerMinute ?? Number(process.env.DEST_PER_MINUTE || 5);

  // Idempotency: return existing requestId for the same idempotencyKey
  if (idempotencyKey) {
    const i = await redis.get(kIdem(tenantId, idempotencyKey));
    if (i) {
      return i;
    }
  }

  // Destination-level rate limiting (per minute)
  const normalized = (email as string).trim().toLowerCase();
  const dh = destHash(normalized);
  const rc = await redis.incr(kRate(dh));

  if (rc === 1) {
    await redis.expire(kRate(dh), 60);
  }

  if (rc > DEST_PER_MINUTE) {
    const e: any = new Error("Destination rate limit exceeded");
    e.statusCode = 429;
    e.code = "rate_limited";
    throw e;
  }

  // Generate request and OTE, store hashed code with TTL
  const requestId = randomUUID();
  const code = randomOtp(OTE_LENGTH);
  const salt = randomUUID().replace(/-/g, "");
  const blob = {
    hash: hashOtp(code, salt),
    salt,
    dest_hash: dh,
    attempts: 0,
    channel: "email",
    destination: normalized,
    tenantId
  };

  await redis.set(kOte(tenantId, requestId), JSON.stringify(blob), "EX", OTE_TTL_SECONDS);

  if (idempotencyKey) {
    await redis.set(kIdem(tenantId, idempotencyKey), requestId, "EX", OTE_TTL_SECONDS);
  }

  // Send email via SES plugin
  const subject = `Your verification code`;
  const text = `Your verification code is ${code}. It expires in ${Math.floor(OTE_TTL_SECONDS / 60)} minutes.`;
  const html = `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in ${Math.floor(OTE_TTL_SECONDS / 60)} minutes.</p>`;
  try {
    await (app as any).sendEmail({ to: normalized, subject, text, html });
  } catch (err) {
    // If email send fails, remove the stored request to avoid dangling entries
    await redis.del(kOte(tenantId, requestId));
    throw err;
  }

  log.info({ requestId }, "OTE send: queued");
  return requestId;
}

export async function verify(app: FastifyInstance, body: any) {
  const { tenantId, requestId, code } = body;
  const log = app.log.child({ tenantId });
  const redis = (app as any).redis as Redis;
  const ts = await (app as any).getTenantSettings?.(tenantId);
  const OTE_MAX_ATTEMPTS = ts?.oteMaxAttempts ?? ts?.otpMaxAttempts ?? Number(process.env.OTE_MAX_ATTEMPTS || process.env.OTP_MAX_ATTEMPTS || 5);
  const key = kOte(tenantId, requestId);
  const raw = await redis.get(key);

  if (!raw) {
    log.warn({ requestId }, "OTE verify: request not found");
    return false;
  }

  const data = JSON.parse(raw);

  // Track attempts; invalidate after too many failures
  data.attempts = (data.attempts || 0) + 1;
  if (data.attempts > OTE_MAX_ATTEMPTS) {
    await redis.del(key);
    log.warn({ requestId }, "OTE verify: exceeded max attempts; invalidated");
    return false;
  }

  // Compare hashed code with stored hash
  const ok = hashOtp(code, data.salt) === data.hash;
  if (!ok) {
    await redis.set(key, JSON.stringify(data), "EX", OTE_TTL_SECONDS);
    log.warn({ requestId }, "OTE verify: incorrect code");
    return false;
  }

  await redis.del(key);
  log.info({ requestId }, "OTE verify: success");
  return true;
}

export async function resend(app: FastifyInstance, body: any) {
  const { tenantId, requestId } = body;
  const log = app.log.child({ tenantId });
  const redis = (app as any).redis as Redis;
  const ts = await (app as any).getTenantSettings?.(tenantId);
  const OTE_LENGTH = ts?.oteLength ?? ts?.otpLength ?? Number(process.env.OTE_LENGTH || process.env.OTP_LENGTH || 6);
  const RESEND_COOLDOWN_SEC = ts?.resendCooldownSec ?? Number(process.env.RESEND_COOLDOWN_SEC || 30);
  const key = kOte(tenantId, requestId);
  const raw = await redis.get(key);

  if (!raw) {
    return { ok: false, code: "not_found" };
  }

  // Enforce resend cooldown using NX set
  const can = await redis.set(kResend(requestId), "1", "EX", RESEND_COOLDOWN_SEC, "NX");
  if (!can) {
    return { ok: false, code: "cooldown" };
  }

  // Regenerate code and update stored hash
  const data = JSON.parse(raw);
  const code = randomOtp(OTE_LENGTH);
  const salt = randomUUID().replace(/-/g, "");
  data.salt = salt;
  data.hash = hashOtp(code, salt);

  await redis.set(key, JSON.stringify(data), "EX", OTE_TTL_SECONDS);

  // Send email again
  const subject = `Your verification code`;
  const text = `Your verification code is ${code}. It expires in ${Math.floor(OTE_TTL_SECONDS / 60)} minutes.`;
  const html = `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in ${Math.floor(OTE_TTL_SECONDS / 60)} minutes.</p>`;
  await (app as any).sendEmail({ to: data.destination, subject, text, html });

  log.info({ requestId }, "OTE resent");
  return { ok: true };
}



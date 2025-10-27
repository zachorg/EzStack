import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import type Redis from "ioredis";
import { destHash, randomOtp, hashOtp } from "../utils/crypto.js";

const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS || 300);

const kOtp = (t: string, id: string) => `otp:${t}:${id}`;
// const kIdem   = (t: string, k: string)  => `idem:${t}:${k}`;
const kRate = (dh: string) => `rate:dest:${dh}`;
// const kResend = (id: string)            => `resend:${id}`;

export async function send(app: any, body: any) {
  if (!app.sns) {
    throw new Error("SNS not configured");
  }

  const { destination, channel, userId, contextDescription } = body;
  const log = app.log.child({ userId, contextDescription });
  const redis = app.redis as Redis;

  const OTP_LENGTH = Number(process.env.OTP_LENGTH || 6);
  const DEST_PER_MINUTE = Number(process.env.DEST_PER_MINUTE || 5);

  const dh = destHash(destination);
  const rc = await redis.incr(kRate(dh));

  if (rc === 1) {
    await redis.expire(kRate(dh), 60);
  }

  if (rc > DEST_PER_MINUTE) {
    const e: any = new Error("Destination rate limit exceeded");
    e.statusCode = 429;
    e.code = "rate_limited";
    log.warn(
      { dest_hash: dh, rc, limit: DEST_PER_MINUTE },
      "OTP send: destination rate limited"
    );
    throw e;
  }

  const requestId = randomUUID();
  const otp = randomOtp(OTP_LENGTH);
  const salt = randomUUID().replace(/-/g, "");
  const blob = {
    hash: hashOtp(otp, salt),
    salt,
    dest_hash: dh,
    attempts: 0,
    channel,
    destination,
    userId,
  };

  // Send OTP via SNS
  if (app.sns?.isReady()) {
    try {
      const result = await app.sns.sendOtp(destination, otp);
      if (!result.success) {
        log.error(
          { requestId, destination, error: result.error },
          "Failed to send OTP via SNS"
        );
        throw new Error(`Failed to send OTP via SNS: ${result.error}`);
      } else {
        const redisKey = kOtp(userId, requestId);
        await redis.set(
          redisKey,
          JSON.stringify(blob),
          "EX",
          OTP_TTL_SECONDS
        );
        console.log(`OTP redis key: ${redisKey}`);
        log.info(
          { requestId, messageId: result.messageId },
          "OTP sent via SNS"
        );
      }
    } catch (error) {
      log.error({ requestId, destination, error }, "SNS send error");
      throw new Error(`Failed to send OTP via SNS: ${ error }`);
    }
  } else {
    log.warn(
      { requestId, destination },
      "SNS not configured - OTP generated but not sent"
    );
  }
  return requestId;
}

export async function verify(app: FastifyInstance, body: any) {
  const { userId, requestId, code } = body;
  const redis = app.redis;
  const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
  const key = kOtp(userId, requestId);
  const raw = await redis.get(key);

  if (!raw) {
    console.log(`OTP verify: request not found: `, key);
    return false;
  }

  const data = JSON.parse(raw);

  data.attempts = (data.attempts || 0) + 1;
  if (data.attempts > OTP_MAX_ATTEMPTS) {
    await redis.del(key);
    app.log.warn(
      { requestId },
      "OTP verify: exceeded max attempts; invalidated"
    );
    return false;
  }

  const ok = hashOtp(code, data.salt) === data.hash;
  if (!ok) {
    await redis.set(key, JSON.stringify(data), "EX", OTP_TTL_SECONDS);
    app.log.warn({ requestId }, "OTP verify: incorrect code");
    return false;
  }

  await redis.del(key);
  app.log.info({ requestId }, "OTP verify: success");
  return true;
}

// export async function resend(app: FastifyInstance, body: any) {
//   const { tenantId, requestId } = body;
//   const log = app.log.child({ tenantId });
//   const redis = (app as any).redis as Redis;
//   const ts = await (app as any).getTenantSettings?.(tenantId);
//   const OTP_LENGTH = ts?.otpLength ?? Number(process.env.OTP_LENGTH || 6);
//   const RESEND_COOLDOWN_SEC = ts?.resendCooldownSec ?? Number(process.env.RESEND_COOLDOWN_SEC || 30);
//   const key = kOtp(tenantId, requestId);
//   const raw = await redis.get(key);

//   if (!raw) {
//     return { ok: false, code: "not_found" };
//   }

//   const can = await redis.set(kResend(requestId), "1", "EX", RESEND_COOLDOWN_SEC, "NX");
//   if (!can) {
//     return { ok: false, code: "cooldown" };
//   }

//   const data = JSON.parse(raw);
//   const otp = randomOtp(OTP_LENGTH);
//   const salt = randomUUID().replace(/-/g, "");
//   data.salt = salt;
//   data.hash = hashOtp(otp, salt);

//   await redis.set(key, JSON.stringify(data), "EX", OTP_TTL_SECONDS);

//   // Send OTP via SNS if configured
//   if (app.sns?.isReady()) {
//     try {
//       const result = await app.sns.sendOtp(data.destination, otp);
//       if (!result.success) {
//         log.error({ requestId, destination: data.destination, error: result.error }, "Failed to resend OTP via SNS");
//       } else {
//         log.info({ requestId, messageId: result.messageId }, "OTP resent via SNS");
//       }
//     } catch (error) {
//       log.error({ requestId, destination: data.destination, error }, "SNS resend error");
//     }
//   }

//   const shouldLogCode = process.env.LOG_CODES === "true" || String(process.env.OTP_DRY_RUN || "").toLowerCase() === "true";
//   if (shouldLogCode) {
//     log.info({ requestId, otp }, "OTP resent");
//   } else {
//     log.info({ requestId }, "OTP resent");
//   }
//   return { ok: true };
// }

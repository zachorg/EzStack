import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import type Redis from "ioredis";
import { destHash, randomOtp, hashOtp } from "../utils/crypto.js";
import { EzAuthSendOtpResponse } from "../__generated__/responseTypes.js";

const kOtp = (t: string, id: string) => `otp:${t}:${id}`;
// const kIdem   = (t: string, k: string)  => `idem:${t}:${k}`;
const kRate = (dh: string) => `rate:dest:${dh}`;
// const kResend = (id: string)            => `resend:${id}`;

export async function send(app: any, body: any): Promise<EzAuthSendOtpResponse> {
  if (!app.sns) {
    throw new Error("SNS not configured");
  }

  const { destination, channel, userId, contextDescription, serviceInfo } =
    body;
  const log = app.log.child({ userId, contextDescription });
  const redis = app.redis as Redis;

  const OTP_LENGTH = Math.min(Math.max(serviceInfo.otp_code_length, 4), 6);
  const DEST_PER_MINUTE = serviceInfo.otp_rate_limit_destination_per_minute;
  const OTP_TTL_SECONDS = serviceInfo.otp_ttl_seconds;

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
      const result = await app.sns.sendOtp(destination, otp, serviceInfo);
      if (!result.success) {
        log.error(
          { requestId, destination, error: result.error },
          "Failed to send OTP via SNS"
        );
        throw new Error(`Failed to send OTP via SNS: ${result.error}`);
      } else {
        const redisKey = kOtp(userId, requestId);
        await redis.set(redisKey, JSON.stringify(blob), "EX", OTP_TTL_SECONDS);
        console.log(`OTP redis key: ${redisKey}`);
        log.info(
          { requestId, messageId: result.messageId },
          "OTP sent via SNS"
        );
      }
    } catch (error) {
      log.error({ requestId, destination, error }, "SNS send error");
      throw new Error(`Failed to send OTP via SNS: ${error}`);
    }
  } else {
    log.warn(
      { requestId, destination },
      "SNS not configured - OTP generated but not sent"
    );
  }
  return {request_id: requestId, code: otp} as EzAuthSendOtpResponse;
}

export async function verify(app: FastifyInstance, body: any) {
  const { userId, requestId, code, serviceInfo } = body;
  const redis = app.redis;
  const OTP_MAX_ATTEMPTS = serviceInfo.otp_max_verification_attempts;
  const OTP_TTL_SECONDS = serviceInfo.otp_ttl_seconds;
  const key = kOtp(userId, requestId);
  const raw = await redis.get(key);

  if (!raw) {
    console.log(`OTP verify: request not found: `, key);
    return {verified: false, error: "Request not found"};
  }

  const data = JSON.parse(raw);

  data.attempts = (data.attempts || 0) + 1;
  if (data.attempts > OTP_MAX_ATTEMPTS) {
    await redis.del(key);
    app.log.warn(
      { requestId },
      "OTP verify: exceeded max attempts; invalidated"
    );
    return {verified: false, error: "Exceeded max attempts"};
  }

  const ok = hashOtp(code, data.salt) === data.hash;
  if (!ok) {
    await redis.set(key, JSON.stringify(data), "EX", OTP_TTL_SECONDS);
    app.log.warn({ requestId }, "OTP verify: incorrect code");
    return {verified: false, error: "Incorrect code"};
  }

  await redis.del(key);
  return {verified: true};
}

import fp from "fastify-plugin";

type TenantSettings = {
  otpLength: number;
  resendCooldownSec: number;
  destPerMinute: number;
  routePerMinute: number;
  otpMaxAttempts: number;
  oteLength: number;
  oteMaxAttempts: number;
};

const DEFAULTS: TenantSettings = {
  otpLength: Number(process.env.OTP_LENGTH || 6),
  resendCooldownSec: Number(process.env.RESEND_COOLDOWN_SEC || 30),
  destPerMinute: Number(process.env.DEST_PER_MINUTE || 5),
  routePerMinute: Number(process.env.RATE_ROUTE_MAX || 30),
  otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS || 5),
  oteLength: Number(process.env.OTE_LENGTH || process.env.OTP_LENGTH || 6),
  oteMaxAttempts: Number(process.env.OTE_MAX_ATTEMPTS || process.env.OTP_MAX_ATTEMPTS || 5)
};

const CACHE_TTL_MS = 5_000;

export default fp(async (app) => {
  const cache = new Map<string, { value: TenantSettings; expiresAt: number }>();

  function fromRaw(raw: any): Partial<TenantSettings> {
    if (!raw || typeof raw !== "object") return {};
    const out: Partial<TenantSettings> = {};
    const maybe = (keys: string[], parse: (v: any) => number) => {
      for (const k of keys) {
        if (raw[k] !== undefined) {
          const n = parse(raw[k]);
          if (!Number.isNaN(n) && Number.isFinite(n) && n > 0) {
            return n;
          }
        }
      }
      return undefined;
    };
    const otpLength = maybe(["OTP_LENGTH", "otpLength"], (v) => Number(v));
    const resendCooldownSec = maybe(["RESEND_COOLDOWN_SEC", "resendCooldownSec"], (v) => Number(v));
    const destPerMinute = maybe(["DEST_PER_MINUTE", "destPerMinute"], (v) => Number(v));
    const routePerMinute = maybe(["RATE_ROUTE_MAX", "routePerMinute"], (v) => Number(v));
    const otpMaxAttempts = maybe(["OTP_MAX_ATTEMPTS", "otpMaxAttempts"], (v) => Number(v));
    const oteLength = maybe(["OTE_LENGTH", "oteLength"], (v) => Number(v));
    const oteMaxAttempts = maybe(["OTE_MAX_ATTEMPTS", "oteMaxAttempts"], (v) => Number(v));
    if (otpLength !== undefined) out.otpLength = otpLength;
    if (resendCooldownSec !== undefined) out.resendCooldownSec = resendCooldownSec;
    if (destPerMinute !== undefined) out.destPerMinute = destPerMinute;
    if (routePerMinute !== undefined) out.routePerMinute = routePerMinute;
    if (otpMaxAttempts !== undefined) out.otpMaxAttempts = otpMaxAttempts;
    if (oteLength !== undefined) out.oteLength = oteLength;
    if (oteMaxAttempts !== undefined) out.oteMaxAttempts = oteMaxAttempts;
    return out;
  }

  app.decorate("getTenantSettings", async (tenantId?: string): Promise<TenantSettings> => {
    if (!tenantId) {
      return { ...DEFAULTS };
    }
    const now = Date.now();
    const hit = cache.get(tenantId);
    if (hit && hit.expiresAt > now) {
      return hit.value;
    }
    try {
      const key = `tenant:${tenantId}:settings`;
      const raw = await (app as any).redis.get(key);
      const parsed = raw ? JSON.parse(raw) : undefined;
      const merged: TenantSettings = { ...DEFAULTS, ...fromRaw(parsed) } as TenantSettings;
      cache.set(tenantId, { value: merged, expiresAt: now + CACHE_TTL_MS });
      return merged;
    } catch {
      return { ...DEFAULTS };
    }
  });
});




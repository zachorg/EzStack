import fp from "fastify-plugin";

// Settings that can be customized per tenant
type TenantSettings = {
  otpLength: number;         // Length of generated OTP codes
  resendCooldownSec: number; // Seconds to wait before allowing resend
  destPerMinute: number;     // Rate limit per destination per minute
  routePerMinute: number;    // Rate limit per route per minute
  otpMaxAttempts: number;    // Maximum number of OTP verification attempts
  // OTE (email code) settings
  oteLength: number;         // Length of generated OTE codes
  oteMaxAttempts: number;    // Maximum number of OTE verification attempts
};

// Default values loaded from environment variables
const DEFAULTS: TenantSettings = {
  otpLength: Number(process.env.OTP_LENGTH || 6),
  resendCooldownSec: Number(process.env.RESEND_COOLDOWN_SEC || 30),
  destPerMinute: Number(process.env.DEST_PER_MINUTE || 5),
  routePerMinute: Number(process.env.RATE_ROUTE_MAX || 30),
  otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS || 5),
  // Defaults for OTE fall back to OTP values when not provided
  oteLength: Number(process.env.OTE_LENGTH || process.env.OTP_LENGTH || 6),
  oteMaxAttempts: Number(process.env.OTE_MAX_ATTEMPTS || process.env.OTP_MAX_ATTEMPTS || 5)
};

// How long to cache tenant settings in memory (5 seconds)
const CACHE_TTL_MS = 5_000;

export default fp(async (app) => {
  // In-memory cache mapping tenant IDs to settings with expiry
  const cache = new Map<string, { value: TenantSettings; expiresAt: number }>();

  // Parse raw settings from Redis into typed TenantSettings object
  function fromRaw(raw: any): Partial<TenantSettings> {
    if (!raw || typeof raw !== "object") return {};

    // Accept both UPPER_SNAKE and camelCase keys
    const out: Partial<TenantSettings> = {};
    
    // Helper to safely parse numeric values with validation
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

    // Try parsing each setting, accepting either naming convention
    const otpLength = maybe(["OTP_LENGTH", "otpLength"], (v) => Number(v));
    const resendCooldownSec = maybe(["RESEND_COOLDOWN_SEC", "resendCooldownSec"], (v) => Number(v));
    const destPerMinute = maybe(["DEST_PER_MINUTE", "destPerMinute"], (v) => Number(v));
    const routePerMinute = maybe(["RATE_ROUTE_MAX", "routePerMinute"], (v) => Number(v));
    const otpMaxAttempts = maybe(["OTP_MAX_ATTEMPTS", "otpMaxAttempts"], (v) => Number(v));
    const oteLength = maybe(["OTE_LENGTH", "oteLength"], (v) => Number(v));
    const oteMaxAttempts = maybe(["OTE_MAX_ATTEMPTS", "oteMaxAttempts"], (v) => Number(v));

    // Only include valid parsed values
    if (otpLength !== undefined) out.otpLength = otpLength;
    if (resendCooldownSec !== undefined) out.resendCooldownSec = resendCooldownSec;
    if (destPerMinute !== undefined) out.destPerMinute = destPerMinute;
    if (routePerMinute !== undefined) out.routePerMinute = routePerMinute;
    if (otpMaxAttempts !== undefined) out.otpMaxAttempts = otpMaxAttempts;
    if (oteLength !== undefined) out.oteLength = oteLength;
    if (oteMaxAttempts !== undefined) out.oteMaxAttempts = oteMaxAttempts;
    return out;
  }

  // Decorate fastify with method to get settings for a tenant
  app.decorate("getTenantSettings", async (tenantId?: string): Promise<TenantSettings> => {
    // Return defaults if no tenant specified
    if (!tenantId) {
      return { ...DEFAULTS };
    }

    // Check cache first
    const now = Date.now();
    const hit = cache.get(tenantId);
    if (hit && hit.expiresAt > now) {
      return hit.value;
    }

    try {
      // Load from Redis and merge with defaults
      const key = `tenant:${tenantId}:settings`;
      const raw = await app.redis.get(key);
      const parsed = raw ? JSON.parse(raw) : undefined;
      const merged: TenantSettings = { ...DEFAULTS, ...fromRaw(parsed) } as TenantSettings;

      // Update cache and return
      cache.set(tenantId, { value: merged, expiresAt: now + CACHE_TTL_MS });
      return merged;
    } catch {
      // Return defaults on any error
      return { ...DEFAULTS };
    }
  });
});
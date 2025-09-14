import type { FastifyPluginAsync } from "fastify";
import argon2 from "argon2";
import crypto from "node:crypto";
import { hashApiKey } from "../utils/crypto.js";

type ApiKeyDoc = {
  userId: string;
  name?: string | null;
  keyPrefix: string;
  hashedKey: string;
  salt: string;
  alg: "argon2id";
  params: { memoryCost: number; timeCost: number; parallelism: number };
  createdAt: any;
  lastUsedAt: any;
  revokedAt: any;
  keyMaterialEnc?: string;
};

const ARGON_PARAMS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
};

const BASE32_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomBase32(length: number): string {
  const bytes = crypto.randomBytes(length);
  const alphabet = BASE32_ALPHABET;
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function computeChecksum(input: string): string {
  const sum = crypto.createHash("sha256").update(input).digest();
  const take = 5;
  const part = sum.subarray(0, take);
  let out = "";
  for (let i = 0; i < part.length; i++) {
    out += BASE32_ALPHABET[part[i] % BASE32_ALPHABET.length];
  }
  return out;
}

function generatePlainApiKey(): { key: string; prefix: string } {
  const body = randomBase32(26);
  const checksum = computeChecksum(body).slice(0, 8);
  const full = `ezk_${body}_${checksum}`;
  return { key: full, prefix: full.slice(0, 12) };
}

async function hashWithArgon2id(plaintext: string, saltB64: string, pepper: string): Promise<string> {
  const salt = Buffer.from(saltB64, "base64");
  return argon2.hash(`${pepper}${plaintext}`, { ...ARGON_PARAMS, salt });
}

// API key management routes: create/list/revoke. All routes rely on the auth
// plugin to populate req.userId and tenant authorization.
const routes: FastifyPluginAsync = async (app) => {
  const supabase = (app as any).supabase;
  const pepper = (app as any).apikeyPepper as string;

  app.get("/healthz", async (_req, rep) => {
    return rep.send({ ok: true });
  });

  app.post("/createApiKey", { preHandler: [app.rlPerRoute(10)] }, async (req: any, rep) => {
    try {
      const userId = req.userId as string | undefined;
      if (!userId) {
        return rep.status(401).send({ error: { message: "Unauthenticated" } });
      }

      const body = req.body || {};
      const nameRaw: unknown = body.name;
      const demo: boolean = body.demo === true;
      const tenantIdRaw: unknown = body.tenantId;

      const name = typeof nameRaw === "string" && nameRaw.trim() ? nameRaw.trim().slice(0, 120) : null;
      const tenantId = typeof tenantIdRaw === "string" && tenantIdRaw.trim() ? tenantIdRaw.trim() : undefined;
      if (!tenantId) {
        return rep.status(400).send({ error: { message: "tenantId required" } });
      }
      const okRole = await (app as any).hasTenantRole(userId, tenantId, ["owner", "admin", "dev"]);
      if (!okRole) {
        return rep.status(403).send({ error: { message: "Forbidden" } });
      }
      const t = await (app as any).getTenant(tenantId);
      if (!t || (t.status && t.status !== "active")) {
        return rep.status(403).send({ error: { message: "Tenant suspended" } });
      }
      const effectiveTenantId: string = tenantId;

      const { key, prefix } = generatePlainApiKey();

      const salt = crypto.randomBytes(16).toString("base64");
      const hashedKey = await hashWithArgon2id(key, salt, pepper);
      const lookupHash = hashApiKey(key, pepper);

      let keyMaterialEnc: string | undefined;
      if (demo && process.env.DEMO_ENCRYPT_ENABLED === "true") {
        const kmsResource = process.env.KMS_KEY_RESOURCE;
        if (kmsResource) {
          const { KeyManagementServiceClient } = await import("@google-cloud/kms");
          const kms = new KeyManagementServiceClient();
          const [enc] = await kms.encrypt({ name: kmsResource, plaintext: Buffer.from(key) });
          keyMaterialEnc = (enc.ciphertext || Buffer.alloc(0)).toString("base64");
        }
      }

      // Insert directly into Supabase;

      const { data: inserted, error } = await supabase
        .from("api_keys")
        .insert([{
          user_id: userId,
          tenant_id: effectiveTenantId,
          name,
          key_prefix: prefix,
          hashed_key: hashedKey,
          salt,
          alg: "argon2id",
          params: { memoryCost: ARGON_PARAMS.memoryCost, timeCost: ARGON_PARAMS.timeCost, parallelism: ARGON_PARAMS.parallelism },
          hash: lookupHash,
          status: "active",
          type: "tenant",
          ...(keyMaterialEnc ? { key_material_enc: keyMaterialEnc } : {})
        }])
        .select("id")
        .single();
      if (error || !inserted) {
        return rep.status(500).send({ error: { message: "Failed to create api key" } });
      }

      try { req.log.info({ tenantId: effectiveTenantId, userId, id: inserted.id }, "apikeys: created api key"); } catch {}

      return rep.send({
        id: inserted.id,
        key,
        keyPrefix: prefix,
        name,
        createdAt: null,
        lastUsedAt: null,
      });
    } catch (err: any) {
      req.log?.error({ err }, "createApiKey failed");
      return rep.status(500).send({ error: { message: "Internal error" } });
    }
  });

  app.get("/listApiKeys", { preHandler: [app.rlPerRoute(30)] }, async (req: any, rep) => {
    try {
      const userId = req.userId as string | undefined;
      if (!userId) {
        return rep.status(401).send({ error: { message: "Unauthenticated" } });
      }
      const tenantId = (req.query && (req.query as any).tenantId ? String((req.query as any).tenantId).trim() : "") || undefined;
      if (!tenantId) {
        return rep.status(400).send({ error: { message: "tenantId required" } });
      }
      const ok = await (app as any).hasTenantRole(userId, tenantId, ["owner", "admin", "dev", "viewer"]);
      if (!ok) {
        return rep.status(403).send({ error: { message: "Forbidden" } });
      }
      const { data: rows, error } = await supabase
        .from("api_keys")
        .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
        .eq("tenant_id", tenantId);
      if (error) {
        return rep.status(500).send({ error: { message: "Failed to list api keys" } });
      }
      const items = (rows || []).map((v: any) => ({
        id: v.id,
        name: v.name ?? null,
        keyPrefix: v.key_prefix,
        createdAt: v.created_at ?? null,
        lastUsedAt: v.last_used_at ?? null,
        revokedAt: v.revoked_at ?? null,
      }));

      const toMillis = (t: any): number | null => {
        if (!t) return null;
        if (typeof t.toMillis === "function") return t.toMillis();
        if (typeof t === "number") return t;
        if (typeof t === "object" && typeof t._seconds === "number") {
          const ns = typeof t._nanoseconds === "number" ? t._nanoseconds : 0;
          return t._seconds * 1000 + ns / 1e6;
        }
        return null;
      };

      items.sort((a: { createdAt: any }, b: { createdAt: any }) => {
        const am = toMillis(a.createdAt);
        const bm = toMillis(b.createdAt);
        if (am === null && bm === null) return 0;
        if (am === null) return 1;
        if (bm === null) return -1;
        return bm - am;
      });

      try { req.log.debug({ tenantId, count: items.length }, "apikeys: listed keys"); } catch {}
      return rep.send({ items });
    } catch (err: any) {
      req.log?.error({ err }, "listApiKeys failed");
      return rep.status(500).send({ error: { message: "Internal error" } });
    }
  });

  app.post("/revokeApiKey", { preHandler: [app.rlPerRoute(20)] }, async (req: any, rep) => {
    try {
      const userId = req.userId as string | undefined;
      if (!userId) {
        return rep.status(401).send({ error: { message: "Unauthenticated" } });
      }

      const id = req.body?.id as string | undefined;
      if (!id) {
        return rep.status(400).send({ error: { message: "Missing id" } });
      }

      const { data: row, error: gErr } = await supabase
        .from("api_keys")
        .select("id, tenant_id, user_id")
        .eq("id", id)
        .maybeSingle();
      if (gErr) {
        return rep.status(500).send({ error: { message: "Failed to load key" } });
      }
      if (!row) {
        return rep.status(404).send({ error: { message: "Key not found" } });
      }
      if (row.tenant_id) {
        const ok = await (app as any).hasTenantRole(userId, row.tenant_id, ["owner", "admin"]);
        if (!ok) {
          return rep.status(403).send({ error: { message: "Forbidden" } });
        }
      } else {
        if (row.user_id !== userId) {
          return rep.status(403).send({ error: { message: "Forbidden" } });
        }
      }
      const { error: uErr } = await supabase
        .from("api_keys")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (uErr) {
        return rep.status(500).send({ error: { message: "Failed to revoke key" } });
      }
      try { req.log.info({ id, userId }, "apikeys: revoked api key"); } catch {}
      return rep.send({ ok: true, deleted: true });
    } catch (err: any) {
      req.log?.error({ err }, "revokeApiKey failed");
      return rep.status(500).send({ error: { message: "Internal error" } });
    }
  });
};

export default routes;




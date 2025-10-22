import type { FastifyPluginAsync } from "fastify";
import argon2 from "argon2";
import crypto from "node:crypto";
import { hashApiKey } from "../utils/crypto.js";

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
  const firebase = app.firebase;
  const db = firebase.db;

  app.get("/healthz", async (_req, rep) => {
    return rep.send({ ok: true });
  });

  app.post("/create", { preHandler: [app.rlPerRoute(10)] }, async (req: any, rep) => {
    try {
      const userId = req.userId as string | undefined;
      if (!userId) {
        return rep.status(401).send({ error: { message: "Unauthenticated" } });
      }

      const body = req.body || {};
      const nameRaw: unknown = body.name;
      const demo: boolean = body.demo === true;

      const name = typeof nameRaw === "string" && nameRaw.trim() ? nameRaw.trim().slice(0, 120) : null;
      const { key, prefix } = generatePlainApiKey();

      const salt = crypto.randomBytes(16).toString("base64");
      const hashedKey = await hashWithArgon2id(key, salt, app.apikeyPepper);
      const lookupHash = hashApiKey(key, app.apikeyPepper);

      console.log("key: ", key, " pepper: ", app.apikeyPepper, " lookupHash: ", lookupHash);

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

      // Insert directly into Firestore;
      const keyDoc = db.collection("api_keys").doc();
      const keyData = {
        id: keyDoc.id,
        user_id: userId,
        name,
        key_prefix: prefix,
        hashed_key: hashedKey,
        salt,
        alg: "argon2id",
        params: { memoryCost: ARGON_PARAMS.memoryCost, timeCost: ARGON_PARAMS.timeCost, parallelism: ARGON_PARAMS.parallelism },
        hash: lookupHash,
        status: "active",
        type: "tenant",
        created_at: new Date(),
        updated_at: new Date(),
        ...(keyMaterialEnc ? { key_material_enc: keyMaterialEnc } : {})
      };

      try {
        await keyDoc.set(keyData);
      } catch (error) {
        return rep.status(500).send({ error: { message: "Failed to create api key" } });
      }

      const inserted = { id: keyDoc.id };

      try { req.log.info({ userId, id: inserted.id }, "apikeys: created api key"); } catch {}

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

  app.get("/list", { preHandler: [app.rlPerRoute(30)] }, async (req: any, rep) => {
    try {
      const userId = req.userId as string | undefined;
      if (!userId) {
        return rep.status(401).send({ error: { message: "Unauthenticated" } });
      }
      try {
        const querySnapshot = await db.collection("api_keys").where("user_id", "==", userId).get();
        
        const items = querySnapshot.docs.map((doc: any) => {
          const data = doc.data();
          return {
            id: data.id || doc.id,
            name: data.name ?? null,
            keyPrefix: data.key_prefix,
            createdAt: data.created_at ?? null,
            lastUsedAt: data.last_used_at ?? null,
            revokedAt: data.revoked_at ?? null,
          };
        });

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

        try { req.log.debug({ userId, count: items.length }, "apikeys: listed keys"); } catch {}
        return rep.send({ items });
      } catch (error) {
        return rep.status(500).send({ error: { message: "Failed to list api keys" } });
      }
    } catch (err: any) {
      req.log?.error({ err }, "listApiKeys failed");
      return rep.status(500).send({ error: { message: "Internal error" } });
    }
  });

  app.post("/revoke", { preHandler: [app.rlPerRoute(20)] }, async (req: any, rep) => {
    try {
      const userId = req.userId as string | undefined;
      if (!userId) {
        return rep.status(401).send({ error: { message: "Unauthenticated" } });
      }

      const id = req.body?.id as string | undefined;
      if (!id) {
        return rep.status(400).send({ error: { message: "Missing id" } });
      }

      try {
        const keyDoc = await db.collection("api_keys").doc(id).get();
        if (!keyDoc.exists) {
          return rep.status(404).send({ error: { message: "Key not found" } });
        }
        const row = keyDoc.data();
        
        if (row?.user_id !== userId) {
          return rep.status(403).send({ error: { message: "Forbidden" } });
        }
        
        await db.collection("api_keys").doc(id).update({
          status: "revoked",
          revoked_at: new Date(),
          updated_at: new Date()
        });
        
        try { req.log.info({ id, userId }, "apikeys: revoked api key"); } catch {}
        return rep.send({ ok: true, deleted: true });
      } catch (error) {
        return rep.status(500).send({ error: { message: "Failed to revoke key" } });
      }
    } catch (err: any) {
      req.log?.error({ err }, "revokeApiKey failed");
      return rep.status(500).send({ error: { message: "Internal error" } });
    }
  });
};

export default routes;

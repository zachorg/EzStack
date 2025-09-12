import type { FastifyPluginAsync } from "fastify";
import argon2 from "argon2";
import crypto from "node:crypto";

type ApiKeyDoc = {
  userId: string;
  name?: string | null;
  keyPrefix: string;
  hashedKey: string;
  salt: string;
  alg: "argon2id";
  params: { memoryCost: number; timeCost: number; parallelism: number };
  scopes?: string[];
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

const BASE32_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // excludes 0,O,o,1,I,l

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
  // Use first 5 bytes -> 40 bits -> need 8 base32 chars (40/5)
  const take = 5;
  const part = sum.subarray(0, take);
  // Map bytes to base32 chars
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

const routes: FastifyPluginAsync = async (app) => {
  const firestore = app.firestore;
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
      const scopesRaw: unknown = body.scopes;
      const demo: boolean = body.demo === true;

      const name = typeof nameRaw === "string" && nameRaw.trim() ? nameRaw.trim().slice(0, 120) : null;
      let scopes: string[] | undefined;
      if (Array.isArray(scopesRaw)) {
        scopes = scopesRaw
          .filter((v) => typeof v === "string" && v.trim())
          .slice(0, 20)
          .map((v) => v.trim());
      }

      const { key, prefix } = generatePlainApiKey();

      const salt = crypto.randomBytes(16).toString("base64");
      const hashedKey = await hashWithArgon2id(key, salt, pepper);

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

      const doc: ApiKeyDoc = {
        userId,
        name,
        keyPrefix: prefix,
        hashedKey,
        salt,
        alg: "argon2id",
        params: { memoryCost: ARGON_PARAMS.memoryCost, timeCost: ARGON_PARAMS.timeCost, parallelism: ARGON_PARAMS.parallelism },
        scopes,
        createdAt: (await import("firebase-admin/firestore")).FieldValue.serverTimestamp(),
        lastUsedAt: null,
        revokedAt: null,
        ...(keyMaterialEnc ? { keyMaterialEnc } : {}),
      };

      const ref = await firestore.collection("apiKeys").add(doc);

      return rep.send({
        id: ref.id,
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

      const q = await firestore.collection("apiKeys").where("userId", "==", userId).orderBy("createdAt", "desc").get();
      const items = q.docs.map((d: any) => {
        const v = d.data() as any;
        return {
          id: d.id,
          name: v.name ?? null,
          keyPrefix: v.keyPrefix,
          createdAt: v.createdAt ?? null,
          lastUsedAt: v.lastUsedAt ?? null,
          revokedAt: v.revokedAt ?? null,
        };
      });

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

      const ref = firestore.collection("apiKeys").doc(id);
      const snap = await ref.get();
      if (!snap.exists) {
        return rep.status(404).send({ error: { message: "Key not found" } });
      }
      const data = snap.data() as any;
      if (data.userId !== userId) {
        return rep.status(403).send({ error: { message: "Forbidden" } });
      }

      await ref.update({ revokedAt: (await import("firebase-admin/firestore")).FieldValue.serverTimestamp() });
      return rep.send({ ok: true, deleted: true });
    } catch (err: any) {
      req.log?.error({ err }, "revokeApiKey failed");
      return rep.status(500).send({ error: { message: "Internal error" } });
    }
  });
};

export default routes;



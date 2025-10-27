import type { FastifyPluginAsync } from "fastify";
import argon2 from "argon2";
import crypto from "node:crypto";
import { hashApiKey } from "../utils/crypto.js";
import {
  CreateApiKeyRequest,
  ListApiKeysRequest,
  RevokeApiKeyRequest,
} from "../__generated__/requestTypes";
import { ApiKeyDocument } from "../__generated__/documentTypes";
import {
  CreateApiKeyResponse,
  ListApiKeysResponse,
  RevokeApiKeyResponse,
} from "../__generated__/responseTypes";

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

async function hashWithArgon2id(
  plaintext: string,
  saltB64: string,
  pepper: string
): Promise<string> {
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

  app.post(
    "/create",
    { preHandler: [app.rlPerRoute(10)] },
    async (req: any, rep) => {
      try {
        const userId = req.userId as string | undefined;
        if (!userId) {
          return rep
            .status(401)
            .send({ error: { message: "Unauthenticated" } });
        }
        const body = (req.body as CreateApiKeyRequest) || {};

        // Create or update user document in Firestore
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
          return rep.status(404).send({ error: { message: "User not found" } });
        }

        const projects =
          userDoc.data()?.projects ?? ({} as Map<string, string>);
        if (!projects[body.project_name]) {
          return rep
            .status(400)
            .send({ error: { message: "Project not found" } });
        }

        const projectRef = db
          .collection("projects")
          .doc(projects[body.project_name]);
        const projectDoc = await projectRef.get();
        if (!projectDoc.exists) {
          return rep
            .status(404)
            .send({ error: { message: "Project not found" } });
        }

        const { key, prefix } = generatePlainApiKey();
        const keyDoc = db.collection("api_keys").doc();

        try {
          const salt = crypto.randomBytes(16).toString("base64");
          const hashedKey = await hashWithArgon2id(key, salt, app.apikeyPepper);
          const lookupHash = hashApiKey(key, app.apikeyPepper);
          // Insert directly into Firestore;
          const keyData = {
            name: body.name,
            id: keyDoc.id,
            project_id: projects[body.project_name],
            user_id: userId,
            key_prefix: prefix,
            hashed_key: hashedKey,
            lookup_hash: lookupHash,
            salt,
            alg: "argon2id",
            status: "active",
            created_at: new Date().toLocaleDateString(),
            updated_at: new Date().toLocaleDateString(),
          } as ApiKeyDocument;
          await keyDoc.set(keyData);
        } catch (error) {
          return rep
            .status(500)
            .send({ error: { message: "Failed to create api key" } });
        }

        return rep.status(200).send({
          id: key,
          name: body.name,
          key_prefix: prefix,
        } as CreateApiKeyResponse);
      } catch (err: any) {
        req.log?.error({ err }, "createApiKey failed");
        return rep.status(500).send({ error: { message: "Internal error" } });
      }
    }
  );

  app.get(
    "/list",
    { preHandler: [app.rlPerRoute(10)] },
    async (req: any, rep) => {
      try {
        const userId = req.userId as string | undefined;
        if (!userId) {
          return rep
            .status(401)
            .send({ error: { message: "Unauthenticated" } });
        }
        const request = (req.headers as ListApiKeysRequest) || {};

        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
          return rep.status(404).send({ error: { message: "User not found" } });
        }

        const projects: Record<string, string> =
          (userDoc.data()?.projects as Record<string, string>) ?? {};
        if (!projects[request.project_name]) {
          return rep
            .status(400)
            .send({ error: { message: "Project not found" } });
        }

        try {
          const querySnapshot = await db
            .collection("api_keys")
            .where("user_id", "==", userId)
            .where("project_id", "==", projects[request.project_name])
            .get();

          const items: ListApiKeysResponse[] = querySnapshot.docs.map(
            (doc: any) => {
              const data = doc.data();
              return {
                name: data.name ?? null,
                key_prefix: data.key_prefix,
                status: data.status,
              } as ListApiKeysResponse;
            }
          );

          items.sort((a: ListApiKeysResponse, b: ListApiKeysResponse) => {
            // Sort active first, then inactive
            if (a.status === "active" && b.status !== "active") return -1;
            if (a.status !== "active" && b.status === "active") return 1;
            return 0;
          });

          return rep.status(200).send({ api_keys: items });
        } catch (error) {
          return rep
            .status(500)
            .send({ error: { message: "Failed to list api keys" } });
        }
      } catch (err: any) {
        req.log?.error({ err }, "listApiKeys failed");
        return rep.status(500).send({ error: { message: "Internal error" } });
      }
    }
  );

  app.post(
    "/revoke",
    { preHandler: [app.rlPerRoute(20)] },
    async (req: any, rep) => {
      try {
        const userId = req.userId as string | undefined;
        if (!userId) {
          return rep
            .status(401)
            .send({ error: { message: "Unauthenticated" } });
        }

        const request = (req.body as RevokeApiKeyRequest) || {};

        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
          return rep.status(404).send({ error: { message: "User not found" } });
        }

        const projects: Record<string, string> =
          (userDoc.data()?.projects as Record<string, string>) ?? {};
        if (!projects[request.project_name]) {
          return rep
            .status(400)
            .send({ error: { message: "Project not found" } });
        }
        
        const foundKey = await db
          .collection("api_keys")
          .where("user_id", "==", userId)
          .where("project_id", "==", projects[request.project_name])
          .where("name", "==", request.name)
          .get();

          if(!foundKey.docs || foundKey.docs.length === 0) {
            return rep
              .status(404)
              .send({ error: { message: "Key not found" } });
          }

        try {
          await foundKey.docs[0].ref.update({
            status: "revoked",
            revoked_at: new Date().toLocaleDateString(),
            updated_at: new Date().toLocaleTimeString(),
          });

          return rep.status(200).send({ ok: true } as RevokeApiKeyResponse);
        } catch (error) {
          return rep
            .status(500)
            .send({ error: { message: "Failed to revoke key" } });
        }
      } catch (err: any) {
        req.log?.error({ err }, "revokeApiKey failed");
        return rep.status(500).send({ error: { message: "Internal error" } });
      }
    }
  );
};

export default routes;

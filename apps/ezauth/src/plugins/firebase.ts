import fp from "fastify-plugin";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { join } from "path";
import argon2 from "argon2";
import { hashApiKey } from "../utils/crypto.js";
import {
  ApiKeyDocument,
  UserProfileDocument,
  UserProjectDocument,
} from "../__generated__/documentTypes.js";
import { EzAuthServiceConfig } from "../__generated__/configTypes.js";

const ARGON_PARAMS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
};

const EZAUTH_SERVICE_NAME = "ezauth";
const EZAUTH_SERVICE_CONFIG = {
  enabled: false,
  organization_name: "EzAuth",
  otp_code_length: 6,
  otp_rate_limit_destination_per_minute: 5,
  otp_max_verification_attempts: 5,
  otp_ttl_seconds: 300,
} as EzAuthServiceConfig;

async function hashWithArgon2id(
  plaintext: string,
  saltB64: string,
  pepper: string
): Promise<string> {
  const salt = Buffer.from(saltB64, "base64");
  return argon2.hash(`${pepper}${plaintext}`, { ...ARGON_PARAMS, salt });
}

export default fp(async (app: any) => {
  // Read Firebase service account from file
  const serviceAccountPath = join(
    process.cwd(),
    "secrets",
    "ezstack-service-account.json"
  );
  let serviceAccountJson;

  try {
    const serviceAccountFile = readFileSync(serviceAccountPath, "utf8");
    serviceAccountJson = JSON.parse(serviceAccountFile);
  } catch (error) {
    throw new Error(
      `Failed to read Firebase service account from ${serviceAccountPath}: ${
        error instanceof Error ? error.message : String(error)
      }. Please ensure the file exists and contains valid JSON.`
    );
  }

  const projectId = serviceAccountJson.project_id;

  if (!projectId) {
    throw new Error("project_id not found in service account file");
  }

  // Initialize Firebase Admin (avoid duplicate initialization)
  let firebaseApp;
  if (getApps().length === 0) {
    firebaseApp = initializeApp({
      credential: cert(serviceAccountJson),
      projectId: projectId,
    });
  } else {
    firebaseApp = getApps()[0];
  }

  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);
  const firestore = getFirestore(firebaseApp);

  app.decorate("firebase", { auth, db, firestore, app: firebaseApp });

  app.decorate("introspectApiKey", async (apiKey: string) => {
    try {
      const lookupHash = hashApiKey(apiKey, app.apikeyPepper);

      console.log(
        "apiKey",
        apiKey,
        "app.apikeyPepper",
        app.apikeyPepper,
        "lookupHash",
        lookupHash
      );
      const keyDoc = await db
        .collection("api_keys")
        .where("lookup_hash", "==", lookupHash)
        .limit(1)
        .get();

      const keyData = keyDoc.docs[0].data() as ApiKeyDocument;
      if (keyData.status !== "active") {
        throw new Error("API key is not active");
      }

      if (keyDoc.empty) {
        return null;
      }

      const hashedKey = await hashWithArgon2id(
        apiKey,
        keyData.salt,
        app.apikeyPepper
      );
      if (hashedKey !== keyData.hashed_key) {
        return null;
      }

      // Get user data
      const userId = keyData.user_id;
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        return null;
      }
      const userData = userDoc.data() as UserProfileDocument;
      if (!userData) {
        return null;
      }

      if (!userData.stripe_customer_id) {
        throw new Error("User billing has not been setup for user");
      }

      const projectsDocs = await db
        .collection("projects")
        .where("id", "==", keyData.project_id)
        .limit(1)
        .get();

      const project = projectsDocs.docs[0].data() as UserProjectDocument;
      const serviceInfo = project.services[EZAUTH_SERVICE_NAME]
        ? (JSON.parse(
            project.services[EZAUTH_SERVICE_NAME]
          ) as EzAuthServiceConfig)
        : EZAUTH_SERVICE_CONFIG;
      return {
        keyId: keyData.id,
        projectId: keyData.project_id,
        userId: userId,
        serviceInfo,
        stripeCustomerId: userData.stripe_customer_id,
      };
    } catch (error) {
      app.log.error(error);
      throw new Error(error instanceof Error ? error.message : "Unknown error");
    }
  });

  app.decorate("updateApiKeyUsage", async (keyId: string) => {
    try {
      await db
        .collection("api_keys")
        .doc(keyId)
        .update({
          last_used: new Date(),
          usage_count:
            (await db.collection("api_keys").doc(keyId).get()).data()
              ?.usage_count + 1 || 1,
        });
    } catch (error) {
      app.log.warn({ error, keyId }, "Failed to update API key usage");
    }
  });
});

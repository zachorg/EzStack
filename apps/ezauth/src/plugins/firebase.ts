import fp from "fastify-plugin";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { join } from "path";
import argon2 from "argon2";
import { hashApiKey } from "../utils/crypto.js";

const ARGON_PARAMS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
};

async function hashWithArgon2id(plaintext: string, saltB64: string, pepper: string): Promise<string> {
  const salt = Buffer.from(saltB64, "base64");
  return argon2.hash(`${pepper}${plaintext}`, { ...ARGON_PARAMS, salt });
}

export default fp(async (app: any) => {
  // Read Firebase service account from file
  const serviceAccountPath = join(process.cwd(), 'secrets', 'ezstack-service-account.json');
  let serviceAccountJson;
  
  try {
    const serviceAccountFile = readFileSync(serviceAccountPath, 'utf8');
    serviceAccountJson = JSON.parse(serviceAccountFile);
  } catch (error) {
    throw new Error(`Failed to read Firebase service account from ${serviceAccountPath}: ${error instanceof Error ? error.message : String(error)}. Please ensure the file exists and contains valid JSON.`);
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

  app.decorate("firebase", { auth, db, app: firebaseApp });

  app.decorate("introspectApiKey", async (apiKey: string) => {
    try {
      const lookupHash = hashApiKey(apiKey, app.apikeyPepper);
      
      console.log("apiKey", apiKey, "app.apikeyPepper", app.apikeyPepper, "lookupHash", lookupHash);
      const keyDoc = await db.collection("api_keys")
      .where("hash", "==", lookupHash)
      .where("status", "==", "active")
      .limit(1)
      .get();
      
      if (keyDoc.empty) {
        return null;
      }
      
      const keyData = keyDoc.docs[0].data();
      const hashedKey = await hashWithArgon2id(apiKey, keyData.salt, app.apikeyPepper);
      if (hashedKey !== keyData.hashed_key) {
        return null;
      }
      
      // Get user data
      const userId = keyData.user_id;
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        return null;
      }

      const userData = userDoc.data();
      const user = { 
        uid: userData?.id || null, 
        status: userData?.status || "inactive", 
        planId: userData?.plan_id || null, 
        featureFlags: userData?.feature_flags || null
      };

      let plan: any;
      if (userData?.plan_id) {
        const planDoc = await db.collection("plans").doc(userData.plan_id).get();
        if (planDoc.exists) {
          const planData = planDoc.data();
          plan = { 
            planId: planData?.id || userData.plan_id, 
            name: planData?.name, 
            limits: planData?.limits || {}, 
            features: planData?.features || {} 
          };
        }
      }

      return { 
        keyId: keyData.id,
        userId: userId,
        user: user,
        plan: plan,
        createdAt: keyData.created_at,
        lastUsed: keyData.last_used
      };
    } catch (error) {
      app.log.error({ error, apiKey }, "Failed to introspect API key");
      return null;
    }
  });

  app.decorate("updateApiKeyUsage", async (keyId: string) => {
    try {
      await db.collection("api_keys").doc(keyId).update({
        last_used: new Date(),
        usage_count: (await db.collection("api_keys").doc(keyId).get()).data()?.usage_count + 1 || 1
      });
    } catch (error) {
      app.log.warn({ error, keyId }, "Failed to update API key usage");
    }
  });
});

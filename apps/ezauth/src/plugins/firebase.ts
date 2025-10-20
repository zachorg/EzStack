import fp from "fastify-plugin";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { join } from "path";

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

  app.decorate("introspectIdToken", async (token: string) => {
    try {
      const decodedToken = await auth.verifyIdToken(token);
      const uid = decodedToken.uid;
      const email = decodedToken.email;
      const emailVerified = decodedToken.email_verified || false;

      let user: any;
      let plan: any;

      try {
        // Get user document from Firestore
        const userDoc = await db.collection("users").doc(uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          user = { 
            uid: userData?.id || uid, 
            status: userData?.status || "active", 
            planId: userData?.plan_id, 
            featureFlags: userData?.feature_flags || {} 
          };

          // Get plan if user has one
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
        }
      } catch (error) {
        // Log error but don't fail authentication
        app.log.warn({ error, uid }, "Failed to fetch user data from Firestore");
      }

      return { uid, email, emailVerified, user, plan };
    } catch (error) {
      throw new Error(`Invalid Firebase ID token: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  app.decorate("introspectApiKey", async (hash: string) => {
    try {
      const keyDoc = await db.collection("api_keys")
        .where("hash", "==", hash)
        .where("status", "==", "active")
        .limit(1)
        .get();

      if (keyDoc.empty) {
        return null;
      }

      const keyData = keyDoc.docs[0].data();
      const userId = keyData.user_id;

      // Get user data
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        return null;
      }

      const userData = userDoc.data();
      const user = { 
        uid: userData?.id || userId, 
        status: userData?.status || "active", 
        planId: userData?.plan_id, 
        featureFlags: userData?.feature_flags || {} 
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
      app.log.error({ error, hash }, "Failed to introspect API key");
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

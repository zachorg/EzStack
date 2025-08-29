import fp from "fastify-plugin";
import { getApps, initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

type IntrospectedKey = {
  keyId: string;
  tenantId: string;
  status: "active" | "revoked" | string;
  createdAt?: string | number;
};

type TenantDoc = {
  tenantId: string;
  name?: string;
  status?: "active" | "suspended" | string;
  planId?: string;
  featureFlags?: Record<string, boolean>;
};

type PlanDoc = {
  planId: string;
  name?: string;
  limits?: Record<string, number>;
  features?: Record<string, boolean>;
};

export default fp(async (app) => {
  // Initialize Firebase Admin app once per process
  if (getApps().length === 0) {
    const pj = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (pj && clientEmail && privateKey) {
      initializeApp({
        credential: cert({ projectId: pj, clientEmail, privateKey })
      });
    } else {
      // Fallback to application default credentials (e.g., GOOGLE_APPLICATION_CREDENTIALS)
      initializeApp({ credential: applicationDefault() });
    }
  }

  const firestore: Firestore = getFirestore();

  app.decorate("firestore", firestore);

  // Introspect an API key hash against Firestore and assemble authz payload
  app.decorate(
    "introspectApiKey",
    async (hash: string): Promise<{
      key?: IntrospectedKey;
      tenant?: TenantDoc;
      plan?: PlanDoc;
    }> => {
      // apiKeys is modeled as a top-level collection keyed by keyId with field 'hash'
      const q = await firestore
        .collection("apiKeys")
        .where("hash", "==", hash)
        .limit(1)
        .get();

      if (q.empty) {
        return {};
      }

      const keySnap = q.docs[0];
      const keyData = keySnap.data() as any;
      const key: IntrospectedKey = {
        keyId: keyData.keyId || keySnap.id,
        tenantId: keyData.tenantId,
        status: keyData.status || "active",
        createdAt: keyData.createdAt
      };

      let tenant: TenantDoc | undefined;
      let plan: PlanDoc | undefined;

      if (key.tenantId) {
        const tSnap = await firestore.collection("tenants").doc(key.tenantId).get();
        if (tSnap.exists) {
          const t = tSnap.data() as any;
          tenant = {
            tenantId: t.tenantId || tSnap.id,
            name: t.name,
            status: t.status || "active",
            planId: t.planId,
            featureFlags: t.featureFlags || {}
          };
          if (tenant.planId) {
            const pSnap = await firestore.collection("plans").doc(tenant.planId).get();
            if (pSnap.exists) {
              const p = pSnap.data() as any;
              plan = {
                planId: p.planId || pSnap.id,
                name: p.name,
                limits: p.limits || {},
                features: p.features || {}
              };
            }
          }
        }
      }

      return { key, tenant, plan };
    }
  );
});



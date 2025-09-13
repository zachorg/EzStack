import fp from "fastify-plugin";
import { getApps, initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

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
      app.log.info({ projectId: pj, clientEmail }, "Firebase Admin initialized with inline credentials");
    } else {
      // Fallback to application default credentials (e.g., GOOGLE_APPLICATION_CREDENTIALS)
      initializeApp({ credential: applicationDefault() });
      app.log.info("Firebase Admin initialized with application default credentials");
    }
  }

  const firestore: Firestore = getFirestore();

  app.decorate("firestore", firestore);

  // Connectivity probe (non-fatal): attempt a trivial list to verify access
  try {
    // Use a lightweight query to avoid creating collections
    await firestore.listCollections();
    app.log.info("Firestore connectivity check passed");
  } catch (err: any) {
    app.log.error({ err }, "Firestore connectivity check failed");
  }

  // Introspect an API key hash against Firestore and assemble authz payload
  app.decorate(
    "introspectApiKey",
    async (hash: string): Promise<{
      key?: IntrospectedKey & { userId?: string };
      tenant?: TenantDoc;
      plan?: PlanDoc;
    }> => {
      // apiKeys stores a deterministic 'hash' for lookup and 'status'
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
      const key: IntrospectedKey & { userId?: string } = {
        keyId: keyData.keyId || keySnap.id,
        tenantId: keyData.tenantId,
        status: keyData.status || "active",
        createdAt: keyData.createdAt,
        userId: keyData.userId,
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

  // Load a tenant document by id (non-throwing)
  app.decorate(
    "getTenant",
    async (tenantId: string): Promise<TenantDoc | undefined> => {
      const tSnap = await firestore.collection("tenants").doc(tenantId).get();
      if (!tSnap.exists) return undefined;
      const t = tSnap.data() as any;
      return {
        tenantId: t.tenantId || tSnap.id,
        name: t.name,
        status: t.status || "active",
        planId: t.planId,
        featureFlags: t.featureFlags || {}
      };
    }
  );

  // Check if user is a member of a tenant with one of the allowed roles
  app.decorate(
    "hasTenantRole",
    async (
      userId: string | undefined,
      tenantId: string | undefined,
      rolesAllowed: Array<"owner" | "admin" | "dev" | "viewer"> = ["owner", "admin", "dev", "viewer"]
    ): Promise<boolean> => {
      if (!userId || !tenantId) return false;
      try {
        const mSnap = await firestore
          .collection("tenants")
          .doc(tenantId)
          .collection("members")
          .doc(userId)
          .get();
        if (!mSnap.exists) return false;
        const m = mSnap.data() as any;
        if (m && typeof m.role === "string") {
          return rolesAllowed.includes(m.role);
        }
      } catch {}
      return false;
    }
  );

  // Verify Firebase Auth ID token and assemble user-based plan/features (if any)
  app.decorate(
    "introspectIdToken",
    async (idToken: string): Promise<{
      uid?: string;
      email?: string;
      emailVerified?: boolean;
      user?: { uid: string; status?: string; planId?: string; featureFlags?: Record<string, boolean> };
      plan?: { planId: string; name?: string; limits?: Record<string, number>; features?: Record<string, boolean> };
    }> => {
      const auth = getAuth();
      const decoded = await auth.verifyIdToken(idToken);
      const uid = decoded.uid;

      // Optional: load a user profile doc if you maintain plans at user-level
      let user: any;
      let plan: any;
      try {
        const uSnap = await firestore.collection("users").doc(uid).get();
        if (uSnap.exists) {
          const u = uSnap.data() as any;
          user = {
            uid,
            status: u.status || "active",
            planId: u.planId,
            featureFlags: u.featureFlags || {}
          };
          if (user.planId) {
            const pSnap = await firestore.collection("plans").doc(user.planId).get();
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
      } catch {}

      return { uid, email: decoded.email, emailVerified: decoded.email_verified, user, plan };
    }
  );
});



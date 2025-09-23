import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { join } from "path";

// Initialize Firebase Admin (avoid duplicate initialization)
let app: App | undefined;
let adminAuth: Auth | MockAuth;
let adminDb: Firestore | MockDb;

// Mock types for when Firebase is not configured
interface MockAuth {
  verifyIdToken: (token: string) => Promise<never>;
  verifySessionCookie: (cookie: string, checkRevoked?: boolean) => Promise<never>;
  createSessionCookie: (idToken: string, sessionCookieOptions: object) => Promise<never>;
  revokeRefreshTokens: (uid: string) => Promise<never>;
  getUser: (uid: string) => Promise<never>;
}

interface MockDb {
  collection: (path: string) => MockCollection;
}

interface MockCollection {
  doc: (documentPath?: string) => MockDocument;
  where: (fieldPath: string, opStr: string, value: unknown) => MockQuery;
}

interface MockDocument {
  get: () => Promise<never>;
  set: (data: object) => Promise<never>;
  update: (data: object) => Promise<never>;
}

interface MockQuery {
  get: () => Promise<never>;
}

try {
  if (getApps().length === 0) {
    let serviceAccountJson;
    
    // Try environment variable first, then fall back to service account file
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        serviceAccountJson = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      } catch (error) {
        throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON: ${error instanceof Error ? error.message : String(error)}. Please ensure it's a valid JSON string.`);
      }
    } else {
      // Try to read from service account file
      const serviceAccountPath = join(process.cwd(), 'secrets', 'ezstack-service-account.json');
      try {
        const serviceAccountFile = readFileSync(serviceAccountPath, 'utf8');
        serviceAccountJson = JSON.parse(serviceAccountFile);
      } catch (error) {
        // If file doesn't exist, continue with mock objects for build-time
        serviceAccountJson = null;
      }
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || serviceAccountJson?.project_id;
    
    if (!serviceAccountJson || !projectId) {
      console.warn("Firebase Admin configuration not found. Some features may not work.");
      // Create mock objects for build-time
      adminAuth = {
        verifyIdToken: () => Promise.reject(new Error("Firebase not configured")),
        verifySessionCookie: () => Promise.reject(new Error("Firebase not configured")),
        createSessionCookie: () => Promise.reject(new Error("Firebase not configured")),
        revokeRefreshTokens: () => Promise.reject(new Error("Firebase not configured")),
        getUser: () => Promise.reject(new Error("Firebase not configured")),
      } as MockAuth;
      adminDb = {
        collection: () => ({
          doc: () => ({
            get: () => Promise.reject(new Error("Firebase not configured")),
            set: () => Promise.reject(new Error("Firebase not configured")),
            update: () => Promise.reject(new Error("Firebase not configured")),
          }),
          where: () => ({
            get: () => Promise.reject(new Error("Firebase not configured")),
          }),
        }),
      } as MockDb;
    } else {
      app = initializeApp({
        credential: cert(serviceAccountJson),
        projectId: projectId,
      });
      adminAuth = getAuth(app);
      adminDb = getFirestore(app);
    }
  } else {
    app = getApps()[0];
    adminAuth = getAuth(app);
    adminDb = getFirestore(app);
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
  // Create mock objects for build-time
  adminAuth = {
    verifyIdToken: () => Promise.reject(new Error("Firebase initialization failed")),
    verifySessionCookie: () => Promise.reject(new Error("Firebase initialization failed")),
    createSessionCookie: () => Promise.reject(new Error("Firebase initialization failed")),
    revokeRefreshTokens: () => Promise.reject(new Error("Firebase initialization failed")),
    getUser: () => Promise.reject(new Error("Firebase initialization failed")),
  } as MockAuth;
  adminDb = {
    collection: () => ({
      doc: () => ({
        get: () => Promise.reject(new Error("Firebase initialization failed")),
        set: () => Promise.reject(new Error("Firebase initialization failed")),
        update: () => Promise.reject(new Error("Firebase initialization failed")),
      }),
      where: () => ({
        get: () => Promise.reject(new Error("Firebase initialization failed")),
      }),
    }),
  } as MockDb;
}

export { adminAuth, adminDb, app };

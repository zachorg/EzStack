import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { join } from "path";

// Initialize Firebase Admin (avoid duplicate initialization)
let app: App | undefined;
let adminAuth: Auth;
let adminDb: Firestore;

try {
  if (getApps().length === 0) {
    let serviceAccountJson;
    
    // Try to read from service account file
    const serviceAccountPath = join(process.cwd(), 'secrets', 'ezstack-service-account.json');
    // Try environment variable first, then fall back to service account file
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        serviceAccountJson = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      } catch (error) {
        throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON: ${error instanceof Error ? error.message : String(error)}. Please ensure it's a valid JSON string.`);
      }
    } else {
      try {
        const serviceAccountFile = readFileSync(serviceAccountPath, 'utf8');
        serviceAccountJson = JSON.parse(serviceAccountFile);
      } catch (error) {
        // If file doesn't exist, continue with mock objects for build-time
        serviceAccountJson = null;
      }
    }

    if (!serviceAccountJson) {
      const errorString = `Firebase Admin configuration not found at ${process.cwd()}. Some features may not work.`;
      console.error(errorString);
      throw new Error(errorString);
    } else {
      app = initializeApp({
        credential: cert(serviceAccountJson),
        projectId: serviceAccountJson?.project_id,
      });
      adminAuth = getAuth(app);
      adminDb = getFirestore(app);
      
      console.log('Firebase Admin initialized!');
    }
  } else {
    app = getApps()[0];
    adminAuth = getAuth(app);
    adminDb = getFirestore(app);
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
}

export { adminAuth, adminDb, app };

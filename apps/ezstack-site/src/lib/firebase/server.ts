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
    // Read Firebase service account from file
    const serviceAccountPath = join(process.cwd(), 'secrets', 'ezstack-service-account.json');
    let serviceAccountJson;
    
    try {
      const serviceAccountFile = readFileSync(serviceAccountPath, 'utf8');
      serviceAccountJson = JSON.parse(serviceAccountFile);
    } catch {
      // If file doesn't exist, continue with mock objects for build-time
      const errorString = `Firebase Admin configuration not found at ${serviceAccountPath}. Some features may not work.`;
      console.error(errorString);
      throw new Error(errorString);
    }

    app = initializeApp({
      credential: cert(serviceAccountJson),
      projectId: serviceAccountJson.project_id,
    });
    adminAuth = getAuth(app);
    adminDb = getFirestore(app);
    
    console.log('Firebase Admin initialized!');
  } else {
    app = getApps()[0];
    adminAuth = getAuth(app);
    adminDb = getFirestore(app);
  }
} catch {
  console.error("Failed to initialize Firebase Admin");
}

export { adminAuth, adminDb, app };

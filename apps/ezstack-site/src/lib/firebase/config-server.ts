// Server-side Firebase config injection (alternative approach)
import { readFileSync } from "fs";
import { join } from "path";

export function getFirebaseClientConfig() {
  // Try to read from service account file to extract public config
  try {
    const serviceAccountPath = join(process.cwd(), 'secrets', 'ezstack-service-account.json');
    const serviceAccountFile = readFileSync(serviceAccountPath, 'utf8');
    const serviceAccountJson = JSON.parse(serviceAccountFile);
    
    // Extract project ID from service account
    const projectId = serviceAccountJson.project_id;
    
    if (!projectId) {
      throw new Error("No project_id found in service account file");
    }

    // You'd still need to set these somehow - they're not in the service account file
    // These values are specific to your Firebase web app configuration
    return {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: `${projectId}.firebaseapp.com`, // Standard format
      projectId: projectId,
      storageBucket: `${projectId}.appspot.com`, // Standard format
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
  } catch {
    // Fall back to environment variables
    return {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
  }
}

import fp from "fastify-plugin";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

// Loads sensitive configuration (like API key pepper) from Google Secret Manager.
export default fp(async (app) => {
  const raw = (process.env.APIKEY_PEPPER || "").trim();
  const projectId = (process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "").trim();
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || "").trim();
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  let pepper: string | undefined;

  if (raw) {
    const looksLikeResource = raw.startsWith("projects/") && raw.includes("/secrets/");
    const looksLikeSecretId = !raw.includes("/");

    const candidates: string[] = [];
    if (looksLikeResource) {
      candidates.push(raw.includes("/versions/") ? raw : `${raw}/versions/latest`);
    } else if (looksLikeSecretId && projectId) {
      candidates.push(`projects/${projectId}/secrets/${raw}/versions/latest`);
    }

    // Try to fetch from GSM if we have a candidate resource name
    if (candidates.length > 0) {
      const clientOptions: any = {};
      if (clientEmail && privateKey) {
        clientOptions.credentials = { client_email: clientEmail, private_key: privateKey };
      }
      if (projectId) {
        clientOptions.projectId = projectId;
      }
      const client = new SecretManagerServiceClient(clientOptions);
      for (const name of candidates) {
        try {
          const [v] = await client.accessSecretVersion({ name });
          const data = v.payload?.data;
          const val = (data ? data.toString("utf8") : "").trim();
          if (val) {
            pepper = val;
            app.log.info({ secret: "APIKEY_PEPPER", name }, "Loaded pepper from Secret Manager");
            break;
          }
        } catch (err: any) {
          app.log.error({ err: err && err.message, name }, "Failed to load API key pepper from Secret Manager");
        }
      }
    }

    // If still not resolved and it's not a resource path, treat raw as literal pepper
    if (!pepper && !looksLikeResource) {
      pepper = raw;
      app.log.warn("Using APIKEY_PEPPER as literal value (dev mode)");
    }
  }

  if (!pepper) {
    throw new Error("API key pepper not configured. Set APIKEY_PEPPER to a secret ID, a GSM resource (projects/.../secrets/...), or a dev literal.");
  }

  (app as any).apikeyPepper = pepper;
  try { app.log.info({ hasPepper: Boolean(pepper) }, "secrets: pepper initialized"); } catch {}
});



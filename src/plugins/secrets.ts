import fp from "fastify-plugin";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

// Loads sensitive configuration (like API key pepper) from Google Secret Manager.
export default fp(async (app) => {
  const resource = process.env.APIKEY_PEPPER; // e.g. projects/123/secrets/APIKEY_PEPPER/versions/latest

  let pepper: string | undefined;

  if (resource) {
    const client = new SecretManagerServiceClient();
    try {
      const [v] = await client.accessSecretVersion({ name: resource });
      const data = v.payload?.data;
      pepper = (data ? data.toString("utf8") : "").trim();
    } catch (err: any) {
      app.log.error({ err }, "Failed to load API key pepper from Secret Manager");
      // fall through to env fallback
    }
  }

  if (!pepper) {
    pepper = (process.env.APIKEY_PEPPER || "").trim();
    if (pepper) {
      app.log.warn("Using APIKEY_PEPPER from environment; configure APIKEY_PEPPER for Secret Manager");
    }
  }

  if (!pepper) {
    throw new Error("API key pepper not configured. Set APIKEY_PEPPER (preferred) or APIKEY_PEPPER for dev.");
  }

  (app as any).apikeyPepper = pepper;
});



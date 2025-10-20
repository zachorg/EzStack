import fp from "fastify-plugin";

// Loads sensitive configuration (like API key pepper) from Google Secret Manager.
export default fp(async (app: any) => {
  const raw = (process.env.APIKEY_PEPPER || "").trim();

  let pepper: string | undefined;

  if (!pepper) {
    throw new Error(
      "API key pepper not configured. Set APIKEY_PEPPER to a secret ID, a GSM resource (projects/.../secrets/...), or a dev literal."
    );
  }

  (app as any).apikeyPepper = pepper;
  try {
    app.log.info({ hasPepper: Boolean(pepper) }, "secrets: pepper initialized");
  } catch {}
});

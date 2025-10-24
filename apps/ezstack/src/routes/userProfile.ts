import type { FastifyPluginAsync } from "fastify";
import { UserProfileDescriptor } from "../types/user";

// API key management routes: create/list/revoke. All routes rely on the auth
// plugin to populate req.userId and tenant authorization.
const routes: FastifyPluginAsync = async (app) => {
  const firebase = app.firebase;
  const db = firebase.db;

  app.get("/healthz", async (_req, rep) => {
    return rep.send({ ok: true });
  });

  app.post("/loginin", {}, async (req: any, rep) => {
    try {
      const jwtAuthToken = req.headers["authorization"] as string;
      const authToken = jwtAuthToken.startsWith("Bearer ") ? jwtAuthToken.slice(7).trim() : null;
      if (!authToken) {
        return rep.status(401).send({ error: { message: "Invalid token" } });
      }

      // Verify the Firebase ID token
      const decodedToken = await firebase.auth.verifyIdToken(authToken);
      const uid = decodedToken.uid;
      const email = decodedToken.email;

      // Create or update user document in Firestore
      const userRef = db.collection("users").doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        // Create new user document
        await userRef.set({
          id: uid,
          email: email,
          status: "active",
          projects: {},
          created_at: new Date(),
          updated_at: new Date(),
        } as UserProfileDescriptor);
      } else {
        // Update existing user
        await userRef.update({
          updated_at: new Date(),
          last_login: new Date(),
        });
      }

      return rep.status(200).send({
        ok: true,
      });
    } catch (err: any) {
      const isDev = process.env.NODE_ENV !== "production";
      const detail = err instanceof Error ? err.message : String(err);
      req.log?.error({ detail }, "/loginin failed");
      return rep.status(500).send({
        error: {
          code: "internal_error",
          message: "Login failed",
          ...(isDev ? { detail } : {}),
        },
      });
    }
  });
};

export default routes;

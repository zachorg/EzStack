import type { FastifyPluginAsync } from "fastify";
import { UserProfileDocument } from "../__generated__/documentTypes";
import type Stripe from "stripe";

// API key management routes: create/list/revoke. All routes rely on the auth
// plugin to populate req.userId and tenant authorization.
const routes: FastifyPluginAsync = async (app) => {
  const firebase = app.firebase;
  const db = firebase.db;
  const stripe = app.stripe as Stripe;

  app.get("/healthz", async (_req, rep) => {
    return rep.send({ ok: true });
  });

  app.post("/loginin", {}, async (req: any, rep) => {
    try {
      const jwtAuthToken = req.headers["authorization"] as string;
      const authToken = jwtAuthToken.startsWith("Bearer ")
        ? jwtAuthToken.slice(7).trim()
        : null;
      if (!authToken) {
        return rep.status(401).send({ error: { message: "Invalid token" } });
      }

      // Verify the Firebase ID token
      const decodedToken = await firebase.auth.verifyIdToken(authToken);
      const uid = decodedToken.uid;
      const email = decodedToken.email;

      const userRecord = await firebase.auth.getUser(uid);

      // Create or update user document in Firestore
      const userRef = db.collection("users").doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        const customer = await stripe.customers.create({
          email: userRecord.email,
          phone: userRecord.phoneNumber,
          name: userRecord.displayName,
        });

        // create otp send subscription
        await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: "price_1SNdk2AZqNXFtPMLegnBzCER" }],
        });

        // create otp verify subscription
        await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: "price_1SNduqAZqNXFtPMLmUlf0fIQ" }],
        });

        // Create new user document
        await userRef.set({
          id: uid,
          email: email,
          status: "active",
          projects: {},
          stripe_customer_id: customer.id,
          created_at: new Date().toLocaleDateString(),
          updated_at: new Date().toLocaleDateString(),
          last_login: new Date().toLocaleDateString(),
        } as UserProfileDocument);
      } else {
        // Update existing user
        await userRef.update({
          updated_at: new Date().toLocaleDateString(),
          last_login: new Date().toLocaleDateString(),
        } as Pick<UserProfileDocument, "updated_at" | "last_login">);
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

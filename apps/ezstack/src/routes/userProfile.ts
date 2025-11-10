import type { FastifyPluginAsync } from "fastify";
import { UserProfileDocument } from "../__generated__/documentTypes.js";
import type Stripe from "stripe";
import { CreateUserProfileRequest } from "../__generated__/requestTypes.js";
import { validateOrganizationName } from "../utils/organization-validator.js";

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
          items: [
            // sms send otp
            { price: "price_1SNdk2AZqNXFtPMLegnBzCER" },
            // email send otp
            { price: "price_1SPvyUAZqNXFtPMLYYL8MYaS" },
            // verify otp
            { price: "price_1SPwBHAZqNXFtPMLUrLXDACw" },
          ],
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

  app.post("/update", {}, async (req: any, rep) => {
    try {
      const jwtAuthToken = req.headers["authorization"] as string;
      const authToken = jwtAuthToken.startsWith("Bearer ")
        ? jwtAuthToken.slice(7).trim()
        : null;
      if (!authToken) {
        return rep.status(401).send({ error: { message: "Invalid token" } });
      }

      const request = req.body as CreateUserProfileRequest;
      if (!request.organization_name) {
        return rep
          .status(400)
          .send({ error: { message: "Organization name is required" } });
      }

      // Validate organization name to prevent fraudulent names
      const validation = validateOrganizationName(request.organization_name);
      if (!validation.isValid) {
        return rep
          .status(400)
          .send({ error: { message: validation.error } });
      }

      // Verify the Firebase ID token
      const decodedToken = await firebase.auth.verifyIdToken(authToken);
      const uid = decodedToken.uid;

      // Create or update user document in Firestore
      const userRef = db.collection("users").doc(uid);

      // Update existing user
      await userRef.update({
        updated_at: new Date().toLocaleDateString(),
        last_login: new Date().toLocaleDateString(),
        user_info: {
          organization_name: request.organization_name,
        },
      } as Pick<UserProfileDocument, "updated_at" | "last_login" | "user_info">);

      return rep.status(200).send({
        ok: true,
      });
    } catch (err: any) {
      const isDev = process.env.NODE_ENV !== "production";
      const detail = err instanceof Error ? err.message : String(err);
      req.log?.error({ detail }, "/create-or-update failed");
      return rep.status(500).send({
        error: {
          code: "internal_error",
          message: "Create or update user profile failed",
          ...(isDev ? { detail } : {}),
        },
      });
    }
  });

  app.get("/get", {}, async (req: any, rep) => {
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

      // Create or update user document in Firestore
      const userRef = db.collection("users").doc(uid);

      // Get existing user
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return rep.status(404).send({ error: { message: "User not found" } });
      }
      const userData = userDoc.data() as UserProfileDocument;
      return rep.status(200).send({
        ok: true,
        user_info: userData.user_info || null,
      });
    } catch (err: any) {
      const isDev = process.env.NODE_ENV !== "production";
      const detail = err instanceof Error ? err.message : String(err);
      req.log?.error({ detail }, "/get failed");
      return rep.status(500).send({
        error: {
          code: "internal_error",
          message: "Get user profile failed",
          ...(isDev ? { detail } : {}),
        },
      });
    }
  });
};

export default routes;

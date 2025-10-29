import type { FastifyPluginAsync } from "fastify";
import { UserProfileDocument } from "../__generated__/documentTypes";
import type Stripe from "stripe";
import {
  BillingSetupResponse,
  BillingUpdateResponse,
} from "../__generated__/responseTypes";
import { BillingUpdateRequest } from "../__generated__/requestTypes";

// API key management routes: create/list/revoke. All routes rely on the auth
// plugin to populate req.userId and tenant authorization.
const routes: FastifyPluginAsync = async (app) => {
  const firebase = app.firebase;
  const db = firebase.db;
  const stripe = app.stripe as Stripe;

  app.get("/healthz", async (_req, rep) => {
    return rep.send({ ok: true });
  });

  app.post(
    "/update-payment-method",
    { preHandler: [app.rlPerRoute(10)] },
    async (req: any, rep) => {
      try {
        const userId = req.userId as string | undefined;
        const request = req.body as BillingUpdateRequest;
        if (!userId || !request.stripe_payment_method_id) {
          return rep
            .status(500)
            .send({ error: { message: "Unauthenticated" } });
        }

        // Create or update user document in Firestore
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          return rep.status(404).send({ error: { message: "User not found" } });
        }

        const userData = userDoc.data() as UserProfileDocument;
        if (!userData) {
          return rep.status(404).send({ error: { message: "User not found" } });
        }

        await stripe.customers.update(userData.stripe_customer_id, {
          invoice_settings: {
            default_payment_method: request.stripe_payment_method_id,
          },
        });

        return rep.status(200).send({
          ok: true,
        } as BillingUpdateResponse);
      } catch (err: any) {
        const isDev = process.env.NODE_ENV !== "production";
        const detail = err instanceof Error ? err.message : String(err);
        req.log?.error({ detail }, "/billing/update-payment-method failed");
        return rep.status(500).send({
          error: {
            code: "internal_error",
            message: "Billing update payment method failed",
            ...(isDev ? { detail } : {}),
          },
        });
      }
    }
  );

  app.get(
    "/setup-intent",
    { preHandler: [app.rlPerRoute(10)] },
    async (req: any, rep) => {
      try {
        const userId = req.userId as string | undefined;
        if (!userId) {
          return rep
            .status(401)
            .send({ error: { message: "Unauthenticated" } });
        }

        // Create or update user document in Firestore
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          return rep.status(404).send({ error: { message: "User not found" } });
        }

        const userData = userDoc.data() as UserProfileDocument;
        const setupIntent = await stripe.setupIntents.create({
          customer: userData.stripe_customer_id,
          payment_method_types: ["card", "us_bank_account"], // or ['us_bank_account'] for ACH
        });

        if (!setupIntent) {
          return rep
            .status(500)
            .send({ error: { message: "Failed to create setup intent" } });
        }

        return rep.status(200).send({
          ok: true,
          stripe_setup_intent_client_secret: setupIntent.client_secret,
        } as BillingSetupResponse);
      } catch (err: any) {
        const isDev = process.env.NODE_ENV !== "production";
        const detail = err instanceof Error ? err.message : String(err);
        req.log?.error({ detail }, "/billing/setup-intent failed");
        return rep.status(500).send({
          error: {
            code: "internal_error",
            message: "Billing setup intent failed",
            ...(isDev ? { detail } : {}),
          },
        });
      }
    }
  );

  app.get(
    "/is-subscribed",
    { preHandler: [app.rlPerRoute(10)] },
    async (req: any, rep) => {
      try {
        const userId = req.userId as string | undefined;
        if (!userId) {
          return rep
            .status(401)
            .send({ error: { message: "Unauthenticated" } });
        }

        // Create or update user document in Firestore
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          return rep.status(500).send({ error: { message: "User not found" } });
        }

        const userData = userDoc.data() as UserProfileDocument;

        let stripeCustomerId = userData.stripe_customer_id;
        if (!stripeCustomerId) {
          const userRecord = await firebase.auth.getUser(userId);
          if (!userRecord) {
            return rep
              .status(500)
              .send({ error: { message: "User not found" } });
          }

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

          // Update existing user
          await userRef.update({
            stripe_customer_id: customer.id,
            updated_at: new Date().toLocaleDateString(),
          } as Pick<UserProfileDocument, "stripe_customer_id" | "updated_at">);

          stripeCustomerId = customer.id;
        }

        // Check if the Stripe customer already has a valid default payment method
        const customer = await stripe.customers.retrieve(stripeCustomerId, {
          expand: ["invoice_settings.default_payment_method"],
        });

        let hasValidPaymentMethod = false;

        if ((customer as any).deleted !== true) {
          const nonDeletedCustomer = customer as Stripe.Customer;

          const defaultPm = nonDeletedCustomer.invoice_settings
            ?.default_payment_method as Stripe.PaymentMethod | null | undefined;

          const now = new Date();

          const isCardValid = (pm: Stripe.PaymentMethod | null | undefined) => {
            if (!pm || pm.type !== "card") return false;
            const expMonth = pm.card?.exp_month;
            const expYear = pm.card?.exp_year;
            if (!expMonth || !expYear) return false;
            const expDate = new Date(Number(expYear), Number(expMonth) - 1, 1);
            // Card valid if expiration month/year not in the past (use end of month logic by adding 1 month and comparing > now)
            const endOfExpMonth = new Date(
              expDate.getFullYear(),
              expDate.getMonth() + 1,
              0,
              23,
              59,
              59,
              999
            );
            return endOfExpMonth >= now;
          };

          const isBankValid = (pm: Stripe.PaymentMethod | null | undefined) => {
            // Stripe's PaymentMethod.us_bank_account does not expose a verification status on the type.
            // Treat presence of an attached US bank account payment method as valid for billing purposes.
            return !!pm && pm.type === "us_bank_account";
          };

          if (isCardValid(defaultPm) || isBankValid(defaultPm)) {
            hasValidPaymentMethod = true;
          } else {
            // Fallback: check any attached cards or verified bank accounts
            const [cards, banks] = await Promise.all([
              stripe.paymentMethods.list({
                customer: nonDeletedCustomer.id,
                type: "card",
                limit: 5,
              }),
              stripe.paymentMethods.list({
                customer: nonDeletedCustomer.id,
                type: "us_bank_account",
                limit: 5,
              }),
            ]);

            const anyValidCard = cards.data.some((pm) => isCardValid(pm));
            const anyVerifiedBank = banks.data.some((pm) => isBankValid(pm));
            hasValidPaymentMethod = anyValidCard || anyVerifiedBank;
          }
        }

        return rep.status(200).send({
          has_valid_payment_method: hasValidPaymentMethod,
        });
      } catch (err: any) {
        const isDev = process.env.NODE_ENV !== "production";
        const detail = err instanceof Error ? err.message : String(err);
        req.log?.error({ detail }, "/billing/is-suscribed failed");
        return rep.status(500).send({
          error: {
            code: "internal_error",
            message: "Billing check payment method failed",
            ...(isDev ? { detail } : {}),
          },
        });
      }
    }
  );
};

export default routes;

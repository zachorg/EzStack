import { Firestore } from "firebase-admin/firestore";
import { EzAuthAnalyticsDocument } from "../__generated__/documentTypes.js";
import { Stripe } from "stripe";
import { EzAuthSendResponse } from "../__generated__/responseTypes.js";
import { hashApiKey } from "../utils/crypto.js";

export const kSendOtpUsageByProject = (
  apikeyPepper: string,
  userId: string,
  projectId: string
) => hashApiKey(`${userId}:${projectId}`, apikeyPepper);
export const kSendOtpUsageByKey = (
  apikeyPepper: string,
  userId: string,
  projectId: string,
  keyId: string
) => hashApiKey(`${userId}:${projectId}:${keyId}`, apikeyPepper);

async function update_topdown_analytics_send_otp(db: Firestore, sms: boolean) {
  if (!db) {
    throw new Error("Firebase firestore not initialized");
  }

  const dateKey = new Date().toISOString().substring(0, 7); // YYYY-MM format
  const usageRef = db.doc(`analytics/ezauth/topdown/${dateKey}`);

  await db.runTransaction(async (transaction) => {
    const usageDoc = await transaction.get(usageRef);

    // Omit the monthly requests from the analytics document
    let data: Omit<EzAuthAnalyticsDocument, "sms_send_otp_completed_monthly_requests" | "email_send_otp_completed_monthly_requests" | "verify_otp_completed_monthly_requests"> = {
      sms_send_otp_completed_requests: 0,
      email_send_otp_completed_requests: 0,
      verify_otp_completed_requests: 0,
    };
    if (usageDoc.exists) {
      data = usageDoc.data() as EzAuthAnalyticsDocument;
    }

    const key = sms
      ? "sms_send_otp_completed_requests"
      : "email_send_otp_completed_requests";
    const send_otp_completed_requests = data[key];
    transaction.set(
      usageRef,
      {
        ...data,
        [key]: send_otp_completed_requests + 1,
      },
      { merge: true }
    );
  });
}

async function update_topdown_analytics_verify_otp(db: Firestore) {
  if (!db) {
    throw new Error("Firebase firestore not initialized");
  }

  const dateKey = new Date().toISOString().substring(0, 7); // YYYY-MM format
  const usageRef = db.doc(`analytics/ezauth/topdown/${dateKey}`);

  await db.runTransaction(async (transaction) => {
    const usageDoc = await transaction.get(usageRef);

    let data: Omit<EzAuthAnalyticsDocument, "sms_send_otp_completed_monthly_requests" | "email_send_otp_completed_monthly_requests" | "verify_otp_completed_monthly_requests"> = {
      sms_send_otp_completed_requests: 0,
      email_send_otp_completed_requests: 0,
      verify_otp_completed_requests: 0,
    };
    if (usageDoc.exists) {
      data = usageDoc.data() as EzAuthAnalyticsDocument;
    }

    const verify_otp_completed_requests = data.verify_otp_completed_requests;
    transaction.set(
      usageRef,
      {
        ...data,
        verify_otp_completed_requests: verify_otp_completed_requests + 1,
      },
      { merge: true }
    );
  });
}

export async function check_and_increment_otp_send_usage(
  trySendOtp: () => Promise<EzAuthSendResponse>,
  sms: boolean,
  db: Firestore,
  stripe: Stripe,
  usage_key_lookup_id: string,
  stripe_customer_id: string,
  request_limits?: {
    max_free_requests_per_month?: number;
  }
): Promise<EzAuthSendResponse | undefined> {
  if (!db) {
    throw new Error("Firebase firestore not initialized");
  }

  const usageRef = db.doc(`analytics/ezauth/otp/${usage_key_lookup_id}`);

  const result: EzAuthSendResponse | undefined = await db.runTransaction(
    async (transaction) => {
      const dateKey = new Date().toISOString().substring(0, 7); // YYYY-MM format

      const usageDoc = await transaction.get(usageRef);

      let data: EzAuthAnalyticsDocument = {
        sms_send_otp_completed_monthly_requests: {},
        sms_send_otp_completed_requests: 0,
        email_send_otp_completed_monthly_requests: {},
        email_send_otp_completed_requests: 0,
        verify_otp_completed_monthly_requests: {},
        verify_otp_completed_requests: 0,
      };
      if (usageDoc.exists) {
        data = usageDoc.data() as EzAuthAnalyticsDocument;
      }

      const key = sms
        ? "sms_send_otp_completed_requests"
        : "email_send_otp_completed_requests";
      const key_monthly = sms
        ? "sms_send_otp_completed_monthly_requests"
        : "email_send_otp_completed_monthly_requests";

      const completed_requests = data[key];
      const completed_monthly_requests = data[key_monthly];
      const currentCount = completed_monthly_requests[dateKey] || 0;

      let should_charge: boolean = false;
      if (
        request_limits?.max_free_requests_per_month &&
        currentCount >= request_limits.max_free_requests_per_month
      ) {
        should_charge = true;
      }

      const requestId = await trySendOtp();

      if (should_charge) {
        const eventName = sms ? "sms_otp_send_api_requests" : "email_otp_send_api_requests";
        await stripe.billing.meterEvents.create({
          event_name: eventName, // your meter name from Stripe dashboard
          payload: {
            value: "1", // usage amount
            stripe_customer_id: stripe_customer_id, // target customer
          },
        });
      }

      transaction.set(
        usageRef,
        {
          ...data,
          [key]: completed_requests + 1,
          [key_monthly]: {
            ...completed_monthly_requests,
            [dateKey]: currentCount + 1,
          },
        } as EzAuthAnalyticsDocument,
        { merge: true }
      );

      // no need to wait for this to complete
      update_topdown_analytics_send_otp(db, sms);

      return requestId;
    }
  );

  return result;
}

export async function check_and_increment_otp_verify_usage(
  db: Firestore,
  stripe: Stripe,
  usage_key_lookup_id: string,
  stripe_customer_id: string,
  request_limits?: {
    max_free_requests_per_month?: number;
  }
): Promise<void> {
  if (!db) {
    throw new Error("Firebase firestore not initialized");
  }

  const usageRef = db.doc(`analytics/ezauth/otp/${usage_key_lookup_id}`);

  await db.runTransaction(async (transaction) => {
    const dateKey = new Date().toISOString().substring(0, 7); // YYYY-MM format

    const usageDoc = await transaction.get(usageRef);

    let data: EzAuthAnalyticsDocument = {
      sms_send_otp_completed_monthly_requests: {},
      sms_send_otp_completed_requests: 0,
      email_send_otp_completed_monthly_requests: {},
      email_send_otp_completed_requests: 0,
      verify_otp_completed_monthly_requests: {},
      verify_otp_completed_requests: 0,
    };
    if (usageDoc.exists) {
      data = usageDoc.data() as EzAuthAnalyticsDocument;
    }

    const completed_requests = data.verify_otp_completed_requests;
    const completed_monthly_requests =
      data.verify_otp_completed_monthly_requests;
    const currentCount = completed_monthly_requests[dateKey] || 0;

    let should_charge: boolean = false;
    if (
      request_limits?.max_free_requests_per_month &&
      currentCount >= request_limits.max_free_requests_per_month
    ) {
      should_charge = true;
    }

    try {
      if (should_charge) {
        await stripe.billing.meterEvents.create({
          event_name: "otp_verify_api_request", // your meter name from Stripe dashboard
          payload: {
            value: "1", // usage amount
            stripe_customer_id: stripe_customer_id, // target customer
          },
        });
      }

      transaction.set(
        usageRef,
        {
          ...data,
          verify_otp_completed_requests: completed_requests + 1,
          verify_otp_completed_monthly_requests: {
            ...completed_monthly_requests,
            [dateKey]: currentCount + 1,
          },
        } as EzAuthAnalyticsDocument,
        { merge: true }
      );
      // no need to wait for this to complete
      update_topdown_analytics_verify_otp(db);
    } catch (error) {
      throw new Error("Failed to verify OTP");
    }
  });
}

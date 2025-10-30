"use client";

import {
  BillingIsSuscribedResponse,
  BillingSetupResponse,
  BillingUpdateResponse,
} from "@/__generated__/responseTypes";
import { ezstack_api_fetch } from "@/lib/api/client";
import stripe from "@/lib/stripe";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthProvider";
import { StripeCardElement } from "@stripe/stripe-js";
import { BillingUpdateRequest } from "@/__generated__/requestTypes";

// Types
export type BillingPlan = {
  name: string; // e.g., "Pay-as-you-go"
  description?: string;
  interval?: "month";
  currency?: string; // e.g., "usd"
  isActive: boolean;
};

export type Invoice = {
  id: string;
  name: string; // e.g., invoice number or generated label
  createdAt: string; // ISO date string
  amountCents: number;
  currency: string; // e.g., "usd"
  status: "paid" | "open" | "void" | "uncollectible" | "refunded";
};

export type BillingData = {
  plan: BillingPlan | null; // null means no subscription yet
  invoices: Invoice[];
};

type BillingContextValue = {
  data: BillingData | null;
  loading: boolean;
  error: string | null;
  subscribe: (cardElement: StripeCardElement) => Promise<void>;
};

const BillingContext = createContext<BillingContextValue | undefined>(
  undefined
);

export type BillingProviderProps = {
  children?: React.ReactNode;
  initialData?: BillingData; // optional SSR hydrate or test data
};

export function BillingProvider({
  children,
  initialData,
}: BillingProviderProps) {
  const [data, setData] = useState<BillingData | null>(initialData ?? null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchBillingData = async () => {
      if (!isAuthenticated) {
        return;
      }
      setLoading(true);
      try {
        const response = await ezstack_api_fetch<BillingIsSuscribedResponse>(
          "/api/v1/user/billing/is-subscribed",
          {
            method: "GET",
          }
        );
        console.log("BillingProvider: fetchBillingData: response", response);
        if (!response.has_valid_payment_method) {
          // throw new Error(`User does not have a valid payment method to subscribe`);
          return {
            plan: null,
            invoices: [],
          } as BillingData;
        }

        setData({
          plan: {
            name: "Pay-as-you-go",
            description: "Pay-as-you-go",
            interval: "month",
            currency: "usd",
            isActive: true,
          },
          invoices: [],
        } as BillingData);
      } catch (_err) {
        setData({
          plan: null,
          invoices: [],
        } as BillingData);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const subscribe = useCallback(
    async (cardElement: StripeCardElement) => {
      if (!stripe) {
        throw new Error("Stripe not initialized");
      }
      if (!isAuthenticated) {
        throw new Error("User not authenticated");
      }
      setLoading(true);
      setError(null);
      try {
        const billingSetupResponse =
          await ezstack_api_fetch<BillingSetupResponse>(
            "/api/v1/user/billing/setup-intent",
            {
              method: "GET",
            }
          );
        if (!billingSetupResponse.ok) {
          throw new Error(`Subscribe failed with status`);
        }

        const result = await stripe.confirmCardSetup(
          billingSetupResponse.stripe_setup_intent_client_secret,
          {
            payment_method: {
              card: cardElement,
              billing_details: { name: user?.displayName, email: user?.email },
            },
          }
        );

        if (result.error) {
          throw new Error(`Failed to subscribe: ${result.error.message}`);
        }

        console.log("BillingProvider: subscribe: result", result);

        const billingUpdateResponse =
          await ezstack_api_fetch<BillingUpdateResponse>(
            "/api/v1/user/billing/update-payment-method",
            {
              method: "POST",
              body: JSON.stringify({
                stripe_payment_method_id: result.setupIntent?.payment_method,
              } as BillingUpdateRequest),
            }
          );
        if (!billingUpdateResponse.ok) {
          throw new Error(`Failed to update payment method.`);
        }

        setData({
          plan: {
            name: "Pay-as-you-go",
            description: "Pay-as-you-go",
            interval: "month",
            currency: "usd",
            isActive: true,
          },
          invoices: data?.invoices ?? [],
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message || "Failed to load billing data");
      }
      setLoading(false);
    },
    [user, isAuthenticated]
  );

  const value = useMemo<BillingContextValue>(
    () => ({ data, loading, error, subscribe }),
    [data, loading, error, subscribe]
  );

  return (
    <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
  );
}

export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error("useBilling must be used within a BillingProvider");
  return ctx;
}

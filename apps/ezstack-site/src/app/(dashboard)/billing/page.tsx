"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useBilling } from "@/app/components/BillingProvider";
import { PAGE_SECTIONS } from "@/app/pageSections";
import { useSidebar } from "@/app/components/SidebarProvider";
import stripe from "@/lib/stripe";
import type { StripeCardElement } from "@stripe/stripe-js";

function formatCurrency(amountCents: number, currency: string | undefined) {
  try {
    const formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: (currency || "usd").toUpperCase(),
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format((amountCents || 0) / 100);
  } catch {
    return `${(amountCents || 0) / 100} ${currency || "USD"}`;
  }
}

export default function BillingPage() {
  const { data, loading, error, subscribe } = useBilling();
  const { setSections } = useSidebar();

  const invoices = useMemo(() => data?.invoices ?? [], [data]);
  const plan = data?.plan ?? null;
  const [showCard, setShowCard] = useState(false);
  const cardRef = useRef<StripeCardElement | null>(null);

  useEffect(() => {
    const dashboardSections = [
      {
        title: "",
        items: [
          PAGE_SECTIONS({ resolvedParams: { projectname: "" } }).projects,
          PAGE_SECTIONS({ resolvedParams: { projectname: "" } }).billing,
        ],
      },
    ];

    setSections(dashboardSections);
  }, [setSections]);

  // Mount/unmount Stripe Element when card modal toggles
  useEffect(() => {
    if (!showCard) {
      cardRef.current?.unmount?.();
      cardRef.current = null;
      return;
    }
    const elements = stripe?.elements();
    if (!elements) return;
    const card = elements.create("card", {
      hidePostalCode: true,
      style: {
        base: { color: "#e5e7eb", fontFamily: "inherit", fontSize: "16px" },
        invalid: { color: "#fca5a5" },
      },
    });
    cardRef.current = card;
    card.mount("#card-element");
    return () => {
      cardRef.current?.unmount?.();
      cardRef.current = null;
    };
  }, [showCard]);

  const handleSubscribeClick = () => {
    setShowCard(true);
  };

  const handleConfirmSubscribe = async () => {
    if (!cardRef.current) return;
    // Pass the card element to the subscribe hook
    await (subscribe as unknown as (card: StripeCardElement) => void)(cardRef.current);
    setShowCard(false);
  };

  const handleCloseCard = () => setShowCard(false);

  return (
    <>
    <div className="px-6 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="mt-3 md:mt-4">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white">Billing</h1>
        </header>

        {loading && (
          <div className="text-sm text-neutral-400">Loading billing information…</div>
        )}

        {/* {error && (
          <div className="text-sm text-red-400">
            {error}
            <button onClick={refresh} className="ml-2 underline underline-offset-2">Retry</button>
          </div>
        )} */}

        {/* Subscription Section */}
        <section className="space-y-3">
          <div className="grid gap-6 md:grid-cols-[1fr_minmax(220px,360px)] items-start">
            <div>
              <h2 className="text-base md:text-lg font-semibold text-white">Subscription plan</h2>
              <p className="mt-1 text-sm text-neutral-400">Manage your EzStack plan and billing status.</p>
            </div>

            <aside className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Current plan</span>
                  <span className={"text-xs px-2 py-0.5 rounded-full " + (plan?.isActive ? "bg-emerald-900/30 text-emerald-300" : "bg-neutral-800 text-neutral-300") }>
                    {plan?.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-neutral-200">{plan?.name || "None"}</div>
                  {(!plan || !plan.isActive) && (
                    <button
                      type="button"
                      onClick={handleSubscribeClick}
                      className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                    >
                      Subscribe
                    </button>
                  )}
                </div>
                {plan?.interval && plan?.currency ? (
                  <div className="text-sm text-neutral-400">
                    Billed {plan.interval} • Currency {plan.currency.toUpperCase()}
                  </div>
                ) : (
                  <div className="text-sm text-neutral-400"></div>
                )}
              </div>
            </aside>
          </div>
        </section>

        {/* Invoices Section */}
        <section className="space-y-3">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-white">Invoices</h2>
            <p className="mt-1 text-sm text-neutral-400">Your billing history sorted by most recent first.</p>
          </div>

          <div className="rounded-lg border border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-neutral-900/60 text-neutral-300">
                  <tr className="divide-x divide-neutral-800">
                    <th className="px-3 py-2 font-semibold">Name</th>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Amount</th>
                    <th className="px-3 py-2 font-semibold">Payment status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-neutral-400">No invoices yet.</td>
                    </tr>
                  )}
                  {invoices.map((inv) => {
                    const date = new Date(inv.createdAt);
                    const dateText = isNaN(date.getTime()) ? inv.createdAt : date.toLocaleDateString();
                    const amountText = formatCurrency(inv.amountCents, inv.currency);
                    const paid = inv.status === "paid";
                    return (
                      <tr key={inv.id} className="divide-x divide-neutral-800">
                        <td className="px-3 py-2 text-neutral-200">{inv.name}</td>
                        <td className="px-3 py-2 text-neutral-200">{dateText}</td>
                        <td className="px-3 py-2 text-neutral-200">{amountText}</td>
                        <td className="px-3 py-2">
                          <span className={"text-xs px-2 py-0.5 rounded-full " + (paid ? "bg-emerald-900/30 text-emerald-300" : "bg-amber-900/30 text-amber-300") }>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  {showCard && (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={handleCloseCard} />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-white">Enter payment details</h3>
        <div id="card-element" className="rounded-md border border-neutral-800 bg-neutral-950 p-3" />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCloseCard}
            className="inline-flex items-center rounded-md bg-neutral-800 px-3 py-1.5 text-sm font-medium text-neutral-200 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmSubscribe}
            className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )}
  </>
  );
}



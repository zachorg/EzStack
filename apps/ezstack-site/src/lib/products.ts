// Product tiles drive the "Bento" grid on the homepage.
// Adding a new tile here automatically updates the UI.
import type { ComponentType } from "react";
import { type LucideIcon, ShieldCheck, CreditCard, LineChart } from "lucide-react";

export type ProductTile = {
  slug: "ezauth" | "ezpayments" | "ezanalytics" | string;
  title: string;
  status: "available" | "coming_soon";
  description: string;
  bullets: string[];
  icon: LucideIcon | ComponentType<Record<string, unknown>>;
  primaryHref: string; // docs
  secondaryHref?: string; // start / sign in
  span?: "wide" | "tall" | "square";
};

export const productTiles: ProductTile[] = [
  {
    slug: "ezauth",
    title: "EzAuth",
    status: "available",
    description: "OTP & email codes in minutes.",
    bullets: ["OTP/OTE in one call", "Idempotent sends", "Rate-limit headers"],
    icon: ShieldCheck,
    primaryHref: "/docs/ezauth/overview",
    secondaryHref: "/dashboard/api-keys",
    span: "wide",
  },
  {
    slug: "ezpayments",
    title: "EzPayments",
    status: "coming_soon",
    description: "Take money, not months.",
    bullets: ["Hosted flows", "Webhooks", "Fraud tools"],
    icon: CreditCard,
    primaryHref: "/docs/ezpayments",
    span: "square",
  },
  {
    slug: "ezanalytics",
    title: "EzAnalytics",
    status: "coming_soon",
    description: "Usage insights & alerts.",
    bullets: ["Live charts", "Threshold alerts", "Exports"],
    icon: LineChart,
    primaryHref: "/docs/ezanalytics",
    span: "square",
  },
];



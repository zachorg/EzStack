// Product tiles drive the "Bento" grid on the homepage.
// Adding a new tile here automatically updates the UI.
import type { ComponentType } from "react";
import { type LucideIcon, ShieldCheck, MessageSquare } from "lucide-react";

export type ProductTile = {
  slug: "ezauth" | "ezsms" | string;
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
    description: "OTP codes via email or SMS in minutes.",
    bullets: ["Email & SMS delivery", "Built-in rate limiting", "Simple API integration"],
    icon: ShieldCheck,
    primaryHref: "/docs",
    secondaryHref: "/account",
    span: "wide",
  },
  {
    slug: "ezsms",
    title: "EzSms",
    status: "coming_soon",
    description: "SMS messaging made simple.",
    bullets: ["Bulk messaging", "Templates", "Delivery tracking"],
    icon: MessageSquare,
    primaryHref: "/docs/ezsms",
    span: "square",
  },
];



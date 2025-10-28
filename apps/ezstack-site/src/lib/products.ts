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
  span?: "wide" | "tall" | "square";
};

export const productTiles: ProductTile[] = [
  {
    slug: "ezauth",
    title: "EzAuth",
    status: "available",
    description: "OTP codes via email or SMS in seconds.",
    bullets: ["Email & SMS delivery", "Built-in rate limiting", "Simple API integration"],
    icon: ShieldCheck,
    span: "wide",
  },
  {
    slug: "ezsms",
    title: "EzSms",
    status: "coming_soon",
    description: "SMS messaging made simple.",
    bullets: ["Bulk messaging", "Templates", "Delivery tracking"],
    icon: MessageSquare,
    span: "square",
  },
];



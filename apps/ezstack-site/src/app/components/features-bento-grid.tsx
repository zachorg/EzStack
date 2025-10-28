"use client";

// Features bento grid for "Why EzStack" section
import { CheckCircle } from "lucide-react";

interface FeatureItem {
  title: string;
  description: string;
}

const features: FeatureItem[] = [
  {
    title: "Email & SMS delivery",
    description: "Send OTP codes via email or SMS with a simple API"
  },
  {
    title: "Built-in rate limiting",
    description: "Automatic throttling to prevent abuse and respect user preferences"
  },
  {
    title: "Per-destination rate limits",
    description: "Smart rate limiting per phone number or email address"
  },
  {
    title: "Standardized errors with Retry-After",
    description: "Clear error handling with automatic retry guidance"
  },
  {
    title: "Simple API integration",
    description: "Easy to integrate with comprehensive documentation"
  }
];

export function FeaturesBentoGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((feature, index) => (
        <div
          key={index}
          className="rounded-xl border border-black/[.08] dark:border-white/[.145] p-5 transition-transform hover:-translate-y-0.5"
        >
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" aria-hidden />
            <div>
              <h3 className="font-medium mb-1">{feature.title}</h3>
              <p className="text-sm text-foreground/75">{feature.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

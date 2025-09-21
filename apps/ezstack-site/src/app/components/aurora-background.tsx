"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

// Full-viewport animated gradient backdrop used across the homepage.
type AuroraBackgroundProps = {
  className?: string;
};

export function AuroraBackground({ className }: AuroraBackgroundProps) {
  const prefersReduced = useReducedMotion();
  return (
    <div className={cn("fixed inset-0 -z-10 pointer-events-none", className)} aria-hidden>
      <motion.div
        className="pointer-events-none absolute -inset-[40%] rounded-[9999px]"
        style={{
          background:
            "radial-gradient(60% 50% at 30% 40%, rgba(56,189,248,0.18) 0%, rgba(56,189,248,0) 60%), radial-gradient(50% 40% at 70% 60%, rgba(167,139,250,0.18) 0%, rgba(167,139,250,0) 60%), radial-gradient(40% 30% at 50% 50%, rgba(244,114,182,0.14) 0%, rgba(244,114,182,0) 60%)",
          filter: "blur(100px)",
          maskImage: "radial-gradient(60% 60% at 50% 50%, #000 60%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(60% 60% at 50% 50%, #000 60%, transparent 100%)",
          willChange: "transform, opacity",
        }}
        initial={{ opacity: 0.6, scale: 1 }}
        animate={prefersReduced ? undefined : { opacity: [0.6, 0.9, 0.6], scale: [1, 1.05, 1] }}
        transition={prefersReduced ? undefined : { duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}



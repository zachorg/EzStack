"use client";

import { cn } from "@/lib/utils";

// Full-viewport animated gradient backdrop used across the homepage.
type AuroraBackgroundProps = {
  className?: string;
};

export function AuroraBackground({ className }: AuroraBackgroundProps) {
  return (
    <div 
      className={cn("fixed inset-0 -z-10 pointer-events-none", className)} 
      style={{backgroundColor: '#181818'}}
      aria-hidden
    />
  );
}



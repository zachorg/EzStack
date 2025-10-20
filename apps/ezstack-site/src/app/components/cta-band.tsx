"use client";

// Final call-to-action band used at the bottom of the homepage.
import { useState } from "react";
import LoginDialog from "./LoginDialog";

export function CtaBand() {
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);

  return (
    <div className="rounded-xl border border-black/[.08] dark:border-white/[.145] p-6 text-center">
      <h3 className="text-xl font-semibold mb-2">Start free</h3>
      <p className="text-foreground/75 mb-4">Build and test without a credit card.</p>
      <button
        onClick={() => setIsLoginDialogOpen(true)}
        className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-foreground text-background cursor-pointer"
      >
        Get started
      </button>
      
      {/* Login Dialog */}
      <LoginDialog 
        isOpen={isLoginDialogOpen} 
        onClose={() => setIsLoginDialogOpen(false)}
      />
    </div>
  );
}



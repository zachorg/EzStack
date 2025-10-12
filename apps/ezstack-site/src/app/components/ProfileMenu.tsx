"use client";

import { useEffect, useRef, useState } from "react";
import { useLogin } from "./LoginContext";

// Type for session status response from API
type SessionStatus = { loggedIn: boolean; uid?: string };

export default function ProfileMenu() {
  const { openLoginDialog } = useLogin();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<SessionStatus>({ loggedIn: false });
  const [isLoading, setIsLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Fetch current session status on component mount
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/session/status", { cache: "no-store" });
        const data = (await res.json()) as SessionStatus;
        setStatus(data);
      } catch {}
      finally {
        setIsLoading(false);
      }
    }
    fetchStatus();
  }, []);

  // Handle clicks outside menu to close it
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // Sign out handler - ends session and redirects to home
  async function signOut() {
    try {
      // Clear server cookie and sign out of Firebase
      await fetch("/api/session/end", { method: "POST", credentials: "include" });
      window.location.assign("/");
    } catch {}
  }

  // Show loading state to prevent hydration mismatch
  if (isLoading) {
    return (
      <div className="flex gap-2">
        <div className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-white dark:border-white rounded-md opacity-50">
          Sign In
        </div>
        <div className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-white dark:border-white rounded-md opacity-50">
          Sign Up
        </div>
      </div>
    );
  }

  // If not logged in, show sign in and sign up buttons
  if (!status.loggedIn) {
    return (
      <div className="flex gap-2">
        <button
          onClick={openLoginDialog}
          className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border border-white dark:border-white hover:border-gray-300 dark:hover:border-gray-400 rounded-md transition-all duration-200 ease-in-out cursor-pointer"
        >
          Sign In
        </button>
        <button
          onClick={openLoginDialog}
          className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border border-white dark:border-white hover:border-gray-300 dark:hover:border-gray-400 rounded-md transition-all duration-200 ease-in-out cursor-pointer"
        >
          Sign Up
        </button>
      </div>
    );
  }

  // If logged in, show profile menu
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm px-3 py-1.5 border rounded cursor-pointer"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Profile
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-48 rounded border bg-background shadow"
        >
          <a
            href="/account"
            className="block px-4 py-2 text-sm hover:bg-gray-50"
            role="menuitem"
          >
            Account Settings
          </a>
          <button
            onClick={signOut}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer"
            role="menuitem"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

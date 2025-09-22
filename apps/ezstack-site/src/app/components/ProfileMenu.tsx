"use client";

import { useEffect, useRef, useState } from "react";

// Type for session status response from API
type SessionStatus = { loggedIn: boolean; uid?: string };

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<SessionStatus>({ loggedIn: false });
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Fetch current session status on component mount
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/session/status", { cache: "no-store" });
        const data = (await res.json()) as SessionStatus;
        setStatus(data);
      } catch {}
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

  // If not logged in, show sign in link
  if (!status.loggedIn) {
    return (
      <a
        href="/login"
        className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
      >
        Sign in / Create account
      </a>
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
            href="/api-keys"
            className="block px-4 py-2 text-sm hover:bg-gray-50"
            role="menuitem"
          >
            API Keys
          </a>
          <button
            onClick={signOut}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
            role="menuitem"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

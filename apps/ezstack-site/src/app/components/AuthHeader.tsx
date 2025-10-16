"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import LoginDialog from "./LoginDialog";

export default function AuthHeader() {
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  // Sign out handler - uses auth provider logout
  const handleSignOut = async () => {
    try {
      await logout();
      window.location.assign("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  // Show loading state to prevent hydration mismatch
  if (authLoading) {
    return <div className=""></div>;
  }

  // If not logged in, show sign in and sign up buttons
  if (!isAuthenticated && !isLoginDialogOpen) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => setIsLoginDialogOpen(true)}
          className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border border-white dark:border-white hover:border-gray-300 dark:hover:border-gray-400 rounded-md transition-all duration-200 ease-in-out cursor-pointer"
        >
          Sign In
        </button>
        <button
          onClick={() => setIsLoginDialogOpen(true)}
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
        className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border border-white dark:border-white hover:border-gray-300 dark:hover:border-gray-400 rounded-md transition-all duration-200 ease-in-out cursor-pointer"
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
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer"
            role="menuitem"
          >
            Sign out
          </button>
        </div>
      )}

      {/* Login Dialog */}
      <LoginDialog
        isOpen={isLoginDialogOpen}
        onClose={() => setIsLoginDialogOpen(false)}
      />
    </div>
  );
}

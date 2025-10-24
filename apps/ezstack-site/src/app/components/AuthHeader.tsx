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
      <div className="flex gap-1">
        <button
          onClick={() => setIsLoginDialogOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200"
          title="Sign In"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
        </button>
        <button
          onClick={() => setIsLoginDialogOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200"
          title="Sign Up"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </button>
      </div>
    );
  }

  // If logged in, show profile menu
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Profile"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-48 rounded border border-gray-700 bg-gray-900 shadow-lg z-50"
        >
          <a
            href="/account"
            className="block px-4 py-2 text-sm hover:bg-gray-800 text-gray-300 hover:text-white transition-colors duration-200"
            role="menuitem"
          >
            Account Settings
          </a>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-800 text-gray-300 hover:text-white cursor-pointer transition-colors duration-200"
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

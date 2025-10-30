"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { useLoginDialog } from "./LoginDialogProvider";

export function Taskbar() {
  const { isAuthenticated, isLoading: authLoading, logout, user } = useAuth();
  const { openDialog } = useLoginDialog();
  const [open, setOpen] = useState(false);
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

  // Sign out handler
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
    return null;
  }

  return (
    <header className="bg-transparent backdrop-blur-0 border-0 shadow-none flex items-center justify-between transition-all duration-300 ease-in-out h-12 w-full fixed left-0 top-0 z-40">
      <div style={{ marginLeft: '12px' }} />

      <div className="flex items-center pr-6">

        {/* Right side - User menu and notifications */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {/* Notifications */}
          {/* <button className="relative w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all duration-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5V3h4v14z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button> */}

          {/* User menu */}
          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-gray-800/50 transition-all duration-200"
                aria-haspopup="menu"
                aria-expanded={open}
              >
                <div className="w-6 h-6 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center shadow-sm">
                  <svg className="w-3 h-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="text-xs font-medium">User</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {open && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-700/50 bg-gray-900/95 backdrop-blur-sm shadow-xl z-50">
                  <div className="p-4 border-b border-gray-700/50">
                    <p className="text-xs text-gray-400">{user?.email}</p>
                  </div>
                  <div className="p-2">
                    <a
                      href="/account"
                      className="flex items-center px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Account Preferences
                    </a>
                    {/* <a
                      href="/billing"
                      className="flex items-center px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Billing
                    </a> */}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors text-left"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <button
                onClick={openDialog}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-all duration-200 rounded-xl hover:bg-gray-800/50"
              >
                Sign in
              </button>
              <button
                onClick={openDialog}
                className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:-translate-y-0.5"
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      </div>

    </header>
  );
}

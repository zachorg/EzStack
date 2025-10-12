"use client";

import React, { useEffect, useState, useCallback } from "react";
import { auth, googleProvider } from "@/lib/firebase/client";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup } from "firebase/auth";
import { useLogin } from "./LoginContext";

// Verbose logging utility
const log = (level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [LOGIN] [${level.toUpperCase()}] ${message}`;
  
  if (data) {
    console[level](logMessage, data);
  } else {
    console[level](logMessage);
  }
};

// User-friendly error message mapping
const getFirebaseErrorMessage = (error: unknown): string => {
  if (error && typeof error === "object" && "code" in error) {
    const firebaseError = error as { code: string };
    
    switch (firebaseError.code) {
      // Authentication errors
      case "auth/invalid-credential":
        return "Invalid email or password. Please check your credentials and try again.";
      case "auth/user-not-found":
        return "Account not found. Please create a new account or check your email address.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/user-disabled":
        return "This account has been disabled. Please contact support.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please wait a moment and try again.";
      case "auth/email-already-in-use":
        return "An account with this email already exists. Please sign in instead.";
      case "auth/weak-password":
        return "Password is too weak. Please choose a stronger password.";
      case "auth/operation-not-allowed":
        return "This sign-in method is not enabled. Please try another method.";
      
      // Network and system errors
      case "auth/network-request-failed":
        return "Network error. Please check your connection and try again.";
      case "auth/internal-error":
        return "An internal error occurred. Please try again.";
      case "auth/popup-closed-by-user":
        return "Sign-in was cancelled. Please try again.";
      case "auth/popup-blocked":
        return "Pop-up was blocked by your browser. Please allow pop-ups and try again.";
      case "auth/cancelled-popup-request":
        return "Sign-in was cancelled. Please try again.";
      case "auth/timeout":
        return "Request timed out. Please try again.";
      
      // Default fallback
      default:
        return "An error occurred during authentication. Please try again.";
    }
  }
  
  // If it's a regular Error object, return its message
  if (error instanceof Error) {
    return error.message;
  }
  
  // Final fallback
  return "An unexpected error occurred. Please try again.";
};

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginDialog({ isOpen, onClose }: LoginDialogProps) {
  const { redirect } = useLogin();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Enhanced close handler that also clears redirect
  const handleClose = useCallback(() => {
    setLoading(false);
    setMessage(null);
    setEmail("");
    setPassword("");
    onClose();
  }, [onClose]);

  // Handle escape key and click outside to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleClose]);

  // Reset dialog state when it closes
  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      setMessage(null);
      setEmail("");
      setPassword("");
    }
  }, [isOpen]);

  // Sign in with Google using Firebase Auth (popup flow).
  async function signInWithGoogleWithPopup() {
    try {
      setLoading(true);
      setMessage(null);

      if (!auth || !googleProvider) {
        log("error", "Firebase authentication not configured", {
          authAvailable: !!auth,
          googleProviderAvailable: !!googleProvider,
        });
        setMessage("Firebase authentication not configured");
        setLoading(false);
        return;
      }
    
      // Use popup instead of redirect for better reliability
      const result = await signInWithPopup(auth, googleProvider);

      if (result && result.user) {
        const user = result.user;
        const idToken = await user.getIdToken();
        // Send token to our session endpoint
        const response = await fetch("/api/session/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        
        if (response.ok) {
          // Sign out from Firebase to prevent persistent Google session
          await signOut(auth);
          
          const redirectUrl = redirect || "/";
          window.location.href = redirectUrl;
        } else {
          const error = await response.json();
          log('error', 'Session creation failed', { 
            status: response.status, 
            error: error 
          });
          setMessage(error.message || "Session creation failed");
        }
      }
    } catch (error: unknown) {
      log('error', 'Google sign-in failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setMessage(getFirebaseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  // Create an account with email/password and start a session.
  async function signUpWithEmailPassword() {
    setLoading(true);
    setMessage(null);
    
    if (!auth) {
      log('error', 'Firebase authentication not configured for sign-up');
      setMessage("Firebase authentication not configured");
      setLoading(false);
      return;
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      const idToken = await user.getIdToken();
      // Send token to our session endpoint
      const response = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      
      
      if (response.ok) {
        const redirectUrl = redirect || "/";
        window.location.href = redirectUrl;
      } else {
        const error = await response.json();
        log('error', 'Session creation failed after account creation', { 
          status: response.status, 
          error: error 
        });
        setMessage(error.message || "Session creation failed");
      }
    } catch (e) {
      log('error', 'Account creation failed', { 
        error: e instanceof Error ? e.message : 'Unknown error',
        stack: e instanceof Error ? e.stack : undefined,
        email: email.trim()
      });
      setMessage(getFirebaseErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  // Sign in with email/password and start a session.
  async function signInWithEmailPassword() {
    setLoading(true);
    setMessage(null);
    
    if (!auth) {
      log('error', 'Firebase authentication not configured for sign-in');
      setMessage("Firebase authentication not configured");
      setLoading(false);
      return;
    }
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      const idToken = await user.getIdToken();
      // Send token to our session endpoint
      const response = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      
      
      if (response.ok) {
        const redirectUrl = redirect || "/";
        window.location.href = redirectUrl;
      } else {
        const error = await response.json();
        log('error', 'Session creation failed after sign-in', { 
          status: response.status, 
          error: error 
        });
        setMessage(error.message || "Session creation failed");
      }
    } catch (e) {
      log('error', 'Sign-in failed', { 
        error: e instanceof Error ? e.message : 'Unknown error',
        stack: e instanceof Error ? e.stack : undefined,
        email: email.trim()
      });
      setMessage(getFirebaseErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative bg-gray-800 rounded-xl shadow-xl border border-gray-700 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
            disabled={false}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-6">
            {/* Header Section */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">Welcome</h1>
              <p className="text-gray-300">Sign in to your account to continue</p>
            </div>

            {/* Google Sign-in Section */}
            <div className="space-y-4 mb-6">
              <button
                onClick={() => {
                  signInWithGoogleWithPopup();
                }}
                disabled={loading}
                className="group relative w-full flex justify-center items-center py-3 px-4 border border-gray-600 rounded-lg text-sm font-medium text-gray-200 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-800 text-gray-400">Or continue with email</span>
                </div>
              </div>
            </div>

            {/* Email/Password Form */}
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                  }}
                  placeholder="Enter your email"
                  disabled={loading}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-600 placeholder-gray-400 text-white bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent focus:z-10 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                  }}
                  placeholder="Enter your password"
                  disabled={loading}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-600 placeholder-gray-400 text-white bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent focus:z-10 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    signUpWithEmailPassword();
                  }}
                  disabled={loading || !email || !password}
                  className="group relative w-full sm:w-auto flex justify-center py-3 px-6 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : null}
                  Create account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    signInWithEmailPassword();
                  }}
                  disabled={loading || !email || !password}
                  className="group relative w-full sm:w-auto flex justify-center py-3 px-6 border border-transparent text-sm font-medium rounded-lg text-white bg-gray-600 hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : null}
                  Sign in
                </button>
              </div>
            </form>

            {/* Error Message */}
            {message && (
              <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-200">{message}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 text-center">
            <p className="text-xs text-gray-400">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

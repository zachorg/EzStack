"use client";

import React, { useEffect, useState, useCallback } from "react";
import { auth, googleProvider } from "@/lib/firebase/client";
import { signInWithRedirect, getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup } from "firebase/auth";

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

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [redirect, setRedirect] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    
    const r = url.searchParams.get("redirect");
    if (r) {
      setRedirect(r);
    }
  }, []);

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
        setLoading(true);
        
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
          setLoading(false);
        }
      } else {
      }
    } catch (error: unknown) {
      console.error("Firebase Google sign-in error:", error);

      // Provide more specific error messages
      if (error && typeof error === "object" && "code" in error) {
        const firebaseError = error as { code: string };
        if (firebaseError.code === "auth/popup-closed-by-user") {
          return { error: "Sign-in was cancelled by user. Please try again." };
        } else if (firebaseError.code === "auth/popup-blocked") {
          return {
            error:
              "Pop-up was blocked by your browser. Please allow pop-ups and try again.",
          };
        } else if (firebaseError.code === "auth/network-request-failed") {
          return {
            error: "Network error. Please check your connection and try again.",
          };
        } else if (firebaseError.code === "auth/internal-error") {
          return { error: "An internal error occurred. Please try again." };
        }
      }
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
      setMessage(
        e instanceof Error ? e.message : "Account creation failed. Check email and password."
      );
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
      setMessage(
        e instanceof Error ? e.message : "Sign-in failed. Check your credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="text-sm text-foreground/70">
        Use your Google account to access the console.
      </p>
      <button
        onClick={() => {
          signInWithGoogleWithPopup();
        }}
        disabled={loading}
        className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
      >
        Continue with Google
      </button>
      <div className="pt-4 space-y-2">
        <p className="text-sm text-foreground/70">Or use email and password</p>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
          placeholder="you@example.com"
          className="w-full px-3 py-2 border rounded"
          disabled={loading}
          autoComplete="email"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          placeholder="Your password"
          className="w-full px-3 py-2 border rounded"
          disabled={loading}
          autoComplete="current-password"
        />
        <div className="flex gap-2">
          <button
            onClick={() => {
              signUpWithEmailPassword();
            }}
            disabled={loading || !email || !password}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            Create account
          </button>
          <button
            onClick={() => {
              signInWithEmailPassword();
            }}
            disabled={loading || !email || !password}
            className="px-4 py-2 bg-gray-900 text-white rounded disabled:opacity-50"
          >
            Sign in
          </button>
        </div>
      </div>
      {message && (
        <p className="text-sm text-gray-600">
          {message}
        </p>
      )}
    </div>
  );
}

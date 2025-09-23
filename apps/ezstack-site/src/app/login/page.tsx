"use client";

import { useEffect, useState } from "react";
import { auth, googleProvider } from "@/lib/firebase/client";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [redirect, setRedirect] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const r = url.searchParams.get("redirect");
    if (r) setRedirect(r);
  }, []);

  // Sign in with Google using Firebase Auth (popup flow).
  async function signInGoogle() {
    setLoading(true);
    setMessage(null);
    
    if (!auth || !googleProvider) {
      setMessage("Firebase authentication not configured");
      setLoading(false);
      return;
    }
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
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
        // This doesn't affect our server-side session cookie
        await signOut(auth);
        window.location.href = redirect || "/";
      } else {
        const error = await response.json();
        setMessage(error.message || "Session creation failed");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  // Create an account with email/password and start a session.
  async function signUpWithEmailPassword() {
    setLoading(true);
    setMessage(null);
    
    if (!auth) {
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
        window.location.href = redirect || "/";
      } else {
        const error = await response.json();
        setMessage(error.message || "Session creation failed");
      }
    } catch (e) {
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
        window.location.href = redirect || "/";
      } else {
        const error = await response.json();
        setMessage(error.message || "Session creation failed");
      }
    } catch (e) {
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
        onClick={signInGoogle}
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
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-3 py-2 border rounded"
          disabled={loading}
          autoComplete="email"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
          className="w-full px-3 py-2 border rounded"
          disabled={loading}
          autoComplete="current-password"
        />
        <div className="flex gap-2">
          <button
            onClick={signUpWithEmailPassword}
            disabled={loading || !email || !password}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            Create account
          </button>
          <button
            onClick={signInWithEmailPassword}
            disabled={loading || !email || !password}
            className="px-4 py-2 bg-gray-900 text-white rounded disabled:opacity-50"
          >
            Sign in
          </button>
        </div>
      </div>
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  );
}



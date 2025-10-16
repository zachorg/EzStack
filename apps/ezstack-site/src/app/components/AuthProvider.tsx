"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

// Types
interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  createdAt: string;
  lastSignInTime: string | null;
  status: string;
  planId: string | null;
}

interface AuthContextType {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Auth actions
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;

  // Utility functions
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch user profile from server
  const fetchUserProfile = useCallback(async (): Promise<User | null> => {
    try {
      const response = await fetch("/api/user/profile", {
        cache: "no-store",
        credentials: "include",
      });

      if (response.ok) {
        const profile = await response.json();
        return profile;
      } else if (response.status === 401) {
        // User not authenticated
        return null;
      } else {
        throw new Error("Failed to fetch user profile");
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      return null;
    }
  }, []);

  // Fetch user profile from Firebase (persistent authentication)
  const fetchUserProfileGoogle = useCallback(async (): Promise<User | null> => {
    try {
      // Import Firebase auth dynamically
      const { auth } = await import("@/lib/firebase/client");
      
      if (!auth) {
        console.warn("Firebase not configured");
        return null;
      }

      // Get current Firebase user (persistent across sessions)
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        console.log("No Firebase user found");
        return null;
      }

      // Get fresh ID token
      const idToken = await firebaseUser.getIdToken();
      
      // Send token to session endpoint to create/refresh server session
      const sessionResponse = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });

      if (!sessionResponse.ok) {
        console.warn("Failed to create/refresh server session");
        return null;
      }

      // Now fetch user profile with valid session
      const response = await fetch("/api/user/profile", {
        cache: "no-store",
        credentials: "include",
      });

      if (response.ok) {
        const profile = await response.json();
        return profile;
      } else if (response.status === 401) {
        // User not authenticated
        return null;
      } else {
        throw new Error("Failed to fetch user profile");
      }
    } catch (err) {
      console.error("Error fetching Firebase user profile:", err);
      return null;
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const userProfile = await fetchUserProfile();
      setUser(userProfile);
      setIsAuthenticated(!!userProfile);
    } catch (err) {
      console.error("Error refreshing user:", err);
      setError("Failed to refresh user data");
      setIsAuthenticated(false);
    }
  }, [fetchUserProfile]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        const userProfile = await fetchUserProfile();

        console.log("AuthProvider: userProfile", userProfile);
        console.log("AuthProvider: isAuthenticated", !!userProfile);
        setUser(userProfile);
        setIsAuthenticated(!!userProfile);
      } catch (err) {
        console.error("Error initializing auth:", err);
        setError("Failed to initialize authentication");
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [fetchUserProfile]);

  // Login with email/password
  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);

      try {
        // Import Firebase auth dynamically
        const { auth } = await import("@/lib/firebase/client");
        const { signInWithEmailAndPassword } = await import("firebase/auth");

        if (!auth) {
          throw new Error(
            "Firebase authentication not configured. Please check your environment variables."
          );
        }

        const userCredential = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
        const idToken = await userCredential.user.getIdToken();

        // Send token to our session endpoint
        const response = await fetch("/api/session/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
          credentials: "include",
        });

        if (response.ok) {
          // Refresh user data
          await refreshUser();
        } else {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message || "Session creation failed"
          );
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Login failed";
        setError(errorMessage);
        console.error("Login error:", err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshUser]
  );

  // Login with Google
  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Import Firebase auth dynamically
      const { auth, googleProvider } = await import("@/lib/firebase/client");
      const { signInWithPopup, signOut } = await import("firebase/auth");

      if (!auth || !googleProvider) {
        throw new Error(
          "Firebase authentication not configured. Please check your environment variables."
        );
      }

      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      // Send token to our session endpoint
      const response = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });

      if (response.ok) {
        // Sign out from Firebase to prevent persistent Google session
        await signOut(auth);

        // Refresh user data
        await refreshUser();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Session creation failed");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Google login failed";
      setError(errorMessage);
      console.error("Google login error:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshUser]);

  // Sign up with email/password
  const signup = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);

      try {
        // Import Firebase auth dynamically
        const { auth } = await import("@/lib/firebase/client");
        const { createUserWithEmailAndPassword } = await import(
          "firebase/auth"
        );

        if (!auth) {
          throw new Error(
            "Firebase authentication not configured. Please check your environment variables."
          );
        }

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
        const idToken = await userCredential.user.getIdToken();

        // Send token to our session endpoint
        const response = await fetch("/api/session/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
          credentials: "include",
        });

        if (response.ok) {
          // Refresh user data
          await refreshUser();
        } else {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message || "Session creation failed"
          );
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Signup failed";
        setError(errorMessage);
        console.error("Signup error:", err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshUser]
  );

  // Logout
  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Clear server session
      await fetch("/api/session/end", {
        method: "POST",
        credentials: "include",
      });

      // Clear user state
      setUser(null);
    } catch (err) {
      console.error("Error during logout:", err);
      // Still clear user state even if server logout fails
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const contextValue: AuthContextType = {
    // Auth state
    user,
    isAuthenticated,
    isLoading,
    error,

    // Auth actions
    login,
    loginWithGoogle,
    signup,
    logout,

    // Utility functions
    refreshUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Hook to get just the user (null if not authenticated)
export function useUser() {
  const { user, isAuthenticated } = useAuth();
  return isAuthenticated ? user : null;
}

// Hook to check if user is authenticated
export function useIsAuthenticated() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

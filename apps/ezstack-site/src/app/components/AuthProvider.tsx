"use client";

const { auth, googleProvider } = await import("@/lib/firebase/client");
const {
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} = await import("firebase/auth");

import { UserProfileUserInfoConfig } from "@/__generated__/configTypes";
import { foward_req_to_ezstack_api } from "@/lib/functions-proxy";
import { User } from "firebase/auth";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

// Types
interface UserProfile {
  firebaseUser: User;
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
  user: UserProfile | null;
  userInfo: UserProfileUserInfoConfig | null;
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<UserProfileUserInfoConfig | null>(
    null
  );

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch user profile from Firebase
  const fetchUserProfile =
    useCallback(async (): Promise<UserProfile | null> => {
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

        return {
          firebaseUser: firebaseUser,
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          status: "active",
          planId: "",
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
          createdAt: "",
          lastSignInTime: "",
        };
      } catch (err) {
        console.error("Error fetching Firebase user profile:", err);
        return null;
      }
    }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const userProfile = await fetchUserProfile();
      console.log("AuthProvider: Refresh: userProfile", userProfile);
      console.log("AuthProvider: Refresh: isAuthenticated", !!userProfile);
    } catch (err) {
      console.error("Error refreshing user:", err);
      setError("Failed to refresh user data");
      setIsAuthenticated(false);
    }
  }, [fetchUserProfile]);

  // Fetch user info from API
  const fetchUserInfo = useCallback(async (firebaseUser: User) => {
    if (!firebaseUser) {
      return;
    }

    try {
      const idToken = await firebaseUser.getIdToken();
      const req: RequestInit = {
        method: "GET",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${idToken}`,
        },
        cache: "no-store",
      };

      const response = await foward_req_to_ezstack_api(
        "/api/v1/user/profile/get",
        req
      );
      if (!response.ok) {
        console.log("AuthProvider: fetchUserInfo: userInfo not found");
        setUserInfo(null);
        return;
      }
      const data = await response.json();
      const userInfo = data.user_info;
      
      if (!userInfo) {
        setUserInfo(null);
        return;
      }
      
      setUserInfo(userInfo as UserProfileUserInfoConfig);
      console.log(
        "AuthProvider: fetchUserInfo: userInfo",
        JSON.stringify(userInfo, null, 2)
      );
    } catch (err) {
      console.error("Error fetching user info:", err);
    }
  }, []);

  // Initialize auth state and listen for auth changes
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        const userProfile = await fetchUserProfile();

        console.log("AuthProvider: Initialize: userProfile", userProfile);
        console.log("AuthProvider: Initialize: isAuthenticated", !!userProfile);
      } catch (err) {
        console.error("Error initializing auth:", err);
        setError("Failed to initialize authentication");
      }
    };

    initializeAuth();

    // Set up Firebase auth state listener
    let unsubscribe: (() => void) | null = null;

    const setupAuthListener = async () => {
      try {
        const { auth } = await import("@/lib/firebase/client");
        const { onAuthStateChanged } = await import("firebase/auth");

        if (auth) {
          unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
              console.log("AuthProvider: onAuthStateChanged: ", firebaseUser);
              // User is signed in
              const userProfile = {
                firebaseUser: firebaseUser,
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                status: "active",
                planId: "",
                photoURL: firebaseUser.photoURL,
                emailVerified: firebaseUser.emailVerified,
                createdAt: "",
                lastSignInTime: "",
              };
              setUserProfile(userProfile);
              setIsAuthenticated(true);
              fetchUserInfo(firebaseUser);
            } else {
              // User is signed out
              setUserProfile(null);
              setIsAuthenticated(false);
            }
            setIsLoading(false);
          });
        }
      } catch (error) {
        console.warn("Failed to set up auth state listener:", error);
      }
    };

    setupAuthListener();

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [fetchUserProfile, fetchUserInfo]);

  const tryUserLogin = async (userId: string) => {
    const req: RequestInit = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${userId}`,
      },
      body: JSON.stringify({}),
      cache: "no-store",
    };

    const response = await foward_req_to_ezstack_api(
      "/api/v1/user/profile/loginin",
      req
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Session creation failed");
    }
  };

  // Login with email/password
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
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
      await tryUserLogin(idToken);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
      console.error("Login error:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login with Google
  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!auth || !googleProvider) {
        throw new Error(
          "Firebase authentication not configured. Please check your environment variables."
        );
      }

      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      // Send token to our session endpoint
      await tryUserLogin(idToken);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Google login failed";
      setError(errorMessage);
      console.error("Google login error:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sign up with email/password
  const signup = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
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
      await tryUserLogin(idToken);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Signup failed";
      setError(errorMessage);
      console.error("Signup error:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Clear server session
      // await fetch("/api/session/end", {
      //   method: "POST",
      //   credentials: "include",
      // });

      // Sign out from Firebase
      if (auth) {
        await signOut(auth);
      }

      // Clear user state
      setUserProfile(null);
    } catch (err) {
      console.error("Error during logout:", err);
      // Still clear user state even if server logout fails
      setUserProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const contextValue: AuthContextType = {
    // Auth state
    user: userProfile,
    userInfo,
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
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
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

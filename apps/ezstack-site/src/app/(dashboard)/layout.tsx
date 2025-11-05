"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import UserInfoInitialDialog from "@/app/components/UserInfoInitialDialog";
import { UserProfileUserInfoConfig } from "@/__generated__/configTypes";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, userInfo, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showDialog, setShowDialog] = useState(false);
  const [hasUserInfoBeenFetched, setHasUserInfoBeenFetched] = useState(false);
  const prevUserInfoRef = useRef<UserProfileUserInfoConfig | null | undefined>(undefined);
  const authCompletedRef = useRef(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track if userInfo has ever been fetched (even if it's null)
  // We detect this by checking if userInfo value has changed after authentication completes
  // If userInfo stays null, we use a timeout as fallback to assume fetch completed
  useEffect(() => {
    if (isAuthenticated && !isLoading && user) {
      // Mark that authentication has completed
      if (!authCompletedRef.current) {
        authCompletedRef.current = true;
        prevUserInfoRef.current = userInfo; // Initialize with current value
        
        // If userInfo is already non-null, it's been fetched
        if (userInfo !== null) {
          setHasUserInfoBeenFetched(true);
        } else {
          // Set a timeout: if userInfo is still null after 3 seconds, assume fetch completed
          fetchTimeoutRef.current = setTimeout(() => {
            setHasUserInfoBeenFetched(true);
          }, 3000);
        }
      } else {
        // If userInfo value changed after auth completed, the fetch completed
        if (prevUserInfoRef.current !== userInfo) {
          // Clear timeout if it exists
          if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
            fetchTimeoutRef.current = null;
          }
          setHasUserInfoBeenFetched(true);
          prevUserInfoRef.current = userInfo;
        }
      }
    } else {
      // Reset when user logs out
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
      setHasUserInfoBeenFetched(false);
      prevUserInfoRef.current = undefined;
      authCompletedRef.current = false;
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [isAuthenticated, isLoading, userInfo, user]);

  // Global redirect: Redirect to home if user is not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    // Only show dialog on dashboard pages when authenticated and userInfo is missing
    // Don't show dialog on /account page since that's where users go to update their info
    const isAccountPage = pathname === "/account";
    if (isAuthenticated && !isLoading && !userInfo && user && !isAccountPage && hasUserInfoBeenFetched) {
      setShowDialog(true);
    } else {
      setShowDialog(false);
    }
  }, [isAuthenticated, isLoading, userInfo, user, pathname, hasUserInfoBeenFetched]);

  const handleSuccess = async () => {
    // Refresh user info after successful update
    // The AuthProvider will handle this automatically via onSuccess callback
    setShowDialog(false);
  };

  // Check if userInfo is being fetched (user is authenticated but userInfo hasn't been fetched yet)
  // This happens when auth is ready but userInfo fetch hasn't completed yet
  const isUserInfoFetching = isAuthenticated && !isLoading && user && !hasUserInfoBeenFetched;

  // Check if userInfo is invalid (missing or missing organization_name)
  // Only show button when userInfo has been fetched and is invalid or missing
  // Don't show button while userInfo is still being fetched
  const isUserInfoInvalid = isAuthenticated && !isLoading && user && hasUserInfoBeenFetched && (userInfo === null || !userInfo.organization_name || userInfo.organization_name.trim() === "");

  const handleCompleteProfileClick = () => {
    router.push("/account");
  };

  // Show loading animation on /account page while userInfo is being fetched
  const isAccountPage = pathname === "/account";
  const showAccountLoading = isAccountPage && isUserInfoFetching;

  // Prevent pages from loading until authentication is verified
  if (isLoading) {
    return (
      <div className="px-6 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
        <div className="mx-auto w-full max-w-6xl space-y-6 animate-pulse">
          <div className="h-10 bg-neutral-800 rounded w-64"></div>
          <div className="space-y-4">
            <div className="h-32 bg-neutral-800 rounded-lg"></div>
            <div className="h-32 bg-neutral-800 rounded-lg"></div>
            <div className="h-32 bg-neutral-800 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, show loading while redirect happens
  if (!isAuthenticated) {
    return (
      <div className="px-6 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
        <div className="mx-auto w-full max-w-6xl space-y-6 animate-pulse">
          <div className="h-10 bg-neutral-800 rounded w-64"></div>
          <div className="space-y-4">
            <div className="h-32 bg-neutral-800 rounded-lg"></div>
            <div className="h-32 bg-neutral-800 rounded-lg"></div>
            <div className="h-32 bg-neutral-800 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showAccountLoading ? (
        <div className="px-6 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-6xl space-y-6 animate-pulse">
            <div className="h-10 bg-neutral-800 rounded w-64"></div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="h-4 w-20 bg-neutral-800 rounded"></div>
                  <div className="h-6 w-40 bg-neutral-800 rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-28 bg-neutral-800 rounded"></div>
                  <div className="h-6 w-32 bg-neutral-800 rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-neutral-800 rounded"></div>
                  <div className="h-6 w-20 bg-neutral-800 rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-neutral-800 rounded"></div>
                  <div className="h-6 w-36 bg-neutral-800 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        children
      )}
      <UserInfoInitialDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onSuccess={handleSuccess}
      />
      
      {/* Complete Profile Overlay */}
      {isUserInfoInvalid && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={handleCompleteProfileClick}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:ring-offset-2 focus:ring-offset-neutral-900 transition-colors duration-200"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Complete Profile
          </button>
        </div>
      )}
    </>
  );
}
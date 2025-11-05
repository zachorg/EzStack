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

  return (
    <>
      {showAccountLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-800 dark:border-white mx-auto"></div>
            <p className="text-sm text-neutral-400">
              Loading...
            </p>
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
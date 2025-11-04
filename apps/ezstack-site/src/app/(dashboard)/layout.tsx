"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import UserInfoInitialDialog from "@/app/components/UserInfoInitialDialog";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, userInfo, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    // Only show dialog on dashboard pages when authenticated and userInfo is missing
    // Don't show dialog on /account page since that's where users go to update their info
    const isAccountPage = pathname === "/account";
    if (isAuthenticated && !isLoading && !userInfo && user && !isAccountPage) {
      setShowDialog(true);
    } else {
      setShowDialog(false);
    }
  }, [isAuthenticated, isLoading, userInfo, user, pathname]);

  const handleSuccess = async () => {
    // Refresh user info after successful update
    // The AuthProvider will handle this automatically via onSuccess callback
    setShowDialog(false);
  };

  // Check if userInfo is invalid (missing or missing organization_name)
  // This will automatically update when userInfo changes from AuthProvider
  const isUserInfoInvalid = isAuthenticated && !isLoading && user && (!userInfo || !userInfo.organization_name || userInfo.organization_name.trim() === "");

  const handleCompleteProfileClick = () => {
    router.push("/account");
  };

  return (
    <>
      {children}
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
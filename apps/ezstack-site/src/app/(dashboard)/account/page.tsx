"use client";

import { cn } from "@/lib/utils";
import { useAuth } from "@/app/components/AuthProvider";
import { PAGE_SECTIONS } from "@/app/pageSections";
import { useEffect } from "react";
import { useSidebar } from "@/app/components/SidebarProvider";

type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  createdAt: string;
  lastSignInTime: string | null;
  status: string;
  planId: string | null;
};

function useUserProfile() {
  const { user, isLoading, error } = useAuth();

  // Map auth user to UserProfile format for compatibility
  const profile: UserProfile | null = user
    ? {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        lastSignInTime: user.lastSignInTime,
        status: user.status,
        planId: user.planId,
      }
    : null;

  return {
    profile,
    loading: isLoading,
    error,
  };
}


function UserInfoSection({
  profile,
  loading,
  error,
}: {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <section className="space-y-3">
        <h2 className="text-base md:text-lg font-semibold text-white">Account Information</h2>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-1/3 bg-neutral-800 rounded" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="h-3 w-20 bg-neutral-800 rounded" />
                <div className="h-4 w-40 bg-neutral-800 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-28 bg-neutral-800 rounded" />
                <div className="h-4 w-32 bg-neutral-800 rounded" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-3">
        <h2 className="text-base md:text-lg font-semibold text-white">Account Information</h2>
        <div
          role="alert"
          className="rounded-lg border border-red-900/60 bg-red-900/20 px-3 py-2 text-sm text-red-300"
        >
          {error}
        </div>
      </section>
    );
  }

  if (!profile) return null;
  

  return (
    <section className="space-y-3">
      <h2 className="text-base md:text-lg font-semibold text-white">Account Information</h2>
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-neutral-400">Email</dt>
            <dd className="mt-1 text-sm text-neutral-100">
              {profile.email || "—"}
              {profile.emailVerified && (
                <span className="ml-2 inline-flex items-center rounded px-2 py-0.5 text-xs bg-emerald-900/30 text-emerald-300">
                  Verified
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-neutral-400">Display Name</dt>
            <dd className="mt-1 text-sm text-neutral-100">
              {profile.displayName || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-neutral-400">Account Status</dt>
            <dd className="mt-1 text-sm">
              <span
                className={cn(
                  "inline-flex items-center rounded px-2 py-0.5 text-xs",
                  profile.status === "active"
                    ? "bg-emerald-900/30 text-emerald-300"
                    : "bg-neutral-800 text-neutral-300"
                )}
              >
                {profile.status}
              </span>
            </dd>
          </div>
        </div>
      </div>
    </section>
  );
}


export default function AccountPage() {
  const { isLoading } = useAuth();
  const {
    profile,
    loading: profileLoading,
    error: profileError,
  } = useUserProfile();
  const { setSections } = useSidebar();

  // Set sidebar sections for this page
  useEffect(() => {
    const dashboardSections = [
      {
        title: "",
        items: [
          PAGE_SECTIONS({ resolvedParams: { projectname: "" } }).projects,
          PAGE_SECTIONS({ resolvedParams: { projectname: "" } }).billing,
        ],
      },
    ];

    setSections(dashboardSections);
  }, [setSections]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="px-6 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-800 dark:border-white mx-auto"></div>
              <p className="text-sm text-neutral-400">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="mt-3 md:mt-4">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white">Account Settings</h1>
        </header>

        {/* User Information Section */}
        <UserInfoSection
          profile={profile}
          loading={profileLoading}
          error={profileError}
        />
      </div>
    </div>
  );
}

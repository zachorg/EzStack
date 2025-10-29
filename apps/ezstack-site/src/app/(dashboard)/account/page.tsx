"use client";

import { cn } from "@/lib/utils";
import { useAuth } from "@/app/components/AuthProvider";

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
        <h2 className="text-lg font-semibold">Account Information</h2>
        <div className="text-sm text-gray-600">Loading...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Account Information</h2>
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      </section>
    );
  }

  if (!profile) return null;
  console.log("UserInfoSection: ", profile);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Account Information</h2>
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Email
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {profile.email || "—"}
              {profile.emailVerified && (
                <span className="ml-2 inline-flex items-center rounded px-2 py-0.5 text-xs bg-green-100 text-green-800">
                  Verified
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Display Name
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {profile.displayName || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Account Status
            </dt>
            <dd className="mt-1 text-sm">
              <span
                className={cn(
                  "inline-flex items-center rounded px-2 py-0.5 text-xs",
                  profile.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-200 text-gray-700"
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

  // Show loading while checking authentication
  if (isLoading) {
    return <main className="mx-auto max-w-5xl space-y-8 p-4"></main>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-4">
      <header>
        <h1 className="text-2xl font-bold">Account Settings</h1>
      </header>

      {/* User Information Section */}
      <UserInfoSection
        profile={profile}
        loading={profileLoading}
        error={profileError}
      />
    </main>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { useAuth } from "@/app/components/AuthProvider";
import { PAGE_SECTIONS } from "@/app/pageSections";
import { useEffect, useState, useCallback } from "react";
import { useSidebar } from "@/app/components/SidebarProvider";
import { foward_req_to_ezstack_api } from "@/lib/functions-proxy";
import { CreateUserProfileRequest } from "@/__generated__/requestTypes";
import { validateOrganizationName } from "@/lib/organization-validator";

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


function OrganizationNameWidget({
  organizationName,
  onUpdate,
}: {
  organizationName: string | null;
  onUpdate: (newName: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(organizationName || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync value with prop changes
  useEffect(() => {
    if (!isEditing) {
      setValue(organizationName || "");
    }
  }, [organizationName, isEditing]);

  const handleSave = useCallback(async () => {
    if (!value.trim()) {
      setError("Organization name cannot be empty");
      return;
    }

    // Validate organization name
    const validation = validateOrganizationName(value.trim());
    if (!validation.isValid) {
      setError(validation.error || "Invalid organization name");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onUpdate(value.trim());
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update organization name");
    } finally {
      setIsSaving(false);
    }
  }, [value, onUpdate]);

  const handleCancel = useCallback(() => {
    setValue(organizationName || "");
    setIsEditing(false);
    setError(null);
  }, [organizationName]);

  if (isEditing) {
    return (
      <div>
        <dt className="text-sm font-medium text-neutral-400">Organization Name</dt>
        <dd className="mt-1 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              disabled={isSaving}
              className="flex-1 px-3 py-1.5 rounded-md border border-neutral-800 bg-neutral-950 text-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:opacity-50"
              placeholder="Enter organization name"
            />
            <button
              onClick={handleSave}
              disabled={isSaving || !value.trim()}
              className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-md border border-neutral-800 bg-neutral-900 text-neutral-300 text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
          <p className="text-xs text-neutral-500">
            This will be displayed on OTP emails and SMS
          </p>
        </dd>
      </div>
    );
  }

  return (
    <div>
      <dt className="text-sm font-medium text-neutral-400">Organization Name</dt>
      <dd className="mt-1 flex items-center gap-2">
        <span className="text-sm text-neutral-100">
          {organizationName || "—"}
        </span>
        <button
          onClick={() => setIsEditing(true)}
          className="text-xs text-neutral-400 hover:text-neutral-300 transition-colors"
        >
          Edit
        </button>
      </dd>
    </div>
  );
}

function UserInfoSection({
  profile,
  loading,
  error,
  userInfo,
  onUpdateOrganizationName,
}: {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  userInfo: { organization_name: string } | null;
  onUpdateOrganizationName: (newName: string) => Promise<void>;
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
          <OrganizationNameWidget
            organizationName={userInfo?.organization_name || null}
            onUpdate={onUpdateOrganizationName}
          />
        </div>
      </div>
    </section>
  );
}


export default function AccountPage() {
  const { isLoading, user, userInfo } = useAuth();
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
          PAGE_SECTIONS({ resolvedParams: { projectname: "" } }).docs,
        ],
      },
    ];

    setSections(dashboardSections);
  }, [setSections]);

  // Handle organization name update
  const handleUpdateOrganizationName = useCallback(async (newName: string) => {
    if (!user?.firebaseUser) {
      throw new Error("User not authenticated");
    }

    const idToken = await user.firebaseUser.getIdToken();
    const req: RequestInit = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        organization_name: newName,
      } as CreateUserProfileRequest),
      cache: "no-store",
    };

    const response = await foward_req_to_ezstack_api(
      "/api/v1/user/profile/update",
      req
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || "Failed to update organization name"
      );
    }

    // Refresh user info
    window.location.reload();
  }, [user]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
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
          userInfo={userInfo}
          onUpdateOrganizationName={handleUpdateOrganizationName}
        />
      </div>
    </div>
  );
}

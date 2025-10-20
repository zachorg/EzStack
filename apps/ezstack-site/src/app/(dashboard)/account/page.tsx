"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  apiKeys,
  type ListApiKeysResponse,
} from "@/lib/api/apikeys";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/components/AuthProvider";
import CreateApiKeyDialog from "@/app/components/CreateApiKeyDialog";

type KeyItem = ListApiKeysResponse["items"][number];

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

function formatDate(value: KeyItem["createdAt"] | string | null) {
  if (!value) return "—";
  try {
    if (typeof value === "string" || typeof value === "number") {
      const d = new Date(Number(value));
      if (!isNaN(d.getTime())) return d.toLocaleString();
    } else if (typeof value === "object" && value && "seconds" in value) {
      const secs = Number((value as { seconds: number }).seconds) * 1000;
      if (!isNaN(secs)) return new Date(secs).toLocaleString();
    }
  } catch {}
  return "—";
}

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

function useKeys() {
  const [items, setItems] = useState<KeyItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user, isAuthenticated } = useAuth();

  const reload = async () => {
    if (!isAuthenticated) {
      console.warn("useKeys: not authenticated");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiKeys.list(user?.uid ?? "");
      setItems(res.items ?? []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load";
      setError(msg);
      console.error(msg + " " + user?.uid);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return { items, loading, error, reload };
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

function KeyActionsDropdown({
  item,
  onRevoke,
  revokingId,
}: {
  item: KeyItem;
  onRevoke: (item: KeyItem) => void;
  revokingId?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    right: 0,
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isRevoked = Boolean(item.revokedAt);

  // Calculate dropdown position when opening
  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();

      // Position dropdown below the button, right-aligned
      const top = rect.bottom + 8;
      const right = window.innerWidth - rect.right;

      setDropdownPosition({ top, right });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      updateDropdownPosition();
    }
    setIsOpen(!isOpen);
  };

  if (isRevoked) {
    return null; // Don't show actions for revoked keys
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label="More actions"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          role="menu"
          className="fixed w-48 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-50"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
          }}
        >
          <div className="py-1">
            <button
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                onRevoke(item);
                setIsOpen(false);
              }}
              disabled={revokingId === item.id}
              role="menuitem"
            >
              {revokingId === item.id ? "Revoking…" : "Revoke"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function KeysTable({
  items,
  onRevoke,
  revokingId,
}: {
  items: KeyItem[];
  onRevoke: (item: KeyItem) => void;
  revokingId?: string | null;
}) {
  if (!items.length) {
    return (
      <div className="rounded border p-6 text-center">
        <p className="text-sm">No API keys yet.</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <div className="overflow-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="text-left text-sm bg-gray-50 dark:bg-gray-900">
              <th className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 font-medium">
                Name
              </th>
              <th className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 font-medium">
                Key Prefix
              </th>
              <th className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 font-medium">
                Created
              </th>
              <th className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 font-medium">
                Last Used
              </th>
              <th className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 font-medium">
                Status
              </th>
              <th className="border-b border-gray-200 dark:border-gray-700 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isRevoked = Boolean(item.revokedAt);
              return (
                <tr
                  key={item.id}
                  className="text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="border-b border-gray-200 dark:border-gray-700 px-4 py-4">
                    {item.name || "—"}
                  </td>
                  <td className="border-b border-gray-200 dark:border-gray-700 px-4 py-4 font-mono">
                    {item.keyPrefix}
                  </td>
                  <td className="border-b border-gray-200 dark:border-gray-700 px-4 py-4">
                    {formatDate(item.createdAt)}
                  </td>
                  <td className="border-b border-gray-200 dark:border-gray-700 px-4 py-4">
                    {formatDate(item.lastUsedAt)}
                  </td>
                  <td className="border-b border-gray-200 dark:border-gray-700 px-4 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded px-2 py-0.5 text-xs",
                        isRevoked
                          ? "bg-gray-200 text-gray-700"
                          : "bg-green-100 text-green-800"
                      )}
                    >
                      {isRevoked ? "Revoked" : "Active"}
                    </span>
                  </td>
                  <td className="border-b border-gray-200 dark:border-gray-700 px-4 py-4 text-right">
                    <KeyActionsDropdown
                      item={item}
                      onRevoke={onRevoke}
                      revokingId={revokingId}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RevokeDialog({
  open,
  keyPrefix,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  keyPrefix: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-gray-800 rounded-xl shadow-xl border border-gray-700 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div className="p-6">
            {/* Header Section */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">
                Revoke API Key
              </h1>
              <p className="text-gray-300">This action cannot be undone</p>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-200">
                      Are you sure you want to revoke key{" "}
                      {keyPrefix ? (
                        <code className="font-mono text-red-100">
                          {keyPrefix}
                        </code>
                      ) : (
                        "this API key"
                      )}
                      ? This action cannot be undone and will immediately
                      disable the key.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="group relative w-full sm:w-auto flex justify-center py-3 px-6 border border-gray-600 text-sm font-medium rounded-lg text-gray-200 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 focus:ring-offset-gray-800 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="group relative w-full sm:w-auto flex justify-center py-3 px-6 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400 focus:ring-offset-gray-800 transition-all duration-200"
                >
                  Revoke Key
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const {
    profile,
    loading: profileLoading,
    error: profileError,
  } = useUserProfile();

  // Redirect to homepage if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  // Set tenant ID when profile changes
  useEffect(() => {
    console.log("AccountPage: profile", profile);
    setTenantId(profile ? profile.uid : null);
  }, [profile]);

  const { items, loading, error, reload } = useKeys();
  const [createKeyDialogOpen, setCreateKeyDialogOpen] = useState(false);
  const [confirm, setConfirm] = useState<{
    id: string;
    keyPrefix: string;
  } | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Show loading while checking authentication
  if (isLoading) {
    return <main className="mx-auto max-w-5xl space-y-8 p-4"></main>;
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  const onCreated = () => {
    // Refresh the list after creating a key
    void reload();
  };

  const onRevokeRequested = (item: KeyItem) => {
    setConfirm({ id: item.id, keyPrefix: item.keyPrefix });
  };

  const doRevoke = async () => {
    if (!confirm || !tenantId) return;
    setActionError(null);
    setRevokingId(confirm.id);
    try {
      await apiKeys.revoke(confirm.id, tenantId);
      setConfirm(null);
      await reload();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to revoke";
      setActionError(msg);
    } finally {
      setRevokingId(null);
    }
  };

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

      {/* API Keys Section */}
      <div className="space-y-6">
        <section aria-labelledby="keys-heading" className="space-y-3">
          <div className="space-y-3">
            <h2 id="keys-heading" className="text-lg font-semibold">
              API Keys
            </h2>
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
                These API keys allow privileged access to your project&apos;s APIs.
                Use in servers, functions, workers or other backend components
                of your application.
              </p>
              <button
                className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border border-white dark:border-white hover:border-gray-300 dark:hover:border-gray-400 rounded-md transition-all duration-200 ease-in-out cursor-pointer disabled:opacity-60 flex-shrink-0"
                onClick={() => setCreateKeyDialogOpen(true)}
                disabled={!tenantId}
              >
                Create Key
              </button>
            </div>
          </div>
          {error ? (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </div>
          ) : null}
          {actionError ? (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {actionError}
            </div>
          ) : null}
          {items ? (
            <KeysTable
              items={items}
              onRevoke={onRevokeRequested}
              revokingId={revokingId}
            />
          ) : (
            <div className="text-sm text-gray-600">
              {loading ? "Loading…" : ""}
            </div>
          )}
        </section>
      </div>

      <CreateApiKeyDialog
        isOpen={createKeyDialogOpen}
        onClose={() => setCreateKeyDialogOpen(false)}
        onCreated={onCreated}
        tenantId={tenantId}
        existingNames={(items || [])
          .map((it) => (it.name || "").trim())
          .filter(Boolean)}
      />

      <RevokeDialog
        open={Boolean(confirm)}
        keyPrefix={confirm?.keyPrefix ?? null}
        onCancel={() => setConfirm(null)}
        onConfirm={doRevoke}
      />
    </main>
  );
}

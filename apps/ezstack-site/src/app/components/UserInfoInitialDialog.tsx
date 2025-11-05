"use client";

import React, { useState, useEffect } from "react";
import { UserProfileUserInfoConfig } from "@/__generated__/configTypes";
import { foward_req_to_ezstack_api } from "@/lib/functions-proxy";
import { useAuth } from "./AuthProvider";
import { CreateUserProfileRequest } from "@/__generated__/requestTypes";

interface UserInfoInitialDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserInfoInitialDialog({
  isOpen,
  onClose,
  onSuccess,
}: UserInfoInitialDialogProps) {
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationName.trim()) {
      setError("Please fill in the organization name");
      return;
    }

    if (!user?.firebaseUser) {
      setError("User not authenticated");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const idToken = await user.firebaseUser.getIdToken();
      const req: RequestInit = {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          organization_name: organizationName.trim(),
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
          errorData.error?.message || "Failed to update user info"
        );
      }

      // Reset form and close
      setOrganizationName("");
      setError(null);
      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update user info";
      setError(errorMessage);
      console.error("Error updating user info:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = React.useCallback(() => {
    if (!isLoading) {
      setError(null);
      onClose();
    }
  }, [isLoading, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isLoading, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Complete Your Profile
            </h2>
            <p className="text-sm text-neutral-400 mt-1">
              Please provide your information to continue
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
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
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-700/50 text-red-200 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Organization Name */}
          <div>
            <label
              htmlFor="organizationName"
              className="block text-sm font-medium text-white mb-2"
            >
              Organization Name *
            </label>
            <input
              type="text"
              id="organizationName"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Enter your organization name"
              required
              disabled={isLoading}
              className="w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-950 text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-neutral-500 mt-2">
              This will be displayed on OTP emails and SMS
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-md border border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!organizationName.trim() || isLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 text-white text-sm font-medium rounded-md transition-colors duration-200 disabled:cursor-not-allowed disabled:text-neutral-400 flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

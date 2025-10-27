"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiKeys } from "@/lib/api/apikeys";
import { ApiError } from "@/lib/api/client";
import { ListApiKeysResponse } from "@/__generated__/responseTypes";
import { RevokeApiKeyRequest } from "@/__generated__/requestTypes";

interface RevokeApiKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRevoked: () => void;
  apiKey: ListApiKeysResponse;
  projectName?: string;
}

export default function RevokeApiKeyDialog({
  isOpen,
  onClose,
  onRevoked,
  apiKey,
  projectName = "",
}: RevokeApiKeyDialogProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoked, setRevoked] = useState(false);

  // Enhanced close handler that also clears state
  const handleClose = useCallback(() => {
    setError(null);
    setName("");
    setRevoked(false);
    onClose();
  }, [onClose]);

  // Handle escape key and click outside to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
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
  }, [isOpen, handleClose]);

  // Reset dialog state when it closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setName("");
      setRevoked(false);
    }
  }, [isOpen]);

  // Validation - name must match exactly (case-sensitive)
  const keyName = apiKey.name || "";
  const nameMatches = name.trim() === keyName.trim();
  const isEmpty = name.trim().length === 0;
  const canSubmit =
    !submitting && nameMatches && !isEmpty && keyName.length > 0;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await apiKeys.revoke({
        name: apiKey.name ?? "",
        project_name: projectName ?? "",
      } as RevokeApiKeyRequest);
      if (res?.ok) {
        setRevoked(true);
        onRevoked();
      }
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to revoke key";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-gray-800 rounded-xl shadow-xl border border-gray-700 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
            disabled={submitting || revoked}
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
            {!revoked ? (
              <>
                {/* Header Section */}
                <div className="text-center mb-6">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-900/20 mb-4">
                    <svg
                      className="h-6 w-6 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    Revoke API Key
                  </h1>
                  <p className="text-gray-300">This action cannot be undone</p>
                </div>

                {/* Warning Message */}
                <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-200 mb-3">
                    <strong>Warning:</strong> Revoking this API key will
                    immediately invalidate all requests using it.
                  </p>
                  <div className="space-y-2 text-sm">
                    {apiKey.name ? (
                      <p className="text-gray-300">
                        <strong>Key Name:</strong>{" "}
                        <code className="font-mono text-gray-200">
                          {apiKey.name}
                        </code>
                      </p>
                    ) : (
                      <p className="text-gray-300">
                        <strong>Key Name:</strong>{" "}
                        <span className="italic text-gray-400">
                          No name set
                        </span>
                      </p>
                    )}
                    <p className="text-gray-300">
                      <strong>Key Prefix:</strong>{" "}
                      <code className="font-mono text-gray-200">
                        {apiKey.key_prefix}
                      </code>
                    </p>
                  </div>
                </div>

                {/* Form */}
                <form className="space-y-4" onSubmit={onSubmit}>
                  <div>
                    <label
                      htmlFor="confirm-name"
                      className="block text-sm font-medium text-gray-200 mb-2"
                    >
                      To confirm, type the API key name (case-sensitive):
                    </label>
                    <input
                      id="confirm-name"
                      name="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={apiKey.name || ""}
                      disabled={submitting}
                      className="appearance-none relative block w-full px-4 py-3 border border-gray-600 placeholder-gray-400 text-white bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent focus:z-10 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {!isEmpty && !nameMatches && (
                      <p className="mt-1 text-xs text-red-400">
                        Name does not match
                      </p>
                    )}
                    {!isEmpty && nameMatches && (
                      <p className="mt-1 text-xs text-green-400">
                        ✓ Name matches
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={submitting}
                      className="group relative w-full sm:w-auto flex justify-center py-3 px-6 border border-gray-600 text-sm font-medium rounded-lg text-gray-200 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="group relative w-full sm:w-auto flex justify-center py-3 px-6 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {submitting ? (
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
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
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      ) : null}
                      {submitting ? "Revoking..." : "Revoke Key"}
                    </button>
                  </div>
                </form>

                {/* Error Message */}
                {error && (
                  <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-red-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-200">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Success State */}
                <div className="text-center mb-6">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-900/20 mb-4">
                    <svg
                      className="h-6 w-6 text-green-400"
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
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    API Key Revoked
                  </h1>
                  <p className="text-gray-300">
                    The API key has been successfully revoked
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-300">
                      The API key{" "}
                      {apiKey.name ? (
                        <code className="font-mono text-gray-200">
                          {apiKey.name}
                        </code>
                      ) : (
                        <span className="italic">(unnamed)</span>
                      )}{" "}
                      has been revoked and is no longer usable.
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={handleClose}
                      className="px-6 py-3 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 focus:ring-offset-gray-800 transition-all duration-200"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

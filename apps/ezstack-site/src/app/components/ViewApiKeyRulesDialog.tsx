"use client";

import React, { useEffect, useCallback } from "react";
import { ListApiKeysResponse } from "@/__generated__/responseTypes";
import { ApiKeyRulesConfig } from "@/__generated__/configTypes";

interface ViewApiKeyRulesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: ListApiKeysResponse | null;
}

export default function ViewApiKeyRulesDialog({
  isOpen,
  onClose,
  apiKey,
}: ViewApiKeyRulesDialogProps) {
  // Enhanced close handler
  const handleClose = useCallback(() => {
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

  if (!isOpen || !apiKey) return null;

  const rules: ApiKeyRulesConfig = apiKey.api_key_rules || {
    ezauth_send_otp_enabled: false,
    ezauth_verify_otp_enabled: false,
  };

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
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-900/20 mb-4">
                <svg
                  className="h-6 w-6 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                API Key Rules
              </h1>
              <p className="text-gray-300">
                Permissions for {apiKey.name || "this API key"}
              </p>
            </div>

            {/* Key Info */}
            <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
              <div className="space-y-2 text-sm">
                {apiKey.name && (
                  <p className="text-gray-300">
                    <strong>Key Name:</strong>{" "}
                    <code className="font-mono text-gray-200">
                      {apiKey.name}
                    </code>
                  </p>
                )}
                <p className="text-gray-300">
                  <strong>Key Prefix:</strong>{" "}
                  <code className="font-mono text-gray-200">
                    {apiKey.key_prefix}
                  </code>
                </p>
                <p className="text-gray-300">
                  <strong>Status:</strong>{" "}
                  <span
                    className={
                      apiKey.status === "active"
                        ? "text-emerald-300"
                        : "text-neutral-300"
                    }
                  >
                    {apiKey.status}
                  </span>
                </p>
              </div>
            </div>

            {/* Rules Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Permissions
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  These permissions control what operations this API key can
                  perform
                </p>
                <div className="space-y-3">
                  <div
                    className={`p-4 rounded-lg border ${
                      rules.ezauth_send_otp_enabled
                        ? "bg-emerald-900/20 border-emerald-500/30"
                        : "bg-neutral-800/50 border-neutral-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {rules.ezauth_send_otp_enabled ? (
                          <svg
                            className="w-5 h-5 text-emerald-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5 text-neutral-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-200">
                          Send OTP
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Allow this key to send OTP codes via email or SMS
                        </div>
                        <div className="mt-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              rules.ezauth_send_otp_enabled
                                ? "bg-emerald-900/30 text-emerald-300"
                                : "bg-neutral-700 text-neutral-400"
                            }`}
                          >
                            {rules.ezauth_send_otp_enabled
                              ? "Enabled"
                              : "Disabled"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-lg border ${
                      rules.ezauth_verify_otp_enabled
                        ? "bg-emerald-900/20 border-emerald-500/30"
                        : "bg-neutral-800/50 border-neutral-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {rules.ezauth_verify_otp_enabled ? (
                          <svg
                            className="w-5 h-5 text-emerald-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5 text-neutral-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-200">
                          Verify OTP
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Allow this key to verify OTP codes
                        </div>
                        <div className="mt-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              rules.ezauth_verify_otp_enabled
                                ? "bg-emerald-900/30 text-emerald-300"
                                : "bg-neutral-700 text-neutral-400"
                            }`}
                          >
                            {rules.ezauth_verify_otp_enabled
                              ? "Enabled"
                              : "Disabled"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-center mt-6">
              <button
                onClick={handleClose}
                className="px-6 py-3 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 focus:ring-offset-gray-800 transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiKeys } from "@/lib/api/apikeys";
import { CreateApiKeyRequest } from "@/__generated__/requestTypes";
import { ApiKeyRulesConfig } from "@/__generated__/configTypes";
import { ApiError } from "@/lib/api/client";
import { CreateApiKeyResponse } from "@/__generated__/responseTypes";

interface CreateApiKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (opts: { newKey: CreateApiKeyResponse }) => void;
  existingNames?: string[];
  projectName?: string;
}

export default function CreateApiKeyDialog({ 
  isOpen, 
  onClose, 
  onCreated, 
  existingNames = [],
  projectName
}: CreateApiKeyDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<{ key: string; keyPrefix: string } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [apiKeyRules, setApiKeyRules] = useState<ApiKeyRulesConfig>({
    ezauth_send_otp_enabled: false,
    ezauth_verify_otp_enabled: false,
  });

  // Enhanced close handler that also clears state
  const handleClose = useCallback(() => {
    setError(null);
    setName("");
    setDescription("");
    setCreatedKey(null);
    setRevealed(false);
    setCopied(false);
    setApiKeyRules({
      ezauth_send_otp_enabled: false,
      ezauth_verify_otp_enabled: false,
    });
    onClose();
  }, [onClose]);

  // Handle escape key and click outside to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleClose]);

  // Reset dialog state when it closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setName("");
      setDescription("");
      setCreatedKey(null);
      setRevealed(false);
      setCopied(false);
      setApiKeyRules({
        ezauth_send_otp_enabled: false,
        ezauth_verify_otp_enabled: false,
      });
    }
  }, [isOpen]);

  // Validation
  const normalizedExisting = existingNames
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);
  const trimmed = name.trim();
  const hasSpaces = trimmed.includes(' ');
  const isEmpty = trimmed.length === 0;
  const isDuplicate = trimmed
    ? normalizedExisting.includes(trimmed.toLowerCase())
    : false;
  const canSubmit = !submitting && !isDuplicate && !hasSpaces && !isEmpty;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      const payload: CreateApiKeyRequest = {
        name: trimmed ? trimmed.slice(0, 120) : "",
        project_name: projectName || "",
        api_key_rules: apiKeyRules,
      };
      
      const res = await apiKeys.create(payload);
      setCreatedKey({ key: res.id, keyPrefix: res.key_prefix });
      setRevealed(true); // Automatically show the key so user can save it
      onCreated({ newKey: res });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create key";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onCopy = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
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
            disabled={submitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-6">
            {!createdKey ? (
              <>
                {/* Header Section */}
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-white mb-2">Create API Key</h1>
                  <p className="text-gray-300">Generate a new API key for your application</p>
                </div>

                {/* Form */}
                <form className="space-y-4" onSubmit={onSubmit}>
                  <div>
                    <label htmlFor="key-name" className="block text-sm font-medium text-gray-200 mb-2">
                      Name
                    </label>
                    <input
                      id="key-name"
                      name="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={120}
                      aria-invalid={isDuplicate || hasSpaces || isEmpty}
                      placeholder="e.g., CI Deploy Key"
                      disabled={submitting}
                      className="appearance-none relative block w-full px-4 py-3 border border-gray-600 placeholder-gray-400 text-white bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent focus:z-10 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {isEmpty && trimmed.length === 0 && name.length > 0 && (
                      <p className="mt-1 text-xs text-red-400">
                        Name cannot be empty
                      </p>
                    )}
                    {hasSpaces && (
                      <p className="mt-1 text-xs text-red-400">
                        Name cannot contain spaces
                      </p>
                    )}
                    {isDuplicate && (
                      <p className="mt-1 text-xs text-red-400">
                        This name is already used
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="key-description" className="block text-sm font-medium text-gray-200 mb-2">
                      Description (optional)
                    </label>
                    <textarea
                      id="key-description"
                      name="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder="Describe what this key will be used for..."
                      disabled={submitting}
                      className="appearance-none relative block w-full px-4 py-3 border border-gray-600 placeholder-gray-400 text-white bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent focus:z-10 text-sm disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                    />
                  </div>

                  {/* API Key Rules Section */}
                  <div className="border-t border-gray-600 pt-4">
                    <label className="block text-sm font-medium text-gray-200 mb-3">
                      API Key Permissions
                    </label>
                    <p className="text-xs text-gray-400 mb-4">
                      Select which operations this API key can perform
                    </p>
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={apiKeyRules.ezauth_send_otp_enabled}
                          onChange={(e) =>
                            setApiKeyRules((prev) => ({
                              ...prev,
                              ezauth_send_otp_enabled: e.target.checked,
                            }))
                          }
                          disabled={submitting}
                          className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-gray-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                            Send OTP
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            Allow this key to send OTP codes via email or SMS
                          </div>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={apiKeyRules.ezauth_verify_otp_enabled}
                          onChange={(e) =>
                            setApiKeyRules((prev) => ({
                              ...prev,
                              ezauth_verify_otp_enabled: e.target.checked,
                            }))
                          }
                          disabled={submitting}
                          className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-gray-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                            Verify OTP
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            Allow this key to verify OTP codes
                          </div>
                        </div>
                      </label>
                    </div>
                    {!apiKeyRules.ezauth_send_otp_enabled && !apiKeyRules.ezauth_verify_otp_enabled && (
                      <p className="mt-3 text-xs text-amber-400">
                        ⚠️ At least one permission should be selected for the key to be useful
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
                      className="group relative w-full sm:w-auto flex justify-center py-3 px-6 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {submitting ? (
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : null}
                      {submitting ? "Creating..." : "Create Key"}
                    </button>
                  </div>
                </form>

                {/* Error Message */}
                {error && (
                  <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
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
                {/* Success State - Show Created Key */}
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-white mb-2">API Key Created</h1>
                  <p className="text-gray-300">Your new API key has been generated successfully</p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                    <p className="text-sm text-amber-200 mb-3">
                      <strong>Important:</strong> This key is shown only once. Store it securely. We will not show it again.
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <code
                        className="block grow rounded border border-gray-600 bg-gray-700 px-3 py-2 font-mono text-sm text-white break-all"
                        aria-label="API key value"
                      >
                        {revealed ? createdKey.key : "•".repeat(Math.min(createdKey.key.length, 24)) + " …"}
                      </code>
                      <button
                        className="px-3 py-2 text-sm border border-gray-600 rounded text-gray-200 bg-gray-700 hover:bg-gray-600 transition-colors"
                        onClick={() => setRevealed((v) => !v)}
                        aria-pressed={revealed}
                        aria-label={revealed ? "Hide key" : "Show key"}
                      >
                        {revealed ? "Hide" : "Show"}
                      </button>
                      <button
                        className="px-3 py-2 text-sm border border-gray-600 rounded text-gray-200 bg-gray-700 hover:bg-gray-600 transition-colors"
                        onClick={onCopy}
                        aria-live="polite"
                      >
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    
                    <p className="mt-2 text-xs text-gray-400">
                      Key prefix: <code className="font-mono text-gray-300">{createdKey.keyPrefix}</code>
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

          {/* Footer */}
          {!createdKey && (
            <div className="px-6 pb-6 text-center">
              <p className="text-xs text-gray-400">
                Your API key will be shown once after creation. Store it securely.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

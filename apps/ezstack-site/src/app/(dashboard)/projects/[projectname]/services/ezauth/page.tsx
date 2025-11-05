"use client";

import { useEffect, useState, use, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useProjects } from "@/app/components/ProjectsProvider";
import { UserProjectResponse } from "@/__generated__/responseTypes";
import { useSidebar } from "@/app/components/SidebarProvider";
import { PAGE_SECTIONS } from "@/app/pageSections";
import {
  useService,
  useProjectServices,
} from "@/app/components/ProjectServicesProvider";
import { EzAuthServiceConfig, EzAuthEmailThemeConfig } from "@/__generated__/configTypes";
import { productTiles } from "@/lib/products";
import { ShieldCheck, X } from "lucide-react";

interface EzAuthServicePageProps {
  params: Promise<{
    projectname: string;
  }>;
}

export default function EzAuthServicePage({ params }: EzAuthServicePageProps) {
  const resolvedParams = use(params);
  const { fetchedProjects, setSelectedProject } = useProjects();
  const { updateServiceSettings } = useProjectServices();
  const { settings: serviceSettings } = useService("ezauth");
  const router = useRouter();
  const [project, setProject] = useState<UserProjectResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isThemeDialogOpen, setIsThemeDialogOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  // Get the ezauth service from products
  const service = productTiles.find((tile) => tile.slug === "ezauth");

  // Local state for the config
  const [config, setConfig] = useState<Omit<EzAuthServiceConfig, "organization_name"> | null>(null);
  const originalConfigRef = useRef<Omit<EzAuthServiceConfig, "organization_name"> | null>(null);

  // Initialize config when service settings are loaded
  useEffect(() => {
    console.log("EzAuthServicePage: serviceSettings", serviceSettings);
    if (serviceSettings?.ezauthConfig) {
      const newConfig = serviceSettings.ezauthConfig;
      // Ensure email_theme_config exists, use default dark theme if missing
      if (!newConfig.email_theme_config) {
        newConfig.email_theme_config = {
          bodyBg: "#0D0D0D",
          containerBg: "#141414",
          containerBorder: "#262626",
          headerBg: "#3B82F6",
          textPrimary: "#EAEAEA",
          textSecondary: "#A1A1A1",
          textMuted: "#5A5A5A",
          accentPrimary: "#3B82F6",
          codeBoxBg: "#1A1A1A",
          codeBoxBorder: "#3B82F6",
          timerBoxBg: "#1A1A1A",
          timerBoxBorder: "#262626",
          footerBg: "#141414",
          footerBorder: "#262626",
        };
      }
      // Ensure email_theme exists, default to "dark"
      if (!newConfig.email_theme) {
        newConfig.email_theme = "dark";
      }
      setConfig(newConfig);
      originalConfigRef.current = JSON.parse(JSON.stringify(newConfig));
    } else {
      // Set config to null if no config available
      setConfig(null);
      originalConfigRef.current = null;
    }
  }, [serviceSettings]);

  // Track changes
  useEffect(() => {
    if (config && originalConfigRef.current) {
      const hasChanged =
        JSON.stringify(config) !== JSON.stringify(originalConfigRef.current);
      setHasChanges(hasChanged);
    } else {
      setHasChanges(false);
    }
  }, [config]);

  const { setSections } = useSidebar();
  useEffect(() => {
    const dashboardSections = [
      {
        title: "",
        items: [
          PAGE_SECTIONS({ resolvedParams }).dashboard,
          // PAGE_SECTIONS({ resolvedParams }).services,
          PAGE_SECTIONS({ resolvedParams }).apiKeys,
        ],
      },
    ];

    setSections(dashboardSections);
  }, [setSections, resolvedParams]);

  useEffect(() => {
    // Only proceed if we have fetched projects
    if (!fetchedProjects) {
      return;
    }

    // Find the project by name
    const foundProject = fetchedProjects.projects.find(
      (p) => p.name === resolvedParams.projectname
    );

    if (foundProject) {
      setProject(foundProject);
      setSelectedProject(foundProject.name);
    } else {
      // Project not found, redirect to home
      router.push("/projects");
    }

    setIsLoading(false);
  }, [
    fetchedProjects,
    router,
    setSelectedProject,
    resolvedParams,
  ]);

  const handleInputChange = useCallback(
    async <K extends keyof Omit<EzAuthServiceConfig, "organization_name">>(
      field: K,
      value: Omit<EzAuthServiceConfig, "organization_name">[K]
    ) => {
      // Don't allow changes if service is disabled (except for the enabled field itself)
      if (!config?.enabled && field !== "enabled") {
        return;
      }

      const updatedConfig = config ? { ...config, [field]: value } : null;
      setConfig(updatedConfig);

      // Auto-save only when enabling/disabling the service
      if (field === "enabled" && updatedConfig) {
        setIsSaving(true);
        try {
          await updateServiceSettings("ezauth", updatedConfig);
          originalConfigRef.current = JSON.parse(JSON.stringify(updatedConfig));
          setHasChanges(false);
        } catch (error) {
          console.error("Failed to auto-save on enable/disable:", error);
          // Revert the state on error
          setConfig(config);
        } finally {
          setIsSaving(false);
        }
      }
      // For all other fields, just update local state - user must click Save Changes
    },
    [config, updateServiceSettings]
  );

  const handleSave = useCallback(async () => {
    if (!config || !hasChanges || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await updateServiceSettings("ezauth", config);
      originalConfigRef.current = JSON.parse(JSON.stringify(config));
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save settings:", error);
      // You might want to show an error toast here
    } finally {
      setIsSaving(false);
    }
  }, [config, hasChanges, isSaving, updateServiceSettings]);

  // Loading state
  if (isLoading || serviceSettings?.isLoading) {
    return (
      <div className="px-6 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
        <div className="mx-auto w-full max-w-6xl space-y-6 animate-pulse">
          <div className="space-y-2">
            <div className="h-10 bg-neutral-800 rounded w-64"></div>
            <div className="h-4 bg-neutral-800 rounded w-96"></div>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-neutral-800 rounded"></div>
                  <div className="h-10 bg-neutral-800 rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-neutral-800 rounded"></div>
                  <div className="h-10 bg-neutral-800 rounded"></div>
                </div>
              </div>
              <div className="h-48 bg-neutral-800 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (serviceSettings?.error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <p className="text-sm text-red-400">
            Error loading service settings: {serviceSettings.error}
          </p>
        </div>
      </div>
    );
  }

  // If no project found
  if (!project || !service) {
    return null;
  }

      // If no config available, show a message
  if (!config) {
    return (
      <div className="px-6 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
        <div className="mx-auto w-full max-w-6xl">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-8 text-center">
            <ShieldCheck className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Unable to load configuration
            </h3>
            <p className="text-neutral-400">
              Please try refreshing the page or contact support if the issue
              persists.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Dark theme defaults
  const darkThemeDefaults: EzAuthEmailThemeConfig = {
    bodyBg: "#0D0D0D",
    containerBg: "#141414",
    containerBorder: "#262626",
    headerBg: "#3B82F6",
    textPrimary: "#EAEAEA",
    textSecondary: "#A1A1A1",
    textMuted: "#5A5A5A",
    accentPrimary: "#3B82F6",
    codeBoxBg: "#1A1A1A",
    codeBoxBorder: "#3B82F6",
    timerBoxBg: "#1A1A1A",
    timerBoxBorder: "#262626",
    footerBg: "#141414",
    footerBorder: "#262626",
  };
  
  // Email Theme Editor Dialog Component
interface EmailThemeEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  themeConfig: EzAuthEmailThemeConfig;
  onSave: (config: EzAuthEmailThemeConfig) => void;
  organizationName: string;
}

function EmailThemeEditorDialog({
  isOpen,
  onClose,
  themeConfig,
  onSave,
  organizationName,
}: EmailThemeEditorDialogProps) {
  // Dark theme defaults
  const darkThemeDefaults: EzAuthEmailThemeConfig = {
    bodyBg: "#0D0D0D",
    containerBg: "#141414",
    containerBorder: "#262626",
    headerBg: "#3B82F6",
    textPrimary: "#EAEAEA",
    textSecondary: "#A1A1A1",
    textMuted: "#5A5A5A",
    accentPrimary: "#3B82F6",
    codeBoxBg: "#1A1A1A",
    codeBoxBorder: "#3B82F6",
    timerBoxBg: "#1A1A1A",
    timerBoxBorder: "#262626",
    footerBg: "#141414",
    footerBorder: "#262626",
  };

  const [localConfig, setLocalConfig] = useState<EzAuthEmailThemeConfig>(
    themeConfig || darkThemeDefaults
  );

  // Initialize with dark theme defaults on first open if config is empty
  useEffect(() => {
    if (isOpen) {
      if (!themeConfig || Object.keys(themeConfig).length === 0) {
        setLocalConfig(darkThemeDefaults);
      } else {
        setLocalConfig(themeConfig);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleColorChange = (key: keyof EzAuthEmailThemeConfig, value: string) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(localConfig);
  };

  const handleReset = () => {
    setLocalConfig(darkThemeDefaults);
  };

  if (!isOpen) return null;

  // Generate preview HTML
  const otp = "123456";
  const otpValidMinutes = 5;
  const theme = localConfig;

  const previewHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 20px; background-color: ${theme.bodyBg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: ${theme.containerBg}; border: 1px solid ${theme.containerBorder}; border-radius: 12px; overflow: hidden; }
    .header { ${theme.headerBg.startsWith("linear-gradient") ? `background: ${theme.headerBg}` : `background-color: ${theme.headerBg}`}; padding: 32px 40px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; color: ${theme.textPrimary}; }
    .header p { margin: 8px 0 0 0; font-size: 16px; color: ${theme.textPrimary}; opacity: 0.9; }
    .content { padding: 40px; background-color: ${theme.containerBg}; }
    .content p { margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: ${theme.textPrimary}; }
    .content .secondary { color: ${theme.textSecondary}; }
    .code-box { background-color: ${theme.codeBoxBg}; border: 2px solid ${theme.codeBoxBorder}; border-radius: 12px; padding: 32px 24px; margin: 32px 0; text-align: center; }
    .code-box .label { font-size: 14px; font-weight: 600; color: ${theme.accentPrimary}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
    .code-box .code { font-size: 40px; font-weight: 700; letter-spacing: 8px; color: ${theme.accentPrimary}; font-family: 'Courier New', monospace; }
    .timer-box { background-color: ${theme.timerBoxBg}; border: 1px solid ${theme.timerBoxBorder}; border-radius: 8px; padding: 16px 24px; margin: 32px 0; text-align: center; }
    .timer-box span { font-size: 14px; color: ${theme.textSecondary}; }
    .timer-box .bold { font-weight: 600; color: ${theme.textPrimary}; }
    .footer { padding: 24px 40px; background-color: ${theme.footerBg}; border-top: 1px solid ${theme.footerBorder}; text-align: center; }
    .footer p { font-size: 12px; color: ${theme.textSecondary}; margin: 4px 0; }
    .footer .muted { font-size: 11px; color: ${theme.textMuted}; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>${organizationName}</h1>
      <p>Verification Code</p>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p class="secondary">Your verification code is below. Enter it in your open browser window.</p>
      <div class="code-box">
        <div class="label">Your Code</div>
        <div class="code">${otp}</div>
      </div>
      <div class="timer-box">
        <span class="bold">⏱ Valid for ${otpValidMinutes} minutes</span><br>
        <span>This code will expire soon for security reasons.</span>
      </div>
      <p class="secondary">If you didn't request this code, you can safely ignore this email. Someone else may have typed your email address by mistake.</p>
    </div>
    <div class="footer">
      <p>Powered by <span style="color: ${theme.accentPrimary}; font-weight: 600;">EzStack</span></p>
      <p class="muted">This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>`;

  const colorFields: Array<{ key: keyof EzAuthEmailThemeConfig; label: string }> = [
    { key: "bodyBg", label: "Body Background" },
    { key: "containerBg", label: "Container Background" },
    { key: "containerBorder", label: "Container Border" },
    { key: "headerBg", label: "Header Background" },
    { key: "textPrimary", label: "Primary Text" },
    { key: "textSecondary", label: "Secondary Text" },
    { key: "textMuted", label: "Muted Text" },
    { key: "accentPrimary", label: "Accent Primary" },
    { key: "codeBoxBg", label: "Code Box Background" },
    { key: "codeBoxBorder", label: "Code Box Border" },
    { key: "timerBoxBg", label: "Timer Box Background" },
    { key: "timerBoxBorder", label: "Timer Box Border" },
    { key: "footerBg", label: "Footer Background" },
    { key: "footerBorder", label: "Footer Border" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-lg w-[95vw] h-[90vh] max-w-[1400px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <h2 className="text-xl font-semibold text-white">Custom Email Theme Editor</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 grid grid-cols-2 gap-6 p-6 overflow-hidden">
          {/* Left: Color Pickers */}
          <div className="overflow-y-auto pr-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Color Settings</h3>
              <button
                onClick={handleReset}
                className="text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Reset to Dark Theme
              </button>
            </div>
            {colorFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <label className="block text-sm font-medium text-neutral-300">
                  {field.label}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={localConfig[field.key].startsWith("#") ? localConfig[field.key] : "#000000"}
                    onChange={(e) => handleColorChange(field.key, e.target.value)}
                    className="w-16 h-10 rounded border border-neutral-700 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localConfig[field.key]}
                    onChange={(e) => handleColorChange(field.key, e.target.value)}
                    placeholder="#000000 or linear-gradient(...)"
                    className="flex-1 px-3 py-2 rounded-md border border-neutral-800 bg-neutral-950 text-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Right: Preview */}
          <div className="overflow-hidden flex flex-col">
            <h3 className="text-lg font-medium text-white mb-4">Preview</h3>
            <div className="flex-1 bg-neutral-950 rounded-lg border border-neutral-800 overflow-auto p-4">
              <iframe
                srcDoc={previewHTML}
                className="w-full h-full border-0 rounded"
                style={{ minHeight: "600px" }}
                title="Email Preview"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
          >
            Save Theme
          </button>
        </div>
      </div>
    </div>
  );
}


  const isEnabled = config.enabled || false;

  return (
    <div className="px-6 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Header */}
        <header className="mt-3 md:mt-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-md bg-neutral-800/60 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-neutral-300" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white">
                {service.title}
              </h1>
              <p className="mt-1 text-sm text-neutral-400">
                {service.description}
              </p>
            </div>
            <div className="ml-auto">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) =>
                    handleInputChange("enabled", e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-400/60 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ml-3 text-sm font-medium text-neutral-300">
                  {isEnabled ? "Enabled" : "Disabled"}
                </span>
              </label>
            </div>
          </div>
        </header>

        {/* Settings Section */}
        <section
          ref={settingsRef}
          className={`space-y-6 ${!isEnabled ? "opacity-60" : ""}`}
        >
          {/* Email Theme */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
            <div className="flex items-center justify-between mb-2">
              <label
                className={`block text-sm font-medium ${
                  !isEnabled ? "text-neutral-500" : "text-white"
                }`}
              >
                Email Theme
              </label>
              {config.email_theme === "custom" && isEnabled && (
                <button
                  onClick={() => setIsThemeDialogOpen(true)}
                  className="text-sm text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  Edit Custom Theme
                </button>
              )}
            </div>
            <select
              value={config.email_theme}
              onChange={(e) =>
                handleInputChange("email_theme", e.target.value as "light" | "dark" | "vibrant" | "custom")
              }
              disabled={!isEnabled}
              className={`w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-950 focus:outline-none focus:ring-2 ${
                !isEnabled
                  ? "text-neutral-500 cursor-not-allowed"
                  : "text-neutral-200 focus:ring-emerald-400/60"
              }`}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="vibrant">Vibrant</option>
              <option value="custom">Custom</option>
            </select>
            <p className="mt-2 text-xs text-neutral-500">
              Choose the email theme for OTP notifications.
            </p>
          </div>

          {/* OTP Code Length */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
            <label
              className={`block text-sm font-medium mb-2 ${
                !isEnabled ? "text-neutral-500" : "text-white"
              }`}
            >
              OTP Code Length: {config.otp_code_length}
            </label>
            <input
              type="range"
              min="4"
              max="6"
              value={config.otp_code_length}
              onChange={(e) =>
                handleInputChange("otp_code_length", parseInt(e.target.value))
              }
              disabled={!isEnabled}
              className={`w-full h-2 rounded-lg appearance-none accent-emerald-500 bg-neutral-800 ${
                !isEnabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              }`}
            />
            <div className="flex justify-between text-xs text-neutral-500 mt-1">
              <span>4 digits</span>
              <span>6 digits</span>
            </div>
          </div>

          {/* Rate Limit */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
            <label
              className={`block text-sm font-medium mb-2 ${
                !isEnabled ? "text-neutral-500" : "text-white"
              }`}
            >
              Rate Limit (requests per minute per destination)
            </label>
            <input
              type="number"
              min="1"
              value={config.otp_rate_limit_destination_per_minute}
              onChange={(e) =>
                handleInputChange(
                  "otp_rate_limit_destination_per_minute",
                  parseInt(e.target.value) || 1
                )
              }
              disabled={!isEnabled}
              className={`w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-950 focus:outline-none focus:ring-2 ${
                !isEnabled
                  ? "text-neutral-500 cursor-not-allowed"
                  : "text-neutral-200 focus:ring-emerald-400/60"
              }`}
            />
            <p className="mt-2 text-xs text-neutral-500">
              Maximum number of OTP requests allowed per destination per minute
            </p>
          </div>

          {/* TTL in Seconds */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
            <label
              className={`block text-sm font-medium mb-2 ${
                !isEnabled ? "text-neutral-500" : "text-white"
              }`}
            >
              OTP Time-to-Live (seconds)
            </label>
            <input
              type="number"
              min="60"
              value={config.otp_ttl_seconds}
              onChange={(e) =>
                handleInputChange(
                  "otp_ttl_seconds",
                  parseInt(e.target.value) || 60
                )
              }
              disabled={!isEnabled}
              className={`w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-950 focus:outline-none focus:ring-2 ${
                !isEnabled
                  ? "text-neutral-500 cursor-not-allowed"
                  : "text-neutral-200 focus:ring-emerald-400/60"
              }`}
            />
            <p className="mt-2 text-xs text-neutral-500">
              How long the OTP code remains valid (minimum 60 seconds)
            </p>
          </div>

          {/* Max Verification Attempts */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
            <label
              className={`block text-sm font-medium mb-2 ${
                !isEnabled ? "text-neutral-500" : "text-white"
              }`}
            >
              Maximum Verification Attempts
            </label>
            <input
              type="number"
              min="1"
              value={config.otp_max_verification_attempts}
              onChange={(e) =>
                handleInputChange(
                  "otp_max_verification_attempts",
                  parseInt(e.target.value) || 1
                )
              }
              disabled={!isEnabled}
              className={`w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-950 focus:outline-none focus:ring-2 ${
                !isEnabled
                  ? "text-neutral-500 cursor-not-allowed"
                  : "text-neutral-200 focus:ring-emerald-400/60"
              }`}
            />
            <p className="mt-2 text-xs text-neutral-500">
              Maximum number of attempts allowed to verify an OTP code
            </p>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={(e) => {
              if (!hasChanges || isSaving || !isEnabled) {
                e.preventDefault();
                return;
              }
              handleSave();
            }}
            disabled={!hasChanges || isSaving || !isEnabled}
            className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 ${
              hasChanges && !isSaving && isEnabled
                ? "bg-emerald-600 text-white hover:bg-emerald-500 focus:ring-emerald-400/60"
                : "bg-neutral-800 text-neutral-400 cursor-not-allowed focus:ring-transparent"
            }`}
          >
                         {isSaving ? "Saving..." : "Save Changes"}
           </button>
         </div>

         {/* Email Theme Editor Dialog */}
         {isThemeDialogOpen && (
           <EmailThemeEditorDialog
             isOpen={isThemeDialogOpen}
             onClose={() => setIsThemeDialogOpen(false)}
             themeConfig={config.email_theme_config || darkThemeDefaults}
             onSave={(newThemeConfig) => {
               handleInputChange("email_theme_config", newThemeConfig);
               setIsThemeDialogOpen(false);
             }}
             organizationName="Your Company"
           />
         )}
       </div>
     </div>
   );
 }

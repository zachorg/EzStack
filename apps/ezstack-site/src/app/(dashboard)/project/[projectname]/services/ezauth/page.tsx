"use client";

import { useEffect, useState, use, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { useProjects } from "@/app/components/ProjectsProvider";
import { UserProjectResponse } from "@/__generated__/responseTypes";
import { useSidebar } from "@/app/components/SidebarProvider";
import { PAGE_SECTIONS } from "@/app/pageSections";
import { useService, useProjectServices } from "@/app/components/ProjectServicesProvider";
import { EzAuthServiceConfig } from "@/__generated__/configTypes";
import { productTiles } from "@/lib/products";
import { ShieldCheck } from "lucide-react";

interface EzAuthServicePageProps {
  params: Promise<{
    projectname: string;
  }>;
}

export default function EzAuthServicePage({ params }: EzAuthServicePageProps) {
  const resolvedParams = use(params);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { fetchedProjects, setSelectedProject } = useProjects();
  const { updateServiceSettings } = useProjectServices();
  const { settings: serviceSettings } = useService("ezauth");
  const router = useRouter();
  const [project, setProject] = useState<UserProjectResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Get the ezauth service from products
  const service = productTiles.find((tile) => tile.slug === "ezauth");

  // Local state for the config
  const [config, setConfig] = useState<EzAuthServiceConfig | null>(null);
  const originalConfigRef = useRef<EzAuthServiceConfig | null>(null);

  // Initialize config when service settings are loaded
  useEffect(() => {
    console.log("EzAuthServicePage: serviceSettings", serviceSettings);
    if (serviceSettings?.ezauthConfig) {
      const newConfig = serviceSettings.ezauthConfig;
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
      const hasChanged = JSON.stringify(config) !== JSON.stringify(originalConfigRef.current);
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
          PAGE_SECTIONS({ resolvedParams }).services,
          PAGE_SECTIONS({ resolvedParams }).apiKeys,
          PAGE_SECTIONS({ resolvedParams }).docs,
        ],
      },
    ];

    setSections(dashboardSections);
  }, [setSections, resolvedParams]);

  useEffect(() => {
    // Redirect if not authenticated
    if (!authLoading && !isAuthenticated) {
      router.push("/get-started");
      return;
    }

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
      router.push("/home");
    }

    setIsLoading(false);
  }, [authLoading, isAuthenticated, fetchedProjects, router, setSelectedProject, resolvedParams]);

  const handleInputChange = useCallback(
    async <K extends keyof EzAuthServiceConfig>(field: K, value: EzAuthServiceConfig[K]) => {
      // Auto-save when disabling the service
      if (field === "enabled" && value === false && config?.enabled === true) {
        const updatedConfig = config ? { ...config, [field]: value } : null;
        setConfig(updatedConfig);
        
        if (updatedConfig) {
          setIsSaving(true);
          try {
            await updateServiceSettings("ezauth", updatedConfig);
            originalConfigRef.current = JSON.parse(JSON.stringify(updatedConfig));
            setHasChanges(false);
          } catch (error) {
            console.error("Failed to auto-save on disable:", error);
            // Revert the state on error
            setConfig(config);
          } finally {
            setIsSaving(false);
          }
        }
      } else {
        setConfig((prev) => (prev ? { ...prev, [field]: value } : null));
      }
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
  if (authLoading || isLoading || serviceSettings?.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Loading service settings...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (serviceSettings?.error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-red-400">Error loading service settings: {serviceSettings.error}</p>
        </div>
      </div>
    );
  }

  // If not authenticated or no project found
  if (!isAuthenticated || !project || !service) {
    return null;
  }

  // If no config available, show a message
  if (!config) {
    return (
      <div className="min-h-full p-6 mt-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-8 text-center">
            <ShieldCheck className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              Unable to load configuration
            </h3>
            <p className="text-gray-400">
              Please try refreshing the page or contact support if the issue persists.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isEnabled = config.enabled || false;

  return (
    <div className="min-h-full p-6 mt-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-200">{service.title}</h1>
              <p className="text-gray-400">{service.description}</p>
            </div>
            <div className="ml-auto">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => handleInputChange("enabled", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-3 text-sm font-medium text-gray-300">
                  {isEnabled ? "Enabled" : "Disabled"}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {isEnabled && (
          <div className="space-y-6">
            {/* Organization Name */}
            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Organization Name
              </label>
              <input
                type="text"
                value={config.organization_name}
                onChange={(e) => handleInputChange("organization_name", e.target.value)}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your Company Name"
              />
              <p className="mt-2 text-xs text-gray-500">
                This name will appear on OTP emails and SMS messages
              </p>
            </div>

            {/* OTP Code Length */}
            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>4 digits</span>
                <span>6 digits</span>
              </div>
            </div>

            {/* Rate Limit */}
            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-2 text-xs text-gray-500">
                Maximum number of OTP requests allowed per destination per minute
              </p>
            </div>

            {/* TTL in Seconds */}
            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                OTP Time-to-Live (seconds)
              </label>
              <input
                type="number"
                min="60"
                value={config.otp_ttl_seconds}
                onChange={(e) =>
                  handleInputChange("otp_ttl_seconds", parseInt(e.target.value) || 60)
                }
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-2 text-xs text-gray-500">
                How long the OTP code remains valid (minimum 60 seconds)
              </p>
            </div>

            {/* Max Verification Attempts */}
            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-2 text-xs text-gray-500">
                Maximum number of attempts allowed to verify an OTP code
              </p>
            </div>
          </div>
        )}

        {/* Save Button */}
        {isEnabled && (
          <div className="mt-8 flex justify-end">
            <button
              onClick={(e) => {
                if (!hasChanges || isSaving) {
                  e.preventDefault();
                  return;
                }
                handleSave();
              }}
              disabled={!hasChanges || isSaving}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                hasChanges && !isSaving
                  ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  : "bg-gray-700 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}

        {/* Disabled State */}
        {!isEnabled && (
          <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-8 text-center">
            <ShieldCheck className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              {service.title} is currently disabled
            </h3>
            <p className="text-gray-400">
              Enable {service.title} to start using OTP authentication in your
              application.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


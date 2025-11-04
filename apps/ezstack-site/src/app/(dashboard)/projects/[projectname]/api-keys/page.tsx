"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { useProjects } from "@/app/components/ProjectsProvider";
import {
  CreateApiKeyResponse,
  EzAuthAnalyticsResponse,
  ListApiKeysResponse,
  UserProjectResponse,
} from "@/__generated__/responseTypes";
import CreateApiKeyDialog from "@/app/components/CreateApiKeyDialog";
import RevokeApiKeyDialog from "@/app/components/RevokeApiKeyDialog";
import ViewApiKeyRulesDialog from "@/app/components/ViewApiKeyRulesDialog";
import { apiKeys as apiKeysApi } from "@/lib/api/apikeys";
import { ListApiKeysRequest } from "@/__generated__/requestTypes";
import { useSidebar } from "@/app/components/SidebarProvider";
import {
  ServiceAnalytics,
  useServiceAnalytics,
  useServiceAnalyticsEventListener,
} from "@/app/components/AnalyticsProvider";
import { PAGE_SECTIONS } from "@/app/pageSections";

interface ProjectPageProps {
  params: Promise<{
    projectname: string;
  }>;
}

export default function ApiKeysPage({ params }: ProjectPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { fetchedProjects } = useProjects();
  const [project, setProject] = useState<UserProjectResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [apiKeys, setApiKeys] = useState<ListApiKeysResponse[]>([]);
  const [revokingKey, setRevokingKey] = useState<ListApiKeysResponse | null>(
    null
  );
  const [viewingRulesKey, setViewingRulesKey] =
    useState<ListApiKeysResponse | null>(null);
  const [ezauthAnalytics, setEzauthAnalytics] =
    useState<EzAuthAnalyticsResponse | null>(null);
  const { analytics } = useServiceAnalytics(
    "ezauth",
    resolvedParams.projectname
  );
  const hasFetchedApiKeys = useRef(false);

  useServiceAnalyticsEventListener("ezauth", "analytics_fetched", (event) => {
    const analyticsData = event.data as ServiceAnalytics;
    // Only triggered when ezauth analytics are fetched
    console.log("EzAuth analytics:", event.data);
    // Update totalRequests when analytics data is received
    if (analyticsData && analyticsData.ezauth) {
      setEzauthAnalytics(analyticsData.ezauth);
    }
  });

  useEffect(() => {
    if (analytics) {
      const analyticsData = analytics as ServiceAnalytics;
      if (analyticsData && analyticsData.ezauth) {
        setEzauthAnalytics(analyticsData.ezauth);
      }
    }
  }, [analytics]);

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
    const fetchApiKeys = async () => {
      if (!isAuthenticated || hasFetchedApiKeys.current) {
        return;
      }

      if (!project?.name) {
        return;
      }

      hasFetchedApiKeys.current = true;
      const res = await apiKeysApi.list({
        project_name: project.name,
      } as ListApiKeysRequest);
      setApiKeys(res?.api_keys ?? []);
    };
    fetchApiKeys();
  }, [isAuthenticated, project]);

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

    // Use resolved params to get the project name
    const projectName = resolvedParams.projectname;
    if (projectName) {
      const foundProject = fetchedProjects.projects.find(
        (p) => p.name === projectName
      );
      if (foundProject) {
        setProject(foundProject);
      }
    }

    setIsLoading(false);
  }, [authLoading, isAuthenticated, fetchedProjects, router, resolvedParams]);

  const handleKeyCreated = async (opts: { newKey: CreateApiKeyResponse }) => {
    // Refetch the API keys list to get the complete data including rules
    if (project?.name) {
      hasFetchedApiKeys.current = false;
      try {
        const res = await apiKeysApi.list({
          project_name: project.name,
        } as ListApiKeysRequest);
        setApiKeys(res?.api_keys ?? []);
      } catch (error) {
        console.error("Failed to refresh API keys list:", error);
        // Fallback: Add the new key with default rules if refetch fails
        setApiKeys([
          ...apiKeys,
          {
            ...opts.newKey,
            status: "active" as const,
            api_key_rules: {
              ezauth_send_otp_enabled: false,
              ezauth_verify_otp_enabled: false,
            },
          } as ListApiKeysResponse,
        ]);
      }
    }
    // Note: Dialog will stay open until user clicks "Done" button
    // The CreateApiKeyDialog will close itself when user clicks the close/Done button
  };

  const handleKeyRevoked = async () => {
    if (revokingKey) {
      setApiKeys((apiKeys) =>
        apiKeys.map((key) =>
          key.name === revokingKey.name
            ? { ...key, status: "inactive" as const }
            : key
        )
      );

      setRevokingKey(null);
    }
  };

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-800 dark:border-white mx-auto"></div>
          <p className="text-sm text-neutral-400">Loading API keys...</p>
        </div>
      </div>
    );
  }

  // If not authenticated or no project found
  if (!isAuthenticated || !project) {
    return null;
  }

  return (
    <div className="px-6 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Header */}
        <header className="mt-3 md:mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white">
                API Keys
              </h1>
              <p className="mt-1 text-sm text-neutral-400">
                Manage API keys for {project.name}
              </p>
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
            >
              Create New Key
            </button>
          </div>
        </header>

        {/* API Keys List */}
        <section className="space-y-3">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-white">
              Your API Keys
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              Manage your API keys for accessing project services.
            </p>
          </div>

          <div className="rounded-lg border border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-neutral-900/60 text-neutral-300">
                  <tr className="divide-x divide-neutral-800">
                    <th className="px-3 py-2 font-semibold">Name</th>
                    <th className="px-3 py-2 font-semibold">Key</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {apiKeys.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-neutral-400">
                        No API keys created yet.
                      </td>
                    </tr>
                  ) : (
                    apiKeys.map((key: ListApiKeysResponse) => (
                      <tr
                        key={key.name}
                        className="divide-x divide-neutral-800"
                      >
                        <td className="px-3 py-2 text-neutral-200 whitespace-nowrap truncate">
                          {key.name}
                        </td>
                        <td className="px-3 py-2 text-neutral-400 font-mono whitespace-nowrap truncate">
                          {key.key_prefix}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span
                            className={
                              "text-xs px-2 py-0.5 rounded-full " +
                              (key.status === "active"
                                ? "bg-emerald-900/30 text-emerald-300"
                                : "bg-neutral-800 text-neutral-300")
                            }
                          >
                            {key.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-left text-sm font-medium">
                          <div className="flex items-center gap-3">
                            <button
                              className="text-blue-400 hover:text-blue-300"
                              onClick={() => setViewingRulesKey(key)}
                            >
                              View Rules
                            </button>
                            <button
                              className="text-red-400 hover:text-red-300"
                              onClick={() => setRevokingKey(key)}
                            >
                              Revoke
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Usage Stats */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">
              Total Send OTP Requests
            </h3>
            <div className="text-3xl font-bold text-blue-400">
              {(ezauthAnalytics?.email_send_otp_completed_requests ?? 0) +
                (ezauthAnalytics?.sms_send_otp_completed_requests ?? 0)}
            </div>
            <p className="text-sm text-neutral-400 mt-1">This month</p>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">
              Total Verify OTP Requests
            </h3>
            <div className="text-3xl font-bold text-blue-400">
              {ezauthAnalytics?.verify_otp_completed_requests}
            </div>
            <p className="text-sm text-neutral-400 mt-1">This month</p>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">
              Active Keys
            </h3>
            <div className="text-3xl font-bold text-purple-400">
              {apiKeys.filter((key) => key.status === "active").length}
            </div>
            <p className="text-sm text-neutral-400 mt-1">Currently active</p>
          </div>
        </section>
      </div>

      {/* Create API Key Dialog */}
      {project && (
        <CreateApiKeyDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onCreated={handleKeyCreated}
          projectName={project.name}
          existingNames={apiKeys.map((key) => key.name).filter(Boolean)}
        />
      )}

      {/* Revoke API Key Dialog */}
      {project && revokingKey && (
        <RevokeApiKeyDialog
          isOpen={!!revokingKey}
          onClose={() => setRevokingKey(null)}
          onRevoked={handleKeyRevoked}
          apiKey={revokingKey}
          projectName={project.name}
        />
      )}

      {/* View API Key Rules Dialog */}
      <ViewApiKeyRulesDialog
        isOpen={!!viewingRulesKey}
        onClose={() => setViewingRulesKey(null)}
        apiKey={viewingRulesKey}
      />
    </div>
  );
}

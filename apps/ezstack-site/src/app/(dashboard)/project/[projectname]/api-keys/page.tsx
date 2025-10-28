"use client";

import { useEffect, useState, use, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { useProjects } from "@/app/components/ProjectsProvider";
import {
  CreateApiKeyResponse,
  ListApiKeysResponse,
  UserProjectResponse,
} from "@/__generated__/responseTypes";
import CreateApiKeyDialog from "@/app/components/CreateApiKeyDialog";
import RevokeApiKeyDialog from "@/app/components/RevokeApiKeyDialog";
import { apiKeys as apiKeysApi } from "@/lib/api/apikeys";
import {
  ListApiKeysRequest,
  RevokeApiKeyRequest,
} from "@/__generated__/requestTypes";
import { useSidebar } from "@/app/components/SidebarProvider";
import { AnalyticsEvent, ServiceAnalytics, useServiceAnalytics, useServiceAnalyticsEventListener } from "@/app/components/AnalyticsProvider";

interface ProjectPageProps {
  params: Promise<{
    projectname: string;
  }>;
}

export default function ApiKeysPage({ params }: ProjectPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { fetchedProjects } = useProjects();
  const [project, setProject] = useState<UserProjectResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [apiKeys, setApiKeys] = useState<ListApiKeysResponse[]>([]);
  const [revokingKey, setRevokingKey] = useState<ListApiKeysResponse | null>(
    null
  );
  const [totalRequests, setTotalRequests] = useState(0);
  const { analytics } = useServiceAnalytics("ezauth", resolvedParams.projectname);
  const hasFetchedApiKeys = useRef(false);
  const hasProcessedAnalytics = useRef(false);

  useServiceAnalyticsEventListener("ezauth", "analytics_fetched", (event) => {
    const analyticsData = event.data as ServiceAnalytics;
    // Only triggered when ezauth analytics are fetched
    console.log("EzAuth analytics:", event.data);
    // Update totalRequests when analytics data is received
    if (analyticsData) {
      setTotalRequests(analyticsData.completed_requests);
    }
  });

  useEffect(() => {
    if (analytics && !hasProcessedAnalytics.current) {
      const analyticsData = analytics as ServiceAnalytics;
      setTotalRequests(analyticsData.completed_requests);
      hasProcessedAnalytics.current = true;
    }
  }, [analytics]);

  const { setSections } = useSidebar();
  useEffect(() => {
    const dashboardSections = [
      {
        title: "",
        items: [
          {
            id: "Dashboard",
            name: "Dashboard",
            href: `/project/${resolvedParams.projectname}`,
            icon: (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={800}
                height={800}
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  stroke="currentColor"
                  strokeWidth={1.5}
                  d="M2 12.204c0-2.289 0-3.433.52-4.381.518-.949 1.467-1.537 3.364-2.715l2-1.241C9.889 2.622 10.892 2 12 2c1.108 0 2.11.622 4.116 1.867l2 1.241c1.897 1.178 2.846 1.766 3.365 2.715.519.948.519 2.092.519 4.38v1.522c0 3.9 0 5.851-1.172 7.063C19.657 22 17.771 22 14 22h-4c-3.771 0-5.657 0-6.828-1.212C2 19.576 2 17.626 2 13.725v-1.521Z"
                />
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth={1.5}
                  d="M9 16c.85.63 1.885 1 3 1s2.15-.37 3-1"
                />
              </svg>
            ),
          },
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

    // Extract project name from URL
    const pathname = window.location.pathname;
    const match = pathname.match(/\/project\/([^/]+)/);
    const projectName = match ? match[1] : null;

    if (projectName) {
      // Find the project by name
      const foundProject = fetchedProjects.projects.find(
        (p) => p.name === projectName
      );

      if (foundProject) {
        setProject(foundProject);
      }
    }

    setIsLoading(false);
  }, [authLoading, isAuthenticated, fetchedProjects, router, resolvedParams]);

  const handleKeyCreated = (opts: { newKey: CreateApiKeyResponse }) => {
    // Add the new key to the list but don't close the dialog yet
    // The dialog will remain open so user can copy the key
    setApiKeys([
      ...apiKeys,
      { ...opts.newKey, status: "active" } as ListApiKeysResponse,
    ]);
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Loading API keys...
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated or no project found
  if (!isAuthenticated || !project) {
    return null;
  }

  return (
    <div className="min-h-full p-6 mt-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-200 mb-2">
                API Keys
              </h1>
              <p className="text-gray-400">
                Manage API keys for {project.name}
              </p>
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Create New Key
            </button>
          </div>
        </div>

        {/* API Keys List */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700/50">
            <h2 className="text-lg font-semibold text-gray-200">
              Your API Keys
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Manage your API keys for accessing project services
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-1/4" />
                <col className="w-1/4" />
                <col className="w-1/4" />
                <col className="w-1/4" />
              </colgroup>
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {apiKeys.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <p className="text-gray-400">No API keys created yet</p>
                      <button
                        onClick={() => setShowCreateDialog(true)}
                        className="mt-4 text-blue-400 hover:text-blue-300"
                      >
                        Create your first API key
                      </button>
                    </td>
                  </tr>
                ) : (
                  apiKeys.map((key: ListApiKeysResponse) => (
                    <tr key={key.name} className="hover:bg-gray-800/30">
                      <td className="px-6 py-4 whitespace-nowrap truncate">
                        <div className="text-sm font-medium text-gray-200">
                          {key.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap truncate">
                        <div className="text-sm text-gray-400 font-mono">
                          {key.key_prefix}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            key.status === "active"
                              ? "bg-green-900/30 text-green-400"
                              : "bg-gray-700 text-gray-400"
                          }`}
                        >
                          {key.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                        <button
                          className="text-red-400 hover:text-red-300"
                          onClick={() => setRevokingKey(key)}
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-2">
              Total Requests
            </h3>
            <div className="text-3xl font-bold text-blue-400">{totalRequests}</div>
            <p className="text-sm text-gray-400 mt-1">This month</p>
          </div>

          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-2">
              Active Keys
            </h3>
            <div className="text-3xl font-bold text-purple-400">
              {apiKeys.filter((key) => key.status === "active").length}
            </div>
            <p className="text-sm text-gray-400 mt-1">Currently active</p>
          </div>
        </div>
      </div>

      {/* Create API Key Dialog */}
      {project && (
        <CreateApiKeyDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onCreated={handleKeyCreated}
          projectName={project.name}
          existingNames={apiKeys.map(key => key.name).filter(Boolean)}
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
    </div>
  );
}

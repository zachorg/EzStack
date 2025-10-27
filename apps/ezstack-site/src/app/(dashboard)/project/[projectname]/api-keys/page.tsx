"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { useProjects } from "@/app/components/ProjectsProvider";
import { ListApiKeysResponse, UserProjectResponse } from "@/__generated__/responseTypes";
import CreateApiKeyDialog from "@/app/components/CreateApiKeyDialog";
import { apiKeys as apiKeysApi } from "@/lib/api/apikeys";
import { ListApiKeysRequest } from "@/__generated__/requestTypes";

export default function ApiKeysPage() {
    const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { fetchedProjects } = useProjects();
  const [project, setProject] = useState<UserProjectResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [apiKeys, setApiKeys] = useState<ListApiKeysResponse[]>([]);

  useEffect(() => {
    const fetchApiKeys = async () => {
      const res = await apiKeysApi.list({ project_name: project?.name ?? "" } as ListApiKeysRequest);
      setApiKeys(res?.api_keys ?? []);
    };
    fetchApiKeys();
  }, [project]);

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
  }, [authLoading, isAuthenticated, fetchedProjects, router]);

  const handleKeyCreated = () => {
    // Refresh the API keys list or handle the newly created key
    setShowCreateDialog(false);
    // TODO: Fetch updated API keys list
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
            <h2 className="text-lg font-semibold text-gray-200">Your API Keys</h2>
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
                        <div className="text-sm font-medium text-gray-200">{key.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap truncate">
                        <div className="text-sm text-gray-400 font-mono">{key.key_prefix}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          key.status === 'active' 
                            ? 'bg-green-900/30 text-green-400' 
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {key.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                        <button 
                          className="text-red-400 hover:text-red-300"
                          onClick={() => {
                            // TODO: Implement revoke functionality
                            console.log('Revoke key:', key.name);
                          }}
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
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Total Requests</h3>
            <div className="text-3xl font-bold text-blue-400">0</div>
            <p className="text-sm text-gray-400 mt-1">This month</p>
          </div>
          
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Active Keys</h3>
            <div className="text-3xl font-bold text-purple-400">{apiKeys.length}</div>
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
        />
      )}
    </div>
  );
}


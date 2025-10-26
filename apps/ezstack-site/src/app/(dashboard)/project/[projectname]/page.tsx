"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { useProjects } from "@/app/components/ProjectsProvider";
import { UserProjectResponse } from "@/__generated__/responseTypes";

interface ProjectPageProps {
  params: {
    projectname: string;
  };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { fetchedProjects, setSelectedProject } = useProjects();
  const router = useRouter();
  const [project, setProject] = useState<UserProjectResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      (p) => p.name === params.projectname
    );

    if (foundProject) {
      setProject(foundProject);
      setSelectedProject(foundProject.name);
    } else {
      // Project not found, redirect to home
      router.push("/home");
    }

    setIsLoading(false);
  }, [authLoading, isAuthenticated, fetchedProjects, params.projectname, router, setSelectedProject]);

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Loading project...
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
        {/* Project Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-200 mb-2">
                {project.name}
              </h1>
              <p className="text-gray-400">
                Created: {project.created_at} | Updated: {project.updated_at}
              </p>
            </div>
            <button
              onClick={() => router.push("/home")}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Back to Projects
            </button>
          </div>
        </div>

        {/* Project Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* API Keys Section */}
          <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-6">
            <h2 className="text-xl font-semibold text-gray-200 mb-4">
              API Keys ({project.api_keys.length})
            </h2>
            {project.api_keys.length === 0 ? (
              <p className="text-gray-400">No API keys yet.</p>
            ) : (
              <div className="space-y-2">
                {project.api_keys.map((key, index) => (
                  <div
                    key={index}
                    className="bg-gray-900/50 rounded p-3 border border-gray-700"
                  >
                    <p className="text-sm font-medium text-gray-300">
                      {key.name}
                    </p>
                    <p className="text-xs text-gray-500">{key.key_prefix}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Project Settings */}
          <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-6">
            <h2 className="text-xl font-semibold text-gray-200 mb-4">
              Project Settings
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400">Project Name</label>
                <p className="text-gray-200">{project.name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Project ID</label>
                <p className="text-gray-200 font-mono text-sm">
                  {/* You'll need to add the ID to the response if needed */}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
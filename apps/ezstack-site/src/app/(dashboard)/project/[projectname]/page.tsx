"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { useProjects } from "@/app/components/ProjectsProvider";
import { UserProjectResponse } from "@/__generated__/responseTypes";
import { useSidebar } from "@/app/components/SidebarProvider";

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

  const { setSections } = useSidebar();
  useEffect(() => {
    const dashboardSections = [
      {
        title: "",
        items: [
          {
            id: "API Keys",
            name: "API Keys",
            href: `/project/${params.projectname}/api-keys`,
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
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21.067 5c.592.958.933 2.086.933 3.293 0 3.476-2.83 6.294-6.32 6.294-.636 0-2.086-.146-2.791-.732l-.882.878c-.735.732-.147.732.147 1.317 0 0 .735 1.025 0 2.05-.441.585-1.676 1.404-3.086 0l-.294.292s.881 1.025.147 2.05c-.441.585-1.617 1.17-2.646.146l-1.028 1.024c-.706.703-1.568.293-1.91 0l-.883-.878c-.823-.82-.343-1.708 0-2.05l7.642-7.61s-.735-1.17-.735-2.78c0-3.476 2.83-6.294 6.32-6.294.819 0 1.601.155 2.319.437"
                />
                <path
                  stroke="currentColor"
                  strokeWidth={1.5}
                  d="M17.885 8.294a2.2 2.2 0 0 1-2.204 2.195 2.2 2.2 0 0 1-2.205-2.195 2.2 2.2 0 0 1 2.205-2.196 2.2 2.2 0 0 1 2.204 2.196Z"
                />
              </svg>
            ),
          }
        ],
      },
    ];

    setSections(dashboardSections);
  }, [setSections]);

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
  }, [authLoading, isAuthenticated, fetchedProjects, router, setSelectedProject]);

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
                Created: {project.created_at}
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
          {/* Project Settings */}
          <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-6">
            <h2 className="text-xl font-semibold text-gray-200 mb-4">
              Settings
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400">Project Name</label>
                <p className="text-gray-200">{project.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
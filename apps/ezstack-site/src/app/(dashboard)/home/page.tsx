"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { useSidebar } from "@/app/components/SidebarProvider";
import CreateProjectDialog from "@/app/components/CreateProjectDialog";
import { ezstack_api_fetch } from "@/lib/api/client";
import { UserProjectResponse } from "@/__generated__/responseTypes";
import { useProjects } from "@/app/components/ProjectsProvider";
import { PAGE_SECTIONS } from "@/app/pageSections";

// Project Card Component
function ProjectCard({ project }: { project: UserProjectResponse }) {
  const router = useRouter();
  const handleClick = () => {
    router.push(`/project/${encodeURIComponent(project.name)}`);
  };

  return (
    <button 
      onClick={handleClick}
      className="w-full h-24 p-4 bg-gray-800/50 hover:bg-gray-800/70 rounded-lg border border-gray-700/50 transition-all duration-300 text-left group hover:scale-105 hover:shadow-lg"
    >
      <div className="flex flex-col justify-between h-full">
        <div className="text-left">
          <h3 className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">
            {project.name || "Unnamed Project"}
          </h3>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-400">
            {project.updated_at}
          </span>
        </div>
      </div>
    </button>
  );
}

// Document Components
function ProjectDocument() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [projects, setProjects] = useState<UserProjectResponse[]>([]);
  const { fetchedProjects, addNewProject } = useProjects();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch projects when user is authenticated - only once when page loads
  useEffect(() => {
    const fetchProjects = async () => {  
      if (fetchedProjects) {
        setProjects(fetchedProjects.projects);
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [fetchedProjects]);

  const handleCreateProject = async (projectData: { name: string }) => {
    try {
      await ezstack_api_fetch<null>(
        "/api/v1/userProjects/create",
        {
          method: "POST",
          body: JSON.stringify(projectData),
        }
      );

      addNewProject({
        name: projectData.name,
        created_at: new Date().toLocaleDateString(),
        updated_at: new Date().toLocaleDateString(),
        services: {},
      });

      setProjects([
        ...projects,
        {
          name: projectData.name,
          created_at: new Date().toLocaleDateString(),
          updated_at: new Date().toLocaleDateString(),
          services: {},
        },
      ]);
    } catch (err) {
      console.error("Error creating project:", err);
      setError("Failed to create project");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-200">Projects</h1>

      {/* UI Bar */}
      <div className="flex items-center justify-between mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-400">Manage your projects</span>
        </div>
        <button
          onClick={() => setIsCreateDialogOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center space-x-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>Create New Project</span>
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-400">Loading projects...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Projects Grid */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-400 mb-4">
                No projects yet. Create your first project to get started!
              </p>
            </div>
          ) : (
            projects.map((project, index) => (
              <ProjectCard key={`${project.name}-${index}`} project={project} />
            ))
          )}
        </div>
      )}

      {/* Create Project Dialog */}
      <CreateProjectDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}

export default function Dashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { setSections } = useSidebar();

  useEffect(() => {
    // Only redirect if we're not loading and not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push("/get-started");
    }
  }, [isAuthenticated, isLoading, router]);

  // Set sidebar sections for this page
  useEffect(() => {
    const dashboardSections = [
      {
        title: "",
        items: [
          PAGE_SECTIONS({ resolvedParams: { projectname: "" } }).projects,
          PAGE_SECTIONS({ resolvedParams: { projectname: "" } }).billing,
        ],
      },
    ];

    setSections(dashboardSections);
  }, [setSections]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render anything (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-full p-6 mt-12">
      <ProjectDocument />
    </div>
  );
}

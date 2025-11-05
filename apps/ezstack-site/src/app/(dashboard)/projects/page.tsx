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
    router.push(`/projects/${encodeURIComponent(project.name)}`);
  };

  return (
    <button 
      onClick={handleClick}
      className="w-full h-24 p-4 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 transition-colors duration-200 text-left group"
    >
      <div className="flex flex-col justify-between h-full">
        <div className="text-left">
          <h3 className="text-sm font-semibold text-white">
            {project.name || "Unnamed Project"}
          </h3>
        </div>
        <div className="text-right">
          <span className="text-xs text-neutral-400">
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
        "/api/v1/user/projects/create",
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
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="mt-3 md:mt-4">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white">Projects</h1>
      </header>

      {/* UI Bar */}
      <section>
        <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-neutral-400">Manage your projects</span>
          </div>
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          >
            <svg
              className="w-4 h-4 mr-2"
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
            Create New Project
          </button>
        </div>
      </section>

      {/* Loading State */}
      {isLoading && (
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
            <div className="h-24 bg-neutral-800 rounded-lg"></div>
            <div className="h-24 bg-neutral-800 rounded-lg"></div>
            <div className="h-24 bg-neutral-800 rounded-lg"></div>
            <div className="h-24 bg-neutral-800 rounded-lg"></div>
          </div>
        </section>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Projects Grid */}
      {!isLoading && !error && (
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-neutral-400 mb-4">
                  No projects yet. Create your first project to get started!
                </p>
              </div>
            ) : (
              projects.map((project, index) => (
                <ProjectCard key={`${project.name}-${index}`} project={project} />
              ))
            )}
          </div>
        </section>
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
  const { isLoading } = useAuth();
  const { setSections } = useSidebar();

  // Set sidebar sections for this page
  useEffect(() => {
    const dashboardSections = [
      {
        title: "",
        items: [
          PAGE_SECTIONS({ resolvedParams: { projectname: "" } }).projects,
          PAGE_SECTIONS({ resolvedParams: { projectname: "" } }).billing,
          PAGE_SECTIONS({ resolvedParams: { projectname: "" } }).docs,
        ],
      },
    ];

    setSections(dashboardSections);
  }, [setSections]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="px-6 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
        <div className="mx-auto w-full max-w-6xl space-y-6 animate-pulse">
          <div className="h-10 bg-neutral-800 rounded w-48"></div>
          <div className="h-16 bg-neutral-800 rounded-lg"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="h-24 bg-neutral-800 rounded-lg"></div>
            <div className="h-24 bg-neutral-800 rounded-lg"></div>
            <div className="h-24 bg-neutral-800 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
      <ProjectDocument />
    </div>
  );
}

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { ezstack_api_fetch } from "@/lib/api/client";
import { useAuth } from "./AuthProvider";
import { ListUserProjectsResponse, UserProjectResponse } from "@/__generated__/responseTypes";

interface ProjectsContextType {
  fetchedProjects: ListUserProjectsResponse | null;
  // _internalSetFetchedProjects: (projects: ListUserProjectsResponse) => void;
  selectedProject: string | null;
  setSelectedProject: (name: string | null) => boolean;
  addNewProject: (project: UserProjectResponse) => void;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(
  undefined
);

interface ProjectsProviderProps {
  children: ReactNode;
}

export function ProjectsProvider({ children }: ProjectsProviderProps) {
  const [selectedProject, setSelectedProjectState] = useState<string | null>(
    null
  );
  const [fetchedProjects, _internalSetFetchedProjects] =
    useState<ListUserProjectsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Fetch projects when user is authenticated - only once when authenticated
  useEffect(() => {
    const fetchProjects = async () => {
      if (!isAuthenticated || authLoading) return;

      try {
        setIsLoading(true);

        const response = await ezstack_api_fetch<ListUserProjectsResponse>(
          "/api/v1/user/projects/list",
          {
            method: "POST",
            body: JSON.stringify({}),
          }
        );

        if (response.projects) {
          console.log(
            "ProjectsProvider: response.projects",
            JSON.stringify(response.projects)
          );
          _internalSetFetchedProjects(response);
        } else {
          console.error("Failed to fetch projects");
        }
      } catch (err) {
        console.error("Error fetching projects:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [isAuthenticated, authLoading]); // Only fetch when authenticated

  // Wrapper function that validates the project name
  const setSelectedProject = useCallback(
    (name: string | null): boolean => {
      // If setting to null, always allow it
      if (name === null) {
        setSelectedProjectState(null);
        return true;
      }

      // Check if the project exists in fetched projects
      const projectExists = fetchedProjects?.projects?.some(
        (project) => project.name === name
      );

      if (projectExists) {
        setSelectedProjectState(name);
        return true;
      }

      return false;
    },
    [fetchedProjects]
  );

  const addNewProject = useCallback(
    (project: UserProjectResponse): void => {
      _internalSetFetchedProjects(prev => ({
        ...prev,
        projects: [...prev?.projects || [], project],
      }));
    },
    [_internalSetFetchedProjects]
  );

  const value = useMemo(
    () => ({
      fetchedProjects,
      selectedProject,
      setSelectedProject,
      addNewProject,
      isLoading,
    }),
    [fetchedProjects, selectedProject, setSelectedProject, addNewProject, isLoading]
  );

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (context === undefined) {
    throw new Error("useProjects must be used within a ProjectsProvider");
  }
  return context;
}

export function useViewProject() {
  const { setSelectedProject } = useProjects();
  return {
    viewProject: (name: string) => setSelectedProject(name),
  };
}

export function useExitProject() {
  const { setSelectedProject } = useProjects();
  return {
    exitProject: () => setSelectedProject(null),
  };
}

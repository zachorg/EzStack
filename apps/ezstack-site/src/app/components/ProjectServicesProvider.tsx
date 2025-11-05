"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import { useProjects } from "./ProjectsProvider";
import { useAuth } from "./AuthProvider";
import { ezstack_api_fetch } from "@/lib/api/client";
import { EzAuthServiceConfig } from "@/__generated__/configTypes";
import { EzAuthServiceUpdateRequest } from "@/__generated__/requestTypes";

// Service types based on your modular ecosystem
export type ServiceId = "ezauth" | string;

// Service settings interface
export interface ServiceSettings {
  serviceId: ServiceId;
  ezauthConfig?: Omit<EzAuthServiceConfig, "organization_name">;
  lastUpdated: string;
  error: string | null;
  lastFetchTime: number | null;
  isLoading: boolean;
}

// Project service settings state
export interface ProjectServiceSettingsState {
  settings: Record<ServiceId, ServiceSettings>;
}

interface ProjectServicesContextType {
  // State - this is reactive and will trigger re-renders
  state: ProjectServiceSettingsState;

  // Fetch service settings for the current project
  fetchServiceSettings: (serviceId: ServiceId) => Promise<void>;
  refreshServiceSettings: (serviceId: ServiceId) => Promise<void>;
  clearServiceSettings: (serviceId: ServiceId) => void;
  clearSettingsError: () => void;

  // Update service settings
  updateServiceSettings: (
    serviceId: ServiceId,
    config: Omit<EzAuthServiceConfig, "organization_name">
  ) => Promise<void>;

  // Get service settings
  getServiceSettings: (serviceId: ServiceId) => ServiceSettings | null;
  getAllServiceSettings: () => Record<ServiceId, ServiceSettings>;
  getServiceSettingsState: () => ProjectServiceSettingsState;
}

const ProjectServicesContext = createContext<
  ProjectServicesContextType | undefined
>(undefined);

interface ProjectServicesProviderProps {
  children: ReactNode;
}

export function ProjectServicesProvider({
  children,
}: ProjectServicesProviderProps) {
  const [state, setState] = useState<ProjectServiceSettingsState>({
    settings: {},
  });

  // Keep a ref to the current state to avoid dependency issues
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const { selectedProject } = useProjects();
  const { isAuthenticated } = useAuth();

  // Clear error
  const clearSettingsError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Clear all service settings
  const clearServiceSettings = useCallback(() => {
    setState({
      settings: {},
    });
  }, []);

  // Fetch service settings for a specific project
  const fetchServiceSettings = useCallback(
    async (serviceId: ServiceId) => {
      if (!selectedProject || !isAuthenticated) {
        return;
      }

      // Set loading state
      setState((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          [serviceId]: {
            serviceId,
            ezauthConfig: undefined,
            lastUpdated: new Date().toISOString(),
            error: null,
            lastFetchTime: null,
            isLoading: true,
          },
        },
      }));

      try {
        const response = await ezstack_api_fetch<
          Omit<EzAuthServiceConfig, "organization_name">
        >(
          `/api/v1/user/projects/services/${serviceId}/config/${selectedProject}`,
          {
            method: "GET",
          }
        );

        console.log("ProjectServicesProvider: response", response);

        setState((prev) => ({
          ...prev,
          settings: {
            ...prev.settings,
            [serviceId]: {
              serviceId,
              ezauthConfig: response as Omit<
                EzAuthServiceConfig,
                "organization_name"
              >,
              lastUpdated: new Date().toISOString(),
              error: null,
              lastFetchTime: Date.now(),
              isLoading: false,
            },
          },
        }));
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to fetch project services";

        setState((prev) => ({
          ...prev,
          settings: {
            ...prev.settings,
            [serviceId]: {
              serviceId,
              ezauthConfig: undefined,
              lastUpdated: new Date().toISOString(),
              error: errorMessage,
              lastFetchTime: Date.now(),
              isLoading: false,
            },
          },
        }));

        console.error("Error fetching project service settings:", err);
      }
    },
    [isAuthenticated, selectedProject]
  );

  // Refresh service settings for current project
  const refreshServiceSettings = useCallback(
    async (serviceId: ServiceId) => {
      await fetchServiceSettings(serviceId);
    },
    [fetchServiceSettings]
  );

  // Update service settings
  const updateServiceSettings = useCallback(
    async (
      serviceId: ServiceId,
      config: Omit<EzAuthServiceConfig, "organization_name">
    ) => {
      if (!selectedProject || !isAuthenticated) {
        throw new Error("No project selected or not authenticated");
      }

      try {
        const request: EzAuthServiceUpdateRequest = {
          ...config,
          project_name: selectedProject,
        };

        await ezstack_api_fetch(
          `/api/v1/user/projects/services/${serviceId}/config/update`,
          {
            method: "POST",
            body: JSON.stringify(request),
          }
        );

        // Refresh the settings after update
        await fetchServiceSettings(serviceId);
      } catch (err) {
        console.error("Error updating service settings:", err);
        throw err;
      }
    },
    [selectedProject, isAuthenticated, fetchServiceSettings]
  );

  // Get service settings by ID
  const getServiceSettings = useCallback(
    (serviceId: ServiceId): ServiceSettings | null => {
      return stateRef.current.settings[serviceId] || null;
    },
    []
  );

  // Get all service settings
  const getAllServiceSettings = useCallback((): Record<
    ServiceId,
    ServiceSettings
  > => {
    return stateRef.current.settings;
  }, []);

  // Get current state
  const getServiceSettingsState =
    useCallback((): ProjectServiceSettingsState => {
      return stateRef.current;
    }, []);

  // Clear service settings when project changes or user logs out
  useEffect(() => {
    if (!selectedProject || !isAuthenticated) {
      clearServiceSettings();
    }
  }, [selectedProject, isAuthenticated, clearServiceSettings]);

  const contextValue: ProjectServicesContextType = useMemo(
    () => ({
      state,
      fetchServiceSettings,
      refreshServiceSettings,
      clearServiceSettings,
      clearSettingsError,
      updateServiceSettings,
      getServiceSettings,
      getAllServiceSettings,
      getServiceSettingsState,
    }),
    [
      state,
      fetchServiceSettings,
      refreshServiceSettings,
      clearServiceSettings,
      clearSettingsError,
      updateServiceSettings,
      getServiceSettings,
      getAllServiceSettings,
      getServiceSettingsState,
    ]
  );

  return (
    <ProjectServicesContext.Provider value={contextValue}>
      {children}
    </ProjectServicesContext.Provider>
  );
}

// Hook to use project services context
export function useProjectServices() {
  const context = useContext(ProjectServicesContext);
  if (context === undefined) {
    throw new Error(
      "useProjectServices must be used within a ProjectServicesProvider"
    );
  }
  return context;
}

// Hook to get a specific service settings
export function useService(serviceId: ServiceId) {
  const { state, fetchServiceSettings } = useProjectServices();
  const { selectedProject } = useProjects();
  const { isAuthenticated } = useAuth();

  // Track if we've initiated a fetch for this service
  const fetchedRef = useRef<Set<ServiceId>>(new Set());
  const selectedProjectRef = useRef<string | null>(null);

  // Keep refs up to date and reset fetched set when project changes
  useEffect(() => {
    if (selectedProjectRef.current !== selectedProject) {
      fetchedRef.current.clear();
    }
    selectedProjectRef.current = selectedProject;
  }, [selectedProject]);

  // Auto-fetch if not already loaded
  useEffect(() => {
    if (!isAuthenticated || !selectedProject) {
      return;
    }

    const currentServiceId = serviceId;

    // Don't fetch if already fetched for this service
    if (fetchedRef.current.has(currentServiceId)) {
      return;
    }

    const serviceSettings = state.settings[currentServiceId];
    const isLoading = serviceSettings?.isLoading || false;
    const ezauthConfig = serviceSettings?.ezauthConfig;
    // Only fetch if we don't have data and we're not already loading
    if (!ezauthConfig && !isLoading) {
      // Only fetch once on mount
      if (!fetchedRef.current.has(currentServiceId)) {
        fetchedRef.current.add(currentServiceId);
        fetchServiceSettings(currentServiceId);
      }
    }
  }, [
    isAuthenticated,
    serviceId,
    state.settings,
    fetchServiceSettings,
    selectedProject,
  ]);

  return {
    settings: state.settings[serviceId] || null,
  };
}

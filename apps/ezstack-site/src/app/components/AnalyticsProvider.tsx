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
import { ProjectAnalyticsResponse } from "@/__generated__/responseTypes";
import { ProjectAnalyticsRequest } from "@/__generated__/requestTypes";

// Service types based on your modular ecosystem
export type ServiceType = "ezauth" | "ezpayments" | "eznotify" | string;

// Generic analytics data interface
export interface ServiceAnalytics {
  serviceId: ServiceType;
  projectName: string;
  lastUpdated: string;
  // Add specific metrics based on the service
  [key: string]: any;
}

// Event types for analytics lifecycle (now service-specific)
export type AnalyticsEventType =
  | "analytics_fetching"
  | "analytics_fetched"
  | "analytics_error"
  | "analytics_cleared";

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  serviceId: ServiceType;
  data?: ServiceAnalytics | string;
  timestamp: number;
}

// Service-level analytics state
export interface ServiceAnalyticsState {
  data: ServiceAnalytics | null;
  error: string | null;
  lastFetchTime: number | null;
  isLoading: boolean;
}

// Event callback type (now receives service-specific events)
type AnalyticsEventListener = (event: AnalyticsEvent) => void;

interface AnalyticsContextType {
  // Service-specific actions
  fetchServiceAnalytics: (
    serviceId: ServiceType,
    projectName: string
  ) => Promise<void>;
  refreshServiceAnalytics: (serviceId: ServiceType) => Promise<void>;
  clearServiceAnalytics: (serviceId: ServiceType) => void;
  clearAllAnalytics: () => void;
  clearServiceError: (serviceId: ServiceType) => void;

  // Event system (service-specific)
  onServiceEvent: (
    serviceId: ServiceType,
    eventType: AnalyticsEventType,
    listener: AnalyticsEventListener
  ) => () => void;
  emitServiceEvent: (event: AnalyticsEvent) => void;

  // Utility getters
  getServiceAnalytics: (serviceId: ServiceType) => ServiceAnalytics | null;
  getServiceState: (serviceId: ServiceType) => ServiceAnalyticsState;
  isLoadingServiceAnalytics: (serviceId: ServiceType) => boolean;
  getServiceError: (serviceId: ServiceType) => string | null;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(
  undefined
);

interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  // Store analytics state per service
  const [servicesState, setServicesState] = useState<
    Map<ServiceType, ServiceAnalyticsState>
  >(new Map());

  // Keep a ref to the current servicesState to avoid dependency issues
  const servicesStateRef = useRef(servicesState);
  useEffect(() => {
    servicesStateRef.current = servicesState;
  }, [servicesState]);

  // Event listeners map: serviceId -> eventType -> Set<listener>
  const [eventListeners, setEventListeners] = useState<
    Map<ServiceType, Map<AnalyticsEventType, Set<AnalyticsEventListener>>>
  >(new Map());

  const { selectedProject } = useProjects();
  const { isAuthenticated } = useAuth();

  // Get or create service state - using ref to access current state without dependency
  const getServiceState = useCallback(
    (serviceId: ServiceType): ServiceAnalyticsState => {
      return (
        servicesStateRef.current.get(serviceId) || {
          data: null,
          error: null,
          lastFetchTime: null,
          isLoading: false,
        }
      );
    },
    []
  );

  // Emit event to service-specific listeners
  const emitServiceEvent = useCallback(
    (event: AnalyticsEvent) => {
      const serviceListeners = eventListeners.get(event.serviceId);
      if (serviceListeners) {
        const listeners = serviceListeners.get(event.type);
        if (listeners) {
          listeners.forEach((listener) => listener(event));
        }
      }
    },
    [eventListeners]
  );

  // Register service-specific event listener and return unsubscribe function
  const onServiceEvent = useCallback(
    (
      serviceId: ServiceType,
      eventType: AnalyticsEventType,
      listener: AnalyticsEventListener
    ) => {
      setEventListeners((prev) => {
        const newMap = new Map(prev);

        if (!newMap.has(serviceId)) {
          newMap.set(serviceId, new Map());
        }

        const serviceMap = newMap.get(serviceId)!;
        if (!serviceMap.has(eventType)) {
          serviceMap.set(eventType, new Set());
        }

        serviceMap.get(eventType)!.add(listener);
        return newMap;
      });

      // Return unsubscribe function
      return () => {
        setEventListeners((prev) => {
          const newMap = new Map(prev);
          const serviceMap = newMap.get(serviceId);

          if (serviceMap) {
            const listeners = serviceMap.get(eventType);
            if (listeners) {
              listeners.delete(listener);
              if (listeners.size === 0) {
                serviceMap.delete(eventType);
              }
            }
            if (serviceMap.size === 0) {
              newMap.delete(serviceId);
            }
          }

          return newMap;
        });
      };
    },
    []
  );

  // Clear error for a specific service
  const clearServiceError = useCallback((serviceId: ServiceType) => {
    setServicesState((prev) => {
      const newMap = new Map(prev);
      const state = newMap.get(serviceId);
      if (state) {
        newMap.set(serviceId, { ...state, error: null });
      }
      return newMap;
    });
  }, []);

  // Clear analytics for a specific service
  const clearServiceAnalytics = useCallback(
    (serviceId: ServiceType) => {
      setServicesState((prev) => {
        const newMap = new Map(prev);
        newMap.set(serviceId, {
          data: null,
          error: null,
          lastFetchTime: null,
          isLoading: false,
        });
        return newMap;
      });

      emitServiceEvent({
        type: "analytics_cleared",
        serviceId,
        timestamp: Date.now(),
      });
    },
    [emitServiceEvent]
  );

  // Clear all analytics
  const clearAllAnalytics = useCallback(() => {
    const serviceIds = Array.from(servicesStateRef.current.keys());

    // Emit events before clearing
    serviceIds.forEach((serviceId) => {
      emitServiceEvent({
        type: "analytics_cleared",
        serviceId,
        timestamp: Date.now(),
      });
    });

    setServicesState(new Map());
  }, [emitServiceEvent]);

  // Fetch analytics for a specific service
  const fetchServiceAnalytics = useCallback(
    async (serviceId: ServiceType, projectName: string) => {
      if (!projectName || !isAuthenticated || !serviceId) {
        return;
      }

      // Set loading state
      setServicesState((prev) => {
        const newMap = new Map(prev);
        const currentState = prev.get(serviceId) || {
          data: null,
          error: null,
          lastFetchTime: null,
          isLoading: false,
        };
        newMap.set(serviceId, {
          ...currentState,
          isLoading: true,
          error: null,
        });
        return newMap;
      });

      // Emit fetching event
      emitServiceEvent({
        type: "analytics_fetching",
        serviceId,
        data: projectName,
        timestamp: Date.now(),
      });

      try {
        let serviceAnalytics: ServiceAnalytics = {
          serviceId,
          projectName,
          lastUpdated: new Date().toISOString(),
        };

        if (serviceId === "ezauth") {
          const response = await ezstack_api_fetch<ProjectAnalyticsResponse>(
            `/api/v1/analytics/ezauth/send-otp/usage-by-project`,
            {
              method: "GET",
              headers: JSON.parse(
                JSON.stringify({
                  project_name: projectName,
                } as ProjectAnalyticsRequest)
              ),
            }
          );

          serviceAnalytics.completed_requests = response.completed_requests;
          serviceAnalytics.completed_monthly_requests =
            response.completed_monthly_requests;

          console.log("ProjectAnalyticsResponse", response);
        }

        setServicesState((prev) => {
          const newMap = new Map(prev);
          newMap.set(serviceId, {
            data: serviceAnalytics,
            error: null,
            lastFetchTime: Date.now(),
            isLoading: false,
          });
          return newMap;
        });

        // Emit fetched event
        emitServiceEvent({
          type: "analytics_fetched",
          serviceId,
          data: serviceAnalytics,
          timestamp: Date.now(),
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : `Failed to fetch ${serviceId} analytics`;

        setServicesState((prev) => {
          const newMap = new Map(prev);
          const currentState = prev.get(serviceId) || {
            data: null,
            error: null,
            lastFetchTime: null,
            isLoading: false,
          };
          newMap.set(serviceId, {
            ...currentState,
            error: errorMessage,
            isLoading: false,
          });
          return newMap;
        });

        // Emit error event
        emitServiceEvent({
          type: "analytics_error",
          serviceId,
          data: errorMessage,
          timestamp: Date.now(),
        });

        console.error(`Error fetching ${serviceId} analytics:`, err);
      }
    },
    [isAuthenticated, emitServiceEvent]
  );

  // Refresh analytics for a specific service
  const refreshServiceAnalytics = useCallback(
    async (serviceId: ServiceType) => {
      if (selectedProject) {
        await fetchServiceAnalytics(serviceId, selectedProject);
      }
    },
    [fetchServiceAnalytics, selectedProject]
  );

  // Get analytics for a specific service
  const getServiceAnalytics = useCallback(
    (serviceId: ServiceType): ServiceAnalytics | null => {
      return servicesStateRef.current.get(serviceId)?.data || null;
    },
    []
  );

  // Check if a service is loading
  const isLoadingServiceAnalytics = useCallback(
    (serviceId: ServiceType): boolean => {
      return servicesStateRef.current.get(serviceId)?.isLoading || false;
    },
    []
  );

  // Get error for a specific service
  const getServiceError = useCallback(
    (serviceId: ServiceType): string | null => {
      return servicesStateRef.current.get(serviceId)?.error || null;
    },
    []
  );

  // Clear all analytics when project changes or user logs out
  useEffect(() => {
    if (!selectedProject || !isAuthenticated) {
      clearAllAnalytics();
    }
  }, [selectedProject, isAuthenticated, clearAllAnalytics]);

  const contextValue: AnalyticsContextType = useMemo(
    () => ({
      fetchServiceAnalytics,
      refreshServiceAnalytics,
      clearServiceAnalytics,
      clearAllAnalytics,
      clearServiceError,
      onServiceEvent,
      emitServiceEvent,
      getServiceAnalytics,
      getServiceState,
      isLoadingServiceAnalytics,
      getServiceError,
    }),
    [
      fetchServiceAnalytics,
      refreshServiceAnalytics,
      clearServiceAnalytics,
      clearAllAnalytics,
      clearServiceError,
      onServiceEvent,
      emitServiceEvent,
      getServiceAnalytics,
      getServiceState,
      isLoadingServiceAnalytics,
      getServiceError,
    ]
  );

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
}

// Hook to use analytics context
export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return context;
}

// Hook to get analytics for a specific service
export function useServiceAnalytics(
  serviceId: ServiceType,
  projectName: string
) {
  const {
    getServiceAnalytics,
    fetchServiceAnalytics,
    isLoadingServiceAnalytics,
    getServiceError,
  } = useAnalytics();
  const { isAuthenticated } = useAuth();

  // Track if we've initiated a fetch for this service/project combo
  const fetchedRef = useRef<string>("");
  const serviceIdRef = useRef<ServiceType>(serviceId);
  const projectNameRef = useRef<string>(projectName);

  // Keep refs up to date
  useEffect(() => {
    serviceIdRef.current = serviceId;
    projectNameRef.current = projectName;
  }, [serviceId, projectName]);

  // Auto-fetch if not already loaded
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const currentServiceId = serviceIdRef.current;
    const currentProjectName = projectNameRef.current;
    const fetchKey = `${currentServiceId}-${currentProjectName}`;

    if (
      currentServiceId &&
      currentProjectName &&
      fetchedRef.current !== fetchKey
    ) {
      const analytics = getServiceAnalytics(currentServiceId);
      const isLoading = isLoadingServiceAnalytics(currentServiceId);

      // Only fetch if we don't have data and we're not already loading
      if (!analytics && !isLoading) {
        console.log(
          "Fetching analytics for",
          currentServiceId,
          currentProjectName
        );
        fetchedRef.current = fetchKey;
        fetchServiceAnalytics(currentServiceId, currentProjectName);
      }
    }
  }, [isAuthenticated]);

  // Get current values using useMemo to prevent recreation
  const analytics = useMemo(
    () => getServiceAnalytics(serviceId),
    [getServiceAnalytics, serviceId]
  );
  const isLoading = useMemo(
    () => isLoadingServiceAnalytics(serviceId),
    [isLoadingServiceAnalytics, serviceId]
  );
  const error = useMemo(
    () => getServiceError(serviceId),
    [getServiceError, serviceId]
  );

  return {
    analytics,
    isLoadingServiceAnalytics: isLoading,
    error,
  };
}

// Hook to listen to service-specific analytics events
export function useServiceAnalyticsEventListener(
  serviceId: ServiceType,
  eventType: AnalyticsEventType,
  listener: AnalyticsEventListener
) {
  const { onServiceEvent } = useAnalytics();
  
  // Use a ref to store the latest listener to avoid re-subscribing on every render
  const listenerRef = useRef<AnalyticsEventListener>(listener);
  
  // Update the ref whenever the listener changes
  useEffect(() => {
    listenerRef.current = listener;
  }, [listener]);

  useEffect(() => {
    if (!serviceId) return;

    // Create a wrapper that calls the latest listener
    const wrappedListener: AnalyticsEventListener = (event) => {
      listenerRef.current(event);
    };

    const unsubscribe = onServiceEvent(serviceId, eventType, wrappedListener);
    return unsubscribe;
  }, [serviceId, eventType, onServiceEvent]);
}

// Hook to manually control service analytics fetching
export function useServiceAnalyticsControl(serviceId: ServiceType) {
  const {
    fetchServiceAnalytics,
    refreshServiceAnalytics,
    clearServiceAnalytics,
    clearServiceError,
    isLoadingServiceAnalytics: isServiceLoading,
    getServiceError: hasServiceError,
    getServiceAnalytics,
  } = useAnalytics();
  const { selectedProject } = useProjects();

  const fetch = useCallback(() => {
    if (selectedProject) {
      return fetchServiceAnalytics(serviceId, selectedProject);
    }
  }, [serviceId, selectedProject, fetchServiceAnalytics]);

  const refresh = useCallback(() => {
    return refreshServiceAnalytics(serviceId);
  }, [serviceId, refreshServiceAnalytics]);

  const clear = useCallback(() => {
    clearServiceAnalytics(serviceId);
  }, [serviceId, clearServiceAnalytics]);

  const clearError = useCallback(() => {
    clearServiceError(serviceId);
  }, [serviceId, clearServiceError]);

  return {
    analytics: getServiceAnalytics(serviceId),
    isLoading: isServiceLoading(serviceId),
    error: hasServiceError(serviceId),
    fetch,
    refresh,
    clear,
    clearError,
  };
}

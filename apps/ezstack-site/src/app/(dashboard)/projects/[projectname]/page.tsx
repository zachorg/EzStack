"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { useProjects } from "@/app/components/ProjectsProvider";
import { UserProjectResponse } from "@/__generated__/responseTypes";
import { useSidebar } from "@/app/components/SidebarProvider";
import { PAGE_SECTIONS } from "@/app/pageSections";
import { productTiles, type ProductTile } from "@/lib/products";
import { useService } from "@/app/components/ProjectServicesProvider";
import { useServiceAnalytics } from "@/app/components/AnalyticsProvider";
import {  Send, CheckCircle2, Activity, ChevronDown, LucideIcon } from "lucide-react";

interface ProjectPageProps {
  params: Promise<{
    projectname: string;
  }>;
}

// Helper component to show enabled service cards
function EnabledServiceCard({ service, projectname }: { service: ProductTile; projectname: string }) {
  const router = useRouter();
  const Icon = service.icon;
  
  const handleClick = () => {
    if (service.status === "available") {
      router.push(`/projects/${projectname}/services/${service.slug}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-4 p-4 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 transition-colors duration-200 text-left group"
    >
      <div className="w-12 h-12 rounded-md bg-neutral-800/60 flex items-center justify-center">
        <Icon className="w-6 h-6 text-neutral-300" />
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-white">{service.title}</h3>
        <p className="text-xs text-neutral-400 mt-1">{service.description}</p>
      </div>
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-900/30 text-emerald-300">
        Enabled
      </span>
    </button>
  );
}

// Analytics stats card component
function AnalyticsStatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-neutral-400">{title}</span>
        <Icon className="w-4 h-4 text-neutral-500" />
      </div>
      <div className="text-2xl font-bold text-white">{value.toLocaleString()}</div>
      {subtitle && <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// Bar chart component for monthly data
function MonthlyBarChart({ data, title }: { data: Record<string, number>; title: string }) {
  // Sort by month/year ascending
  const sortedEntries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  const maxValue = Math.max(...sortedEntries.map(([, value]) => value), 1);

  return (
    <div className="w-full">
      <h4 className="text-sm font-medium text-neutral-400 mb-4">{title}</h4>
      <div className="relative">
        {/* Y-axis labels */}
        <div className="flex items-end h-64 gap-2">
          {sortedEntries.map(([month, value]) => (
            <div key={month} className="flex-1 flex flex-col items-center">
              <div className="flex-1 w-full flex items-end mb-2">
                <div
                  className="w-full bg-emerald-500 rounded-t transition-all duration-300 hover:bg-emerald-400"
                  style={{
                    height: `${(value / maxValue) * 100}%`,
                    minHeight: value > 0 ? "4px" : "0",
                  }}
                  title={`${month}: ${value.toLocaleString()}`}
                />
              </div>
              {/* X-axis label */}
              <div className="text-xs text-neutral-500 truncate w-full text-center">
                {new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
              </div>
            </div>
          ))}
        </div>
        {/* Y-axis scale */}
        <div className="absolute left-0 top-0 h-64 flex flex-col justify-between text-xs text-neutral-600">
          <span>{maxValue.toLocaleString()}</span>
          <span>{Math.round(maxValue / 2).toLocaleString()}</span>
          <span>0</span>
        </div>
      </div>
    </div>
  );
}

// Service analytics section component
function ServiceAnalyticsSection({ 
  enabledServices, 
  projectname 
}: { 
  enabledServices: ProductTile[]; 
  projectname: string;
}) {
  const [selectedService, setSelectedService] = useState<string | null>(
    enabledServices.length > 0 ? enabledServices[0].slug : null
  );
  const [selectedMetric, setSelectedMetric] = useState<string>("send_otp");

  const { analytics, isLoadingServiceAnalytics } = useServiceAnalytics(
    selectedService || "", 
    projectname
  );

  // If no enabled services, show message
  if (enabledServices.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
        <div className="text-center py-8">
          <Activity className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <p className="text-neutral-400">No analytics available. Enable a service to view analytics.</p>
        </div>
      </div>
    );
  }

  // If no service selected yet, don't show anything
  if (!selectedService) {
    return null;
  }

  if (isLoadingServiceAnalytics) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Service Selection Dropdown */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-400 mb-2">Service</label>
            <div className="relative">
              <select
                value={selectedService}
                onChange={(e) => {
                  setSelectedService(e.target.value);
                  setSelectedMetric("send_otp");
                }}
                className="appearance-none w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60 cursor-pointer"
              >
                {enabledServices.map((service) => (
                  <option key={service.slug} value={service.slug}>
                    {service.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            </div>
          </div>

          {/* Metric Selection Dropdown (only for EzAuth) */}
          {selectedService === "ezauth" && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-neutral-400 mb-2">Metric</label>
              <div className="relative">
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="appearance-none w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60 cursor-pointer"
                >
                  <option value="send_otp">OTP Send</option>
                  <option value="verify_otp">OTP Verified</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-neutral-800 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-20 bg-neutral-800 rounded"></div>
            <div className="h-20 bg-neutral-800 rounded"></div>
            <div className="h-20 bg-neutral-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // If no analytics data yet, show empty state
  if (!analytics || !analytics.ezauth) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Service Selection Dropdown */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-400 mb-2">Service</label>
            <div className="relative">
              <select
                value={selectedService}
                onChange={(e) => {
                  setSelectedService(e.target.value);
                  setSelectedMetric("send_otp");
                }}
                className="appearance-none w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60 cursor-pointer"
              >
                {enabledServices.map((service) => (
                  <option key={service.slug} value={service.slug}>
                    {service.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            </div>
          </div>

          {/* Metric Selection Dropdown (only for EzAuth) */}
          {selectedService === "ezauth" && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-neutral-400 mb-2">Metric</label>
              <div className="relative">
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="appearance-none w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60 cursor-pointer"
                >
                  <option value="send_otp">OTP Send</option>
                  <option value="verify_otp">OTP Verified</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        <div className="text-center py-8">
          <Activity className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <p className="text-neutral-400">No analytics data available yet.</p>
        </div>
      </div>
    );
  }

  const ezauthData = analytics.ezauth;
  const isEzAuth = selectedService === "ezauth";

  // Get the right monthly data based on selected metric
  const monthlyData = isEzAuth && selectedMetric === "send_otp"
    ? ezauthData.send_otp_completed_monthly_requests
    : ezauthData.verify_otp_completed_monthly_requests;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Service Selection Dropdown */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-neutral-400 mb-2">Service</label>
          <div className="relative">
            <select
              value={selectedService}
              onChange={(e) => {
                setSelectedService(e.target.value);
                // Reset metric when switching services
                setSelectedMetric("send_otp");
              }}
              className="appearance-none w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60 cursor-pointer"
            >
              {enabledServices.map((service) => (
                <option key={service.slug} value={service.slug}>
                  {service.title}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          </div>
        </div>

        {/* Metric Selection Dropdown (only for EzAuth) */}
        {isEzAuth && (
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-400 mb-2">Metric</label>
            <div className="relative">
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="appearance-none w-full px-3 py-2 rounded-md border border-neutral-800 bg-neutral-950 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60 cursor-pointer"
              >
                <option value="send_otp">OTP Send</option>
                <option value="verify_otp">OTP Verified</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <AnalyticsStatCard
          title="OTPs Sent"
          value={ezauthData.send_otp_completed_requests || 0}
          subtitle="Total sent"
          icon={Send}
        />
        <AnalyticsStatCard
          title="OTPs Verified"
          value={ezauthData.verify_otp_completed_requests || 0}
          subtitle="Total verified"
          icon={CheckCircle2}
        />
        <AnalyticsStatCard
          title="Monthly Requests"
          value={Object.values(monthlyData || {}).reduce((sum, val) => sum + val, 0) || 0}
          subtitle="Current period"
          icon={Activity}
        />
      </div>

      {/* Bar Chart */}
      <div className="border-t border-neutral-800 pt-6">
        <MonthlyBarChart
          data={monthlyData || {}}
          title={selectedMetric === "send_otp" ? "OTPs Sent Over Time" : "OTPs Verified Over Time"}
        />
      </div>
    </div>
  );
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const resolvedParams = use(params);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { fetchedProjects, setSelectedProject } = useProjects();
  const router = useRouter();
  const [project, setProject] = useState<UserProjectResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get service settings to check enabled status
  const ezauthService = useService("ezauth");

  const { setSections } = useSidebar();
  useEffect(() => {
    const dashboardSections = [
      {
        title: "",
        items: [
          PAGE_SECTIONS({ resolvedParams }).dashboard,
          PAGE_SECTIONS({ resolvedParams }).services,
          PAGE_SECTIONS({ resolvedParams }).apiKeys,
        ],
      },
    ];

    setSections(dashboardSections);
  }, [setSections, resolvedParams]);

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
      (p) => p.name === resolvedParams.projectname
    );

    if (foundProject) {
      setProject(foundProject);
      setSelectedProject(foundProject.name);
    } else {
      // Project not found, redirect to home
      router.push("/projects");
    }

    setIsLoading(false);
  }, [authLoading, isAuthenticated, fetchedProjects, router, setSelectedProject, resolvedParams]);

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-800 dark:border-white mx-auto"></div>
          <p className="text-sm text-neutral-400">
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

  // Get enabled services
  const enabledServices = productTiles.filter((service) => {
    if (service.slug === "ezauth") {
      return ezauthService?.settings?.ezauthConfig?.enabled;
    }
    return false;
  });

  return (
    <div className="px-6 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Project Header */}
        <header className="mt-3 md:mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white">{project.name}</h1>
              <p className="mt-1 text-sm text-neutral-400">Created: {project.created_at}</p>
            </div>
            <button
              onClick={() => router.push("/projects")}
              className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
            >
              Back to Projects
            </button>
          </div>
        </header>

        {/* Enabled Services Section */}
        {enabledServices.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Enabled Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enabledServices.map((service) => (
                <EnabledServiceCard
                  key={service.slug}
                  service={service}
                  projectname={resolvedParams.projectname}
                />
              ))}
            </div>
          </section>
        )}

        {/* Analytics Section */}
        {enabledServices.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">Analytics</h2>
            <ServiceAnalyticsSection enabledServices={enabledServices} projectname={resolvedParams.projectname} />
          </section>
        )}
      </div>
    </div>
  );
}
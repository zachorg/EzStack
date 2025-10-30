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
import { Sparkles } from "lucide-react";

interface ServicesPageProps {
  params: Promise<{
    projectname: string;
  }>;
}

// Service Card Component
function EzAuthStatusBadge() {
  const { settings } = useService("ezauth");
  const enabled = settings?.ezauthConfig?.enabled;
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
      enabled
        ? "bg-emerald-900/30 text-emerald-300"
        : "bg-emerald-900/30 text-emerald-300"
    }`}>
      {enabled ? "Enabled" : "Available"}
    </span>
  );
}

function ServiceCard({ service, projectname }: { service: ProductTile, projectname: string }) {
  const Icon = service.icon;
  const isAvailable = service.status === "available";
  const isComingSoon = service.status === "coming_soon";
  const router = useRouter();

  const handleClick = () => {
    if (isAvailable) {
      router.push(`/projects/${projectname}/services/${service.slug}`);
    }
  };

  return (
    <div className="w-full h-full min-h-[320px] overflow-hidden rounded-lg">
      <button
        className="group relative w-full h-full rounded-lg border border-neutral-800 bg-neutral-900/50 transition-colors duration-200 hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!isAvailable}
        onClick={handleClick}
      >
        {/* Content */}
        <div className="relative space-y-4 p-6">
          {/* Icon */}
          <div className="w-14 h-14 rounded-md bg-neutral-800/60 flex items-center justify-center mb-2">
            <Icon className="w-7 h-7 text-neutral-300" />
          </div>

          {/* Title and Status */}
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">
              {service.title}
            </h3>
            {isComingSoon && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-900/30 text-amber-300">
                Coming Soon
              </span>
            )}
            {isAvailable && (
              service.slug === "ezauth" ? (
                <EzAuthStatusBadge />
              ) : (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-900/30 text-emerald-300">
                  Available
                </span>
              )
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-neutral-400 text-left">
            {service.description}
          </p>

          {/* Bullets */}
          <ul className="space-y-2 text-left">
            {service.bullets.slice(0, 3).map((bullet, index) => (
              <li key={index} className="flex items-start space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-300 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-neutral-500">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      </button>
    </div>
  );
}

export default function ServicesPage({ params }: ServicesPageProps) {
  const resolvedParams = use(params);
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
          <p className="text-sm text-neutral-400">Loading services...</p>
        </div>
      </div>
    );
  }

  // If not authenticated or no project found
  if (!isAuthenticated || !project) {
    return null;
  }

  return (
    <div className="px-6 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Header */}
        <header className="mt-3 md:mt-4">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white">Available Services</h1>
          <p className="mt-1 text-sm text-neutral-400">Select a service to integrate and manage.</p>
        </header>

        {/* Services Grid */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productTiles.map((service) => (
              <ServiceCard key={service.slug} service={service} projectname={resolvedParams.projectname} />
            ))}
          </div>
        </section>

        {/* Info Section */}
        <section>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
            <div className="flex items-start space-x-4">
              <Sparkles className="w-6 h-6 text-emerald-300 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">More services coming soon</h3>
                <p className="text-sm text-neutral-400">
                  We&apos;re constantly expanding our offerings. Subscribe to our newsletter to stay updated on new features and services.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


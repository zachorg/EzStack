"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { useProjects } from "@/app/components/ProjectsProvider";
import { UserProjectResponse } from "@/__generated__/responseTypes";
import { useSidebar } from "@/app/components/SidebarProvider";
import { PAGE_SECTIONS } from "@/app/pageSections";
import { productTiles, type ProductTile } from "@/lib/products";
import { Sparkles } from "lucide-react";

interface ServicesPageProps {
  params: Promise<{
    projectname: string;
  }>;
}

// Service Card Component
function ServiceCard({ service, projectname }: { service: ProductTile, projectname: string }) {
  const Icon = service.icon;
  const isAvailable = service.status === "available";
  const isComingSoon = service.status === "coming_soon";
  const router = useRouter();

  const handleClick = () => {
    if (isAvailable) {
      router.push(`/project/${projectname}/services/${service.slug}`);
    }
  };

  return (
    <div className="w-full h-full min-h-[320px] overflow-hidden rounded-2xl">
      <button
        className="group relative w-full h-full bg-gradient-to-br from-gray-900/90 to-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 transition-all duration-300 hover:border-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!isAvailable}
        onClick={handleClick}
      >
        {/* Animated gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
        
        {/* Content */}
        <div className="relative space-y-4 p-6">
        {/* Icon */}
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-7 h-7 text-blue-400" />
        </div>

        {/* Title and Status */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-200 group-hover:text-white transition-colors">
            {service.title}
          </h3>
          {isComingSoon && (
            <span className="px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full">
              Coming Soon
            </span>
          )}
          {isAvailable && (
            <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 rounded-full">
              Available
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors text-left">
          {service.description}
        </p>

        {/* Bullets */}
        <ul className="space-y-2 text-left">
          {service.bullets.slice(0, 3).map((bullet, index) => (
            <li key={index} className="flex items-start space-x-2">
              <Sparkles className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <span className="text-xs text-gray-500">{bullet}</span>
            </li>
          ))}
        </ul>

        {/* Click indicator */}
        {isAvailable && (
          <div className="flex items-center text-blue-400 text-sm font-medium mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
            Click to Integrate
            <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Shine effect on hover */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] opacity-0 group-hover:opacity-100 transition-all duration-1000 rounded-2xl" />
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
          PAGE_SECTIONS({ resolvedParams }).docs,
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
      router.push("/home");
    }

    setIsLoading(false);
  }, [authLoading, isAuthenticated, fetchedProjects, router, setSelectedProject, resolvedParams]);

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Loading services...
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-200 mb-2">
            Available Services
          </h1>
          <p className="text-gray-400">
            Select a service to integrate and manage
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {productTiles.map((service) => (
            <ServiceCard key={service.slug} service={service} projectname={resolvedParams.projectname} />
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-12 p-6 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 rounded-2xl border border-blue-500/20">
          <div className="flex items-start space-x-4">
            <Sparkles className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-gray-200 mb-2">
                More services coming soon
              </h3>
              <p className="text-sm text-gray-400">
                We're constantly expanding our service offerings. Subscribe to our newsletter to stay updated on new features and services.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


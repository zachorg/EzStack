"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSidebar } from "@/app/components/SidebarProvider";
import { PAGE_SECTIONS } from "@/app/pageSections";
import { productTiles, type ProductTile } from "@/lib/products";
import { Sparkles } from "lucide-react";

// Service Card Component
function ServiceCard({ service }: { service: ProductTile }) {
  const Icon = service.icon;
  const isAvailable = service.status === "available";
  const isComingSoon = service.status === "coming_soon";
  const router = useRouter();

  const handleClick = () => {
    if (isAvailable) {
      router.push(`/services/${service.slug}`);
    }
  };

  return (
    <div className="w-full h-full min-h-[320px] overflow-hidden rounded-2xl">
      <button
        className="group relative w-full h-full rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/90 to-gray-900/50 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/50 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:border-gray-800"
        disabled={!isAvailable}
        onClick={handleClick}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
        {/* Content */}
        <div className="relative space-y-4 p-6">
          {/* Icon */}
          <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mb-2">
            <Icon className="w-7 h-7 text-blue-400" />
          </div>

          {/* Title and Status */}
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">
              {service.title}
            </h3>
            {isComingSoon && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-900/30 text-amber-300 border border-amber-500/30">
                Coming Soon
              </span>
            )}
            {isAvailable && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-900/30 text-emerald-300 border border-emerald-500/30">
                Available
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-gray-400 text-left">
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
        </div>
      </button>
    </div>
  );
}

export default function ServicesPage() {
  const router = useRouter();
  const { setSections } = useSidebar();

  useEffect(() => {
    const mainSections = [
      {
        title: "",
        items: [
            PAGE_SECTIONS({ resolvedParams: { projectname: "" } }).home,
            PAGE_SECTIONS({ resolvedParams: { projectname: "" } }).home_services,
            PAGE_SECTIONS({ resolvedParams: { projectname: "" } }).docs,
        ],
      },
    ];

    setSections(mainSections);
  }, [setSections]);

  return (
    <div className="relative font-sans w-full">
      {/* Animated Gradient Background */}
      <div
        className="fixed inset-0 -z-10 overflow-hidden"
        style={{ background: "#0D0D0D" }}
      ></div>

      <div className="max-w-6xl mx-auto px-6">
        {/* Hero Section */}
        <section className="relative pt-20 pb-24">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-300">
                  Explore our service offerings
                </span>
              </div>

              {/* Main Heading */}
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight">
                <span className="bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-transparent">
                  Available
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent animate-gradient">
                  Services
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-xl sm:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                Select a service to learn more about features and pricing.
              </p>
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="relative py-16">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {productTiles.map((service) => (
                <ServiceCard key={service.slug} service={service} />
              ))}
            </div>
          </div>
        </section>

        {/* Info Section */}
        <section className="relative py-16">
          <div className="max-w-6xl mx-auto">
            <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/90 to-gray-900/50 backdrop-blur-sm p-8 hover:border-blue-500/50 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              <div className="relative flex items-start space-x-4">
                <Sparkles className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">More services coming soon</h3>
                  <p className="text-sm text-gray-400">
                    We&apos;re constantly expanding our offerings. Subscribe to our newsletter to stay updated on new features and services.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


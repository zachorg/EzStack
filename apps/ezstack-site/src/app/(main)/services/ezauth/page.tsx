"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSidebar } from "@/app/components/SidebarProvider";
import { PAGE_SECTIONS } from "@/app/pageSections";
import { productTiles } from "@/lib/products";
import { ShieldCheck, Sparkles } from "lucide-react";

export default function EzAuthServicePage() {
  const router = useRouter();
  const { setSections } = useSidebar();
  const [activeTab, setActiveTab] = useState<"features" | "pricing">("features");

  // Get the ezauth service from products
  const service = productTiles.find((tile) => tile.slug === "ezauth");

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

  // If service not found
  if (!service) {
    return (
      <div className="relative font-sans w-full">
        <div
          className="fixed inset-0 -z-10 overflow-hidden"
          style={{ background: "#0D0D0D" }}
        ></div>
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/90 to-gray-900/50 backdrop-blur-sm p-8 text-center">
            <ShieldCheck className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Service not found
            </h3>
            <p className="text-gray-400">
              The requested service could not be found.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
                  Production-ready authentication
                </span>
              </div>

              {/* Main Heading */}
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight">
                <span className="bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-transparent">
                  {service.title}
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-xl sm:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                {service.description}
              </p>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <section className="relative py-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setActiveTab("features")}
                className={`group relative rounded-2xl border p-4 text-left focus:outline-none focus:ring-2 transition-all duration-300 ${
                  activeTab === "features"
                    ? "border-blue-500/50 bg-gradient-to-br from-gray-900/90 to-gray-900/50 backdrop-blur-sm focus:ring-blue-400/60"
                    : "border-gray-800 bg-gradient-to-br from-gray-900/90 to-gray-900/50 backdrop-blur-sm hover:border-blue-500/50 hover:scale-105 focus:ring-blue-400/60"
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent transition-opacity rounded-2xl ${
                  activeTab === "features" ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`} />
                <div className="relative">
                  <div className="text-white font-medium">Features</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Explore everything included in EzAuth
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pricing")}
                className={`group relative rounded-2xl border p-4 text-left focus:outline-none focus:ring-2 transition-all duration-300 ${
                  activeTab === "pricing"
                    ? "border-blue-500/50 bg-gradient-to-br from-gray-900/90 to-gray-900/50 backdrop-blur-sm focus:ring-blue-400/60"
                    : "border-gray-800 bg-gradient-to-br from-gray-900/90 to-gray-900/50 backdrop-blur-sm hover:border-blue-500/50 hover:scale-105 focus:ring-blue-400/60"
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent transition-opacity rounded-2xl ${
                  activeTab === "pricing" ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`} />
                <div className="relative">
                  <div className="text-white font-medium">Pricing</div>
                  <div className="text-xs text-gray-400 mt-1">
                    See plans and usage-based pricing
                  </div>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* Tab Content */}
        {activeTab === "features" && (
          <section className="relative py-16">
            <div className="max-w-6xl mx-auto">
              <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/90 to-gray-900/50 backdrop-blur-sm p-8 hover:border-blue-500/50 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                <div className="relative">
                  <h3 className="text-lg font-semibold text-white">
                    What you get with EzAuth
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {service.description}
                  </p>
                  <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {service.bullets?.map((bullet) => (
                      <li key={bullet} className="text-sm text-gray-300">
                        • {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "pricing" && (
          <section className="relative py-16">
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/90 to-gray-900/50 backdrop-blur-sm p-8 hover:border-blue-500/50 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                <div className="relative">
                  <h3 className="text-lg font-semibold text-white">Pricing</h3>
                  <p className="text-sm text-gray-400 mt-2">
                    Usage-based pricing only. No plans.
                  </p>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-gray-900/30 backdrop-blur-sm p-4 hover:border-blue-500/50 transition-all duration-300">
                      <div className="text-white font-medium">Sending OTP</div>
                      <ul className="mt-3 text-sm text-gray-300 space-y-1">
                        <li>• Flat 0.01¢ per send</li>
                        <li>• 20 sends free per month</li>
                      </ul>
                    </div>
                    <div className="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-gray-900/30 backdrop-blur-sm p-4 hover:border-blue-500/50 transition-all duration-300">
                      <div className="text-white font-medium">Verifying OTP</div>
                      <ul className="mt-3 text-sm text-gray-300 space-y-1">
                        <li>• Flat 0.002¢ per verification</li>
                        <li>• 20 verifications free per month</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Why EzAuth is Better */}
              <div className="group relative rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-gray-900/50 backdrop-blur-sm p-8 hover:border-blue-500/50 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                <div className="relative">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Why EzAuth is Better Than Competitors
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-gray-900/30 backdrop-blur-sm p-4 hover:border-blue-500/50 transition-all duration-300">
                      <div className="text-blue-400 font-medium mb-2">💰 Cheap & Affordable</div>
                      <p className="text-sm text-gray-300">
                        Our flat-rate pricing is significantly cheaper than competitors who charge tier-based fees or hidden costs. No surprise charges, no complex pricing tiers—just transparent, affordable rates.
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-gray-900/30 backdrop-blur-sm p-4 hover:border-blue-500/50 transition-all duration-300">
                      <div className="text-blue-400 font-medium mb-2">🔄 Flexible & Scalable</div>
                      <p className="text-sm text-gray-300">
                        No rigid plans or locked-in contracts. Pay only for what you use, scale up or down anytime without penalty. Perfect for growing businesses and startups.
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-gray-900/30 backdrop-blur-sm p-4 hover:border-blue-500/50 transition-all duration-300">
                      <div className="text-blue-400 font-medium mb-2">✨ No Hidden Fees</div>
                      <p className="text-sm text-gray-300">
                        Unlike competitors with setup fees, monthly minimums, or overage charges, we keep it simple. What you see is what you pay—nothing more, nothing less.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 p-4 rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-gray-900/30 backdrop-blur-sm">
                    <p className="text-sm text-gray-300">
                      <span className="font-medium text-white">Start free, scale affordably:</span>{" "}
                      Get 20 free sends and verifications every month, then pay only 0.01¢ per send and 0.002¢ per verification. Compare that to competitors charging 5-10x more with complex tiered pricing and hidden fees.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}


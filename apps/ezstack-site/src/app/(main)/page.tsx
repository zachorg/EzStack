"use client";

import Link from "next/link";
import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSidebar } from "../components/SidebarProvider";
import { AuroraBackground } from "../components/aurora-background";
import { CodeExample } from "../components/code-example";
import { BentoGrid } from "../components/bento-grid";
import { Section } from "../components/section";
import { FeaturesBentoGrid } from "../components/features-bento-grid";
import { Footer } from "../components/Footer";
import { useIsAuthenticated, useAuth } from "../components/AuthProvider";
import { useLoginDialog } from "../components/LoginDialogProvider";
import { Zap, Shield, Gauge, Code2, ArrowRight, Sparkles } from "lucide-react";
import { PAGE_SECTIONS } from "../pageSections";

function HomeContent() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const { isLoading } = useAuth();
  const { setSections } = useSidebar();
  const { openDialog } = useLoginDialog();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if(isAuthenticated && !isLoading) {
      router.push("/projects");
    }
  }, [router, isAuthenticated, isLoading]);

  // Set sidebar sections for main page
  useEffect(() => {
    const mainSections = [
      {
        title: "",
        items: [
          PAGE_SECTIONS({ resolvedParams: { projectname: "" } }).projects,
          PAGE_SECTIONS({ resolvedParams: { projectname: "" } }).docs,
        ],
      },
    ];
    
    setSections(mainSections);
  }, [setSections]);

  // Show loading state until auth is resolved
  if (isLoading) {
    return (
      <div className="relative font-sans space-y-16">
        <AuroraBackground />
        <section className="relative text-center space-y-6 pt-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Loading...
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if(isAuthenticated) {
    return null;
  }
  
  return (
    <div className="relative font-sans w-full">
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden" style={{background: '#0D0D0D'}}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{animationDuration: '4s'}} />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDuration: '6s'}} />
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {/* Hero Section */}
        <section className="relative pt-20 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-300">Ship customer workflows in minutes</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight">
              <span className="bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-transparent">
                Build faster with
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent animate-gradient">
                EzStack
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-xl sm:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Production-ready authentication, payments, and analytics APIs.
              <br />
              <span className="text-gray-500">Built for developers who ship fast.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              {!isAuthenticated && (
                <button
                  onClick={openDialog}
                  className="group relative px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105"
                >
                  <span className="flex items-center gap-2">
                    Start building free
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
              )}
              <Link
                href="/docs"
                className="px-8 py-4 rounded-xl border border-gray-700 bg-gray-800/50 backdrop-blur-sm text-white font-semibold text-lg hover:bg-gray-800 hover:border-gray-600 transition-all duration-300"
              >
                View documentation
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-12">
              <div className="space-y-1">
                <div className="text-3xl font-bold text-white">99.9%</div>
                <div className="text-sm text-gray-500">Uptime</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-white">&lt;100ms</div>
                <div className="text-sm text-gray-500">Latency</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-white">10M+</div>
                <div className="text-sm text-gray-500">API Calls</div>
              </div>
            </div>
          </div>
        </div>
      </section>

        {/* Code Example Section */}
        <section className="relative py-16">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Code2 className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-semibold text-white">Quick Start Example</h3>
            </div>
            <CodeExample />
          </div>
        </div>
      </section>

        {/* Key Features Grid */}
        <section className="relative py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Everything you need to ship
            </h2>
            <p className="text-xl text-gray-400">
              Powerful features that scale with your application
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature Card 1 */}
            <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/90 to-gray-900/50 backdrop-blur-sm p-8 hover:border-blue-500/50 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Lightning Fast</h3>
                <p className="text-gray-400">Sub-100ms response times with global edge deployment</p>
              </div>
            </div>

            {/* Feature Card 2 */}
            <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/90 to-gray-900/50 backdrop-blur-sm p-8 hover:border-purple-500/50 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Enterprise Security</h3>
                <p className="text-gray-400">Bank-grade encryption and compliance out of the box</p>
              </div>
            </div>

            {/* Feature Card 3 */}
            <div className="group relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/90 to-gray-900/50 backdrop-blur-sm p-8 hover:border-green-500/50 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                  <Gauge className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Auto-Scaling</h3>
                <p className="text-gray-400">From zero to millions of requests seamlessly</p>
              </div>
            </div>
          </div>
        </div>
      </section>

        {/* Products Section */}
        <section className="relative py-16">
        <div className="max-w-6xl mx-auto">
          <Section
            title="Product Suite"
            description="Add modules as you grow. EzAuth is available today; more coming soon."
          >
            <BentoGrid />
          </Section>
        </div>
      </section>

        {/* How it Works */}
        <section className="relative py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              How it works
            </h2>
            <p className="text-xl text-gray-400">
              Collect → Send/Verify → Handle cooldown/429
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="relative group rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/90 to-gray-900/50 backdrop-blur-sm p-8 hover:border-blue-500/50 transition-all duration-300">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/50">
                1
              </div>
              <h3 className="text-xl font-semibold text-white mb-3 mt-4">Collect</h3>
              <p className="text-gray-400">
                Gather destination (email/phone) and request a code through our simple API.
              </p>
            </div>

            <div className="relative group rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/90 to-gray-900/50 backdrop-blur-sm p-8 hover:border-purple-500/50 transition-all duration-300">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-purple-500/50">
                2
              </div>
              <h3 className="text-xl font-semibold text-white mb-3 mt-4">Send & Verify</h3>
              <p className="text-gray-400">
                Use the Firebase proxy to send and verify one-time codes securely.
              </p>
            </div>

            <div className="relative group rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/90 to-gray-900/50 backdrop-blur-sm p-8 hover:border-green-500/50 transition-all duration-300">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-green-500/50">
                3
              </div>
              <h3 className="text-xl font-semibold text-white mb-3 mt-4">Handle Cooldown</h3>
              <p className="text-gray-400">
                Respect 429s with Retry-After for per-destination rate limits automatically.
              </p>
            </div>
          </div>

          <div className="mt-8 text-center text-sm">
            <Link href="/docs/ezauth/overview" className="text-blue-400 hover:text-blue-300 transition-colors">
              Read the docs
            </Link>
            <span className="mx-3 text-gray-600">·</span>
            <Link href="/docs/ezauth/otp" className="text-blue-400 hover:text-blue-300 transition-colors">
              Implement with AI
            </Link>
          </div>
        </div>
      </section>

        {/* Why EzStack */}
        <section className="relative py-16">
        <div className="max-w-6xl mx-auto">
          <Section title="Why EzStack">
            <FeaturesBentoGrid />
          </Section>
        </div>
      </section>

        {/* Final CTA */}
        {!isAuthenticated && (
          <section className="relative py-20">
          <div className="max-w-4xl mx-auto">
            <div className="relative rounded-3xl border border-gray-800 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-blue-600/20 backdrop-blur-xl p-12 text-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
              <div className="relative">
                <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                  Ready to build something amazing?
                </h2>
                <p className="text-xl text-gray-300 mb-8">
                  Start for free. No credit card required.
                </p>
                <button
                  onClick={openDialog}
                  className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105"
                >
                  Get started now
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </section>
        )}
      </div>

      {/* Footer - Full width outside container */}
      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="relative font-sans min-h-screen">
        <div className="fixed inset-0 -z-10" style={{background: '#0D0D0D'}} />
      </div>
    }>
      <div className="relative">
        <HomeContent />
      </div>
    </Suspense>
  );
}

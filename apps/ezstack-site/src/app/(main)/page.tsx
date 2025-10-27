"use client";

import Link from "next/link";
import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSidebar } from "../components/SidebarProvider";
import { AuroraBackground } from "../components/aurora-background";
import { CodeExample } from "../components/code-example";
import { BentoGrid } from "../components/bento-grid";
import { Section } from "../components/section";
import { CtaBand } from "../components/cta-band";
import { FeaturesBentoGrid } from "../components/features-bento-grid";
import { useIsAuthenticated, useAuth } from "../components/AuthProvider";
import { useLoginDialog } from "../components/LoginDialogProvider";

function HomeContent() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const { isLoading } = useAuth();
  const { setSections } = useSidebar();
  const { openDialog } = useLoginDialog();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if(isAuthenticated && !isLoading) {
      router.push("/home");
    }
  }, [router, isAuthenticated, isLoading]);

  // Set sidebar sections for main page
  useEffect(() => {
    const mainSections = [
      {
        title: "",
        items: [
          {
            id: "home",
            name: "Home",
            href: "/",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            ),
          }
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
    <div className="relative font-sans space-y-16">
      <AuroraBackground />
      <section className="relative text-center sm:text-left space-y-6 pt-6">
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight">
          The easiest way to ship customer workflows.
        </h1>
        <p className="text-lg text-foreground/80 max-w-2xl mx-auto sm:mx-0">
          Start with EzAuth—OTP & email codes with idempotent sends, per-destination rate
          limits, and tenant-aware plans. Add EzPayments, EzAnalytics as you grow.
        </p>
        <div className="flex gap-3 justify-center sm:justify-start">
        {!isAuthenticated && <button
            onClick={openDialog}
            className="rounded-full border border-transparent bg-foreground text-background px-5 h-12 inline-flex items-center justify-center text-sm sm:text-base font-medium hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Sign in
          </button>}
          <Link
            href="/docs"
            className="rounded-full border border-black/[.08] dark:border-white/[.145] px-5 h-12 inline-flex items-center justify-center text-sm sm:text-base font-medium hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a]"
          >
            Explore docs
          </Link>
        </div>
        <div className="mt-8">
          <CodeExample />
        </div>
      </section>

      <Section
        title="Product suite"
        description="Add modules as you grow. EzAuth is available today; more coming soon."
      >
        <BentoGrid />
      </Section>

      <Section
        title="How it works"
        description="Collect → Send/Verify → Handle cooldown/429."
      >
        <ol className="grid gap-4 sm:grid-cols-3 text-sm">
          <li className="rounded-lg border border-black/[.08] dark:border-white/[.145] p-4">
            <p className="font-medium mb-1">Collect</p>
            <p className="text-foreground/75">Gather destination (email/phone) and request a code.</p>
          </li>
          <li className="rounded-lg border border-black/[.08] dark:border-white/[.145] p-4">
            <p className="font-medium mb-1">Send & verify</p>
            <p className="text-foreground/75">Use the Firebase proxy to send and verify one-time codes.</p>
          </li>
          <li className="rounded-lg border border-black/[.08] dark:border-white/[.145] p-4">
            <p className="font-medium mb-1">Handle cooldown</p>
            <p className="text-foreground/75">Respect 429s with Retry-After for per-destination limits.</p>
          </li>
        </ol>
        <div className="mt-3 text-sm">
          <Link href="/docs/ezauth/overview" className="underline">Read the docs</Link>
          <span className="mx-2">·</span>
          <Link href="/docs/ezauth/otp" className="underline">Implement with AI</Link>
        </div>
      </Section>

      <Section title="Why EzStack">
        <FeaturesBentoGrid />
      </Section>

      {!isAuthenticated && <CtaBand />}

      {/* Login Dialog */}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="relative font-sans space-y-16"><AuroraBackground /></div>}>
      <div className="min-h-full p-6">
        <HomeContent />
      </div>
    </Suspense>
  );
}

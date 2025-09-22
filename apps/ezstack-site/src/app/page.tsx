import Link from "next/link";
import { AuroraBackground } from "./components/aurora-background";
import { CodeExample } from "./components/code-example";
import { BentoGrid } from "./components/bento-grid";
import { Section } from "./components/section";
import { CtaBand } from "./components/cta-band";

export default async function Home() {
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
          <Link
            href="/get-started"
            className="rounded-full border border-transparent bg-foreground text-background px-5 h-12 inline-flex items-center justify-center text-sm sm:text-base font-medium hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Get started
          </Link>
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
        <ul className="grid gap-2 sm:grid-cols-2 text-sm">
          <li>OTP/OTE in one call</li>
          <li>Idempotent sends</li>
          <li>Per-destination rate limits</li>
          <li>Standardized errors with Retry-After</li>
          <li>Tenant-aware plans</li>
        </ul>
      </Section>

      <CtaBand />
    </div>
  );
}

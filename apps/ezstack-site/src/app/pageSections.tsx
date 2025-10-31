export function PAGE_SECTIONS({
  resolvedParams,
}: {
  resolvedParams: { projectname: string };
}) {
  return {
    dashboard: {
      id: "Dashboard",
      name: "Dashboard",
      href: `/projects/${resolvedParams.projectname}`,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M2 12.204c0-2.289 0-3.433.52-4.381.518-.949 1.467-1.537 3.364-2.715l2-1.241C9.889 2.622 10.892 2 12 2c1.108 0 2.11.622 4.116 1.867l2 1.241c1.897 1.178 2.846 1.766 3.365 2.715.519.948.519 2.092.519 4.38v1.522c0 3.9 0 5.851-1.172 7.063C19.657 22 17.771 22 14 22h-4c-3.771 0-5.657 0-6.828-1.212C2 19.576 2 17.626 2 13.725v-1.521Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 16c.85.63 1.885 1 3 1s2.15-.37 3-1"
          />
        </svg>
      ),
    },
    apiKeys: {
      id: "API Keys",
      name: "API Keys",
      href: `/projects/${resolvedParams.projectname}/api-keys`,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21.067 5c.592.958.933 2.086.933 3.293 0 3.476-2.83 6.294-6.32 6.294-.636 0-2.086-.146-2.791-.732l-.882.878c-.735.732-.147.732.147 1.317 0 0 .735 1.025 0 2.05-.441.585-1.676 1.404-3.086 0l-.294.292s.881 1.025.147 2.05c-.441.585-1.617 1.17-2.646.146l-1.028 1.024c-.706.703-1.568.293-1.91 0l-.883-.878c-.823-.82-.343-1.708 0-2.05l7.642-7.61s-.735-1.17-.735-2.78c0-3.476 2.83-6.294 6.32-6.294.819 0 1.601.155 2.319.437"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17.885 8.294a2.2 2.2 0 0 1-2.204 2.195 2.2 2.2 0 0 1-2.205-2.195 2.2 2.2 0 0 1 2.205-2.196 2.2 2.2 0 0 1 2.204 2.196Z"
          />
        </svg>
      ),
    },
    services: {
      id: "Services",
      name: "Services",
      href: `/projects/${resolvedParams.projectname}/services`,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {/* Small squares at hexagon vertices */}
          <rect x="2" y="2" width="2" height="2" fill="currentColor" />
          <rect x="20" y="2" width="2" height="2" fill="currentColor" />
          <rect x="1.5" y="11" width="2" height="2" fill="currentColor" />
          <rect x="20.5" y="11" width="2" height="2" fill="currentColor" />
          <rect x="2" y="20" width="2" height="2" fill="currentColor" />
          <rect x="20" y="20" width="2" height="2" fill="currentColor" />

          {/* Central hexagon */}
          <polygon
            points="12,3 16,5.5 16,10.5 12,13 8,10.5 8,5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <polygon
            points="12,11 16,13.5 16,18.5 12,21 8,18.5 8,13.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    home: {
      id: "Home",
      name: "Home",
      href: "/",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    docs: {
      id: "docs",
      name: "Docs",
      href: "/docs",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    projects: {
      id: "Projects",
      name: "Projects",
      href: "/projects",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 5a2 2 0 012-2h4a2 2 0 012 2v3H8V5z"
          />
        </svg>
      ),
    },
    billing: {
      id: "billing",
      name: "Billing",
      href: "/billing",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      ),
    },
  };
}

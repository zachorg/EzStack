"use client";

import { Inter } from "next/font/google";
import { useEffect } from "react";
import "./globals.css";
import { AuthProvider } from "./components/AuthProvider";
import { SidebarProvider } from "./components/SidebarProvider";
import { Sidebar } from "./components/Sidebar";
import { Taskbar } from "./components/Taskbar";
import { TaskbarProvider } from "./components/TaskbarProvider";
import { LoginDialogProvider } from "./components/LoginDialogProvider";
import { ProjectsProvider } from "./components/ProjectsProvider";
import { AnalyticsProvider } from "./components/AnalyticsProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Set document metadata on client side
  useEffect(() => {
    document.title = "EzStack Console";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "Manage EzAuth OTP/OTE and settings"
      );
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = "Manage EzAuth OTP/OTE and settings";
      document.head.appendChild(meta);
    }
  }, []);
  return (
    <html lang="en" className="h-full">
      <body
        className={`${inter.variable} font-sans antialiased h-full`}
        style={{
          background: "#0D0D0D",
        }}
      >
        <AuthProvider>
          <LoginDialogProvider>
            <ProjectsProvider>
              <AnalyticsProvider>
                <SidebarProvider>
                  <TaskbarProvider>
                    <div className="flex h-full">
                      {/* Sidebar */}
                      <Sidebar />

                      {/* Main Content Area */}
                      <div className="flex-1 flex flex-col min-h-0 ml-12">
                        {/* Taskbar */}
                        <Taskbar />

                        {/* Page Content */}
                        <div
                          className="flex-1 overflow-auto min-h-0 scrollbar-hide"
                          style={{
                            background: "#0D0D0D",
                          }}
                        >
                          {children}
                        </div>
                      </div>
                    </div>
                  </TaskbarProvider>
                </SidebarProvider>
              </AnalyticsProvider>
            </ProjectsProvider>
          </LoginDialogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

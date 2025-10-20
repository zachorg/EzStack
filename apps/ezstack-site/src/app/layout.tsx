"use client";

import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { useEffect } from "react";
import "./globals.css";
import AuthHeader from "./components/AuthHeader";
import { AuthProvider } from "./components/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      metaDescription.setAttribute("content", "Manage EzAuth OTP/OTE and settings");
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = "Manage EzAuth OTP/OTE and settings";
      document.head.appendChild(meta);
    }
  }, []);
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <AuthProvider>
          <div className="p-4">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <Link href="/" className="font-semibold">EzStack</Link>
              <div className="flex items-center gap-2">
                <nav className="hidden sm:flex gap-2">
                  <Link 
                    href="/docs" 
                    className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border border-white dark:border-white hover:border-gray-300 dark:hover:border-gray-400 rounded-md transition-all duration-200 ease-in-out"
                  >
                    Docs
                  </Link>
                  {/* <Link 
                    href="/analytics" 
                    className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 border border-white dark:border-white hover:border-gray-300 dark:hover:border-gray-400 rounded-md transition-all duration-200 ease-in-out"
                  >
                    Analytics
                  </Link> */}
                </nav>
                <AuthHeader />
              </div>
            </div>
          </div>
          <div className="max-w-6xl mx-auto p-6">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import ProfileMenu from "./components/ProfileMenu";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EzStack Console",
  description: "Manage EzAuth OTP/OTE and settings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <div className="p-4 border-b">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="font-semibold">EzStack</Link>
            <div className="flex items-center gap-4">
              <nav className="hidden sm:flex gap-4 text-sm">
                <Link href="/docs">Docs</Link>
                <Link href="/analytics">Analytics</Link>
              </nav>
              <ProfileMenu />
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto p-6">{children}</div>
      </body>
    </html>
  );
}

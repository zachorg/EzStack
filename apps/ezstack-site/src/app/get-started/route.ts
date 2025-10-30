import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    
    if (sessionCookie) {
      // Verify the session cookie
      await adminAuth.verifySessionCookie(sessionCookie, true);
      // User is authenticated, redirect to dashboard
      url.pathname = "/projects";
      url.searchParams.delete("redirect");
      return NextResponse.redirect(url);
    }
  } catch {
    // Session verification failed, continue to login redirect
  }
  
  // User is not authenticated, redirect to home with login dialog trigger
  url.pathname = "/";
  url.searchParams.set("login", "true");
  url.searchParams.set("redirect", "/projects");
  return NextResponse.redirect(url);
}



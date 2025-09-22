// Minimal protection to require a session cookie before entering certain routes.
// Move complex checks to server components/actions; keep middleware fast.
import { NextRequest, NextResponse } from "next/server";

const protectedPrefixes = ["/api-keys"];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
  if (!isProtected) {
    return NextResponse.next();
  }

  // Firebase sets session cookie
  const sessionCookie = req.cookies.get("session")?.value;
  if (!sessionCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // No additional API key requirement; account page manages keys itself

  return NextResponse.next();
}

export const config = {
  matcher: ["/api-keys"],
};



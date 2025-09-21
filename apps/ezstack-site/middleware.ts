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

  // Supabase sets auth cookies: sb-access-token / sb-refresh-token
  const sbAccess = req.cookies.get("sb-access-token")?.value;
  if (!sbAccess) {
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



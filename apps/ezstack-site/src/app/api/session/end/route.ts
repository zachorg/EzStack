// Clears the session cookie. Client should call this on sign-out.
import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    
    if (sessionCookie) {
      // Revoke the session cookie
      const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
      await adminAuth.revokeRefreshTokens(decodedClaims.uid);
    }
  } catch {
    // Continue even if revocation fails
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("session", "", {
    maxAge: 0,
    httpOnly: true,
    //secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  
  return response;
}



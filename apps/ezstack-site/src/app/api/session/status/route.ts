// Lightweight endpoint used by the UI to check if a valid session cookie exists.
import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ loggedIn: false });
    }

    // Verify the session cookie
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    return NextResponse.json({ loggedIn: true, uid: decodedClaims.uid });
  } catch {
    return NextResponse.json({ loggedIn: false });
  }
}



// API endpoint to get user profile information
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify the session cookie
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decodedClaims.uid;

    // Get user record from Firebase Auth for basic info
    const userRecord = await adminAuth.getUser(uid);
    
    // Get additional user data from Firestore
    let userData = null;
    try {
      const userDoc = await adminDb.collection("users").doc(uid).get();
      if (userDoc.exists) {
        userData = userDoc.data();
      }
    } catch (error) {
      console.warn("Failed to fetch user data from Firestore:", error);
    }

    // Combine data from Auth and Firestore
    const profile = {
      uid: uid,
      email: userRecord.email || decodedClaims.email,
      displayName: userRecord.displayName || null,
      photoURL: userRecord.photoURL || null,
      emailVerified: userRecord.emailVerified,
      createdAt: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime,
      // Additional data from Firestore if available
      status: userData?.status || "active",
      planId: userData?.plan_id || null,
      createdAtFirestore: userData?.created_at,
      updatedAt: userData?.updated_at,
      lastLogin: userData?.last_login,
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

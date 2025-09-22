import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ error: { message: "Login required" } }, { status: 401 });
    }

    // Verify the session cookie
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decodedClaims.uid;

    // Create or update tenant document in Firestore
    const tenantRef = adminDb.collection("tenants").doc(uid);
    const tenantDoc = await tenantRef.get();

    if (!tenantDoc.exists) {
      // Create new tenant document
      await tenantRef.set({
        id: uid,
        name: decodedClaims.email || "Default Tenant",
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    return NextResponse.json({ ok: true, tenantId: uid });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bootstrap error";
    return NextResponse.json({ error: { message: msg } }, { status: 500 });
  }
}



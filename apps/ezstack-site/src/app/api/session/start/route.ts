// Creates a signed session cookie from a Firebase ID token.
// Called after client completes Google or Email/Password sign-in.
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/server";

export async function POST(req: Request) {
	try {
		const body = await req.json().catch(() => ({} as Record<string, unknown>));
		const idToken = String((body as { idToken?: string }).idToken || "").trim();

		if (!idToken) {
			return NextResponse.json({ error: { code: "invalid_request", message: "Firebase ID token is required" } }, { status: 400 });
		}

		// Verify the Firebase ID token
		const decodedToken = await adminAuth.verifyIdToken(idToken);
		const uid = decodedToken.uid;
		const email = decodedToken.email;

		// Create or update user document in Firestore
		const userRef = adminDb.collection("users").doc(uid);
		const userDoc = await userRef.get();

		if (!userDoc.exists) {
			// Create new user document
			await userRef.set({
				id: uid,
				email: email,
				status: "active",
				created_at: new Date(),
				updated_at: new Date(),
			});
		} else {
			// Update existing user
			await userRef.update({
				email: email,
				updated_at: new Date(),
				last_login: new Date(),
			});
		}

		const response = NextResponse.json({ ok: true });
		return response;
	} catch (err) {
		const isDev = process.env.NODE_ENV !== "production";
		const detail = err instanceof Error ? err.message : String(err);
		return NextResponse.json(
			{
				error: {
					code: "internal_error",
					message: "Session creation failed",
					...(isDev ? { detail } : {}),
				},
			},
			{ status: 500 }
		);
	}
}



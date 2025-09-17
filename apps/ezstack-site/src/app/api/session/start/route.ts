// Creates a signed session cookie from a Supabase ID token.
// Called after client completes Google or Email/Password sign-in.
import { NextResponse } from "next/server";
import type { Provider } from "@supabase/supabase-js";
import { supabaseRoute } from "@/lib/supabase/server";

export async function POST(req: Request) {
	try {
		const supabase = await supabaseRoute();
		const body = await req.json().catch(() => ({} as Record<string, unknown>));
		const email = String((body as { email?: string }).email || "").trim();
		const password = String((body as { password?: string }).password || "").trim();
		const provider = String((body as { provider?: string }).provider || "").trim();

		if (email && password) {
			const { error, data } = await supabase.auth.signInWithPassword({ email, password });
			if (error) return NextResponse.json({ error: { code: "unauthorized", message: error.message } }, { status: 401 });
			return NextResponse.json({ ok: true, uid: data.user?.id });
		}

		if (provider) {
			const { data, error } = await supabase.auth.signInWithOAuth({ provider: provider as Provider });
			if (error) return NextResponse.json({ error: { code: "unauthorized", message: error.message } }, { status: 401 });
			return NextResponse.json({ ok: true, url: data?.url });
		}

		if (email) {
			const { error } = await supabase.auth.signInWithOtp({ email });
			if (error) return NextResponse.json({ error: { code: "unauthorized", message: error.message } }, { status: 401 });
			return NextResponse.json({ ok: true });
		}

		return NextResponse.json({ error: { code: "invalid_request", message: "Provide email/password, provider, or email for OTP" } }, { status: 400 });
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



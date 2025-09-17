import { cookies } from "next/headers";
import { createServerComponentClient, createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export function supabaseServer() {
	return createServerComponentClient({ cookies });
}

export function supabaseRoute() {
	return createRouteHandlerClient({ cookies });
}



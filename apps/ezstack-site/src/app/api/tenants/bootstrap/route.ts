import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = supabaseServer();
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return NextResponse.json({ error: { message: "Login required" } }, { status: 401 });
    // For Supabase, no-op: tenants are implicit (user == tenant). Create rows during key creation if needed.
    return NextResponse.json({ ok: true, tenantId: uid });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bootstrap error";
    return NextResponse.json({ error: { message: msg } }, { status: 500 });
  }
}



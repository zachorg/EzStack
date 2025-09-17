import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    url.pathname = "/login";
    url.searchParams.set("redirect", "/api-keys");
    return NextResponse.redirect(url);
  }
  url.pathname = "/api-keys";
  url.searchParams.delete("redirect");
  return NextResponse.redirect(url);
}



// Lightweight endpoint used by the UI to check if a valid session cookie exists.
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return NextResponse.json({ loggedIn: false });
  return NextResponse.json({ loggedIn: true, uid: user.id });
}



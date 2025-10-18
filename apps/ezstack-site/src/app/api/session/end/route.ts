// Clears the session cookie. Client should call this on sign-out.
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  return response;
}

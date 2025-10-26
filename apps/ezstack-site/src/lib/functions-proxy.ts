import { NextResponse } from "next/server";

// Resolve the API base URL for the Render-hosted service (or local dev).
export function functionsBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8080";
  return base.replace(/\/$/, "");
}

// Minimal proxy that forwards auth header to the external API and returns JSON responses.
export async function foward_req_to_ezstack_api(fnPath: string, req: RequestInit) {
  try {
    const base = functionsBaseUrl();
    const url = `${base}${fnPath}`;
    // console.log("fetching", url, init);
    const res = await fetch(url, req);
    const text = await res.text();
    let data: unknown = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: { message: text?.slice(0, 500) || "" } } as unknown;
    }
    return NextResponse.json(data, {
      status: res.status,
      headers: { "x-proxy-target": url },
    });
  } catch (err) {
    const msg =
      typeof (err as { message?: unknown })?.message === "string"
        ? (err as { message: string }).message
        : "Proxy error";
    if (process.env.NODE_ENV !== "production") {
      // Dev-only logging to help debug proxy failures
      // Avoid logging tokens or sensitive request bodies
      console.warn("functions proxy error", { fnPath, err });
    }
    return NextResponse.json({ error: { message: msg } }, { status: 500 });
  }
}

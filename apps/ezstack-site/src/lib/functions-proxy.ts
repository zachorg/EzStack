import { NextRequest, NextResponse } from "next/server";

// Resolve the API base URL for the Render-hosted service (or local dev).
export function functionsBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
  return base.replace(/\/$/, "");
}

type HttpMethod = "GET" | "POST";

// Minimal proxy that forwards auth header to the external API and returns JSON responses.
async function forward(method: HttpMethod, fnPath: string, req: NextRequest) {
  try {
    const base = functionsBaseUrl();
    const authorization = req.headers.get("authorization");
    const init: RequestInit = {
      method,
      headers: {
        authorization: `Bearer ${authorization}`,
        "content-type": "application/json",
        ...(authorization ? { "x-ezstack-id-token": authorization } : {}),
      },
      cache: "no-store",
    };
    if (method === "POST") {
      const body = await req.json().catch(() => ({} as Record<string, unknown>));
      (init as RequestInit & { body?: string }).body = JSON.stringify(body ?? {});
    }
    const search = req.nextUrl?.search || "";
    const url = `${base}${fnPath}${search}`;
    // console.log("fetching", url, init);
    const res = await fetch(url, init);
    const text = await res.text();
    let data: unknown = {};
    try { data = JSON.parse(text); } catch { data = { error: { message: text?.slice(0, 500) || "" } } as unknown; }
    return NextResponse.json(data, { status: res.status, headers: { 'x-proxy-target': url } });
  } catch (err) {
    const msg = typeof (err as { message?: unknown })?.message === "string" ? (err as { message: string }).message : "Proxy error";
    if (process.env.NODE_ENV !== 'production') {
      // Dev-only logging to help debug proxy failures
      // Avoid logging tokens or sensitive request bodies
      console.warn("functions proxy error", { fnPath, err });
    }
    return NextResponse.json({ error: { message: msg } }, { status: 500 });
  }
}

export function proxyGet(fnPath: string, req: NextRequest) {
  return forward("GET", fnPath, req);
}

export function proxyPost(fnPath: string, req: NextRequest) {
  return forward("POST", fnPath, req);
}



import { NextRequest, NextResponse } from "next/server";

// Resolve the API base URL for the Render-hosted service (or local dev).
export function functionsBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "http://127.0.0.1:4000";
  return base.replace(/\/$/, "");
}

type HttpMethod = "GET" | "POST";

// Minimal proxy that forwards auth header to the external API and returns JSON responses.
async function forward(method: HttpMethod, fnPath: string, req: NextRequest) {
  console.log("forward", method, fnPath, req.headers.toString());
  const authz = req.headers.get("authorization");
  if (!authz) return NextResponse.json({ error: { code: "unauthorized", message: "Login required" } }, { status: 401 });
  try {
    const base = functionsBaseUrl();
    const xTenantId = req.headers.get("x-tenant-id");
    const init: RequestInit = {
      method,
      headers: {
        "content-type": "application/json",
        authorization: authz,
        ...(xTenantId ? { "x-tenant-id": xTenantId } : {}),
      },
      cache: "no-store",
    };
    if (method === "POST") {
      const body = await req.json().catch(() => ({} as Record<string, unknown>));
      (init as RequestInit & { body?: string }).body = JSON.stringify(body ?? {});
    }
    const search = req.nextUrl?.search || "";
    const url = `${base}${fnPath}${search}`;
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
      console.warn("functions proxy error", { fnPath, msg });
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



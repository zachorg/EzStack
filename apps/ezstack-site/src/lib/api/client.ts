// Lightweight API client with Firebase ID token auth and typed helpers
// NOTE: Do not log or persist plaintext API keys. Only use keyPrefix beyond creation.

import { auth } from "@/lib/firebase/client";
import { forward_api_keys } from "../functions-proxy";

export type ApiErrorEnvelope = { error?: { message?: string } };

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type Json = Record<string, unknown> | undefined;
type HeaderMap = Record<string, string> | undefined;

/**
 * Get Firebase ID token for the current user
 * @returns Promise<string | null> - The ID token or null if not authenticated
 */
export async function getIdToken(): Promise<string | null> {
  try {
    if (!auth || !auth.currentUser) {
      return null;
    }

    return await auth.currentUser.getIdToken(true);
  } catch (error) {
    console.error("Error getting Firebase ID token:", error);
    return null;
  }
}

async function apiFetch<T>(
  tenantId: string,
  reqPath: string,
  init?: RequestInit
): Promise<T> {
  const idToken = await getIdToken();
  
  const req: RequestInit = {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${idToken}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  };
  console.log("🔑 request: ", JSON.stringify(req, null, 2));
  const res = await forward_api_keys(reqPath, req);
  const text = await res.text();
  let data: unknown = undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    // Fall through with raw text when JSON parse fails
  }
  if (!res.ok) {
    const message =
      (data as ApiErrorEnvelope | undefined)?.error?.message ||
      (typeof text === "string" && text) ||
      `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

export const api = {
  get<T>(tenantId: string, path: string, headers?: HeaderMap): Promise<T> {
    return apiFetch<T>(tenantId, path, { method: "GET", headers });
  },
  post<T>(
    tenantId: string,
    path: string,
    body?: Json,
    headers?: HeaderMap
  ): Promise<T> {
    return apiFetch<T>(tenantId, path, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
      headers,
    });
  },
  delete<T>(
    tenantId: string,
    path: string,
    body?: Json,
    headers?: HeaderMap
  ): Promise<T> {
    // Next.js route supports DELETE with a JSON body
    return apiFetch<T>(tenantId, path, {
      method: "DELETE",
      body: JSON.stringify(body ?? {}),
      headers,
    });
  },
};

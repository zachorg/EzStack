// Lightweight API client with Firebase ID token auth and typed helpers
// NOTE: Do not log or persist plaintext API keys. Only use keyPrefix beyond creation.

import { auth } from "@/lib/firebase/client";

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

async function apiFetch<T>(idToken: string, reqPath: string, init?: RequestInit): Promise<T> {
  const res = await fetch(reqPath, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${idToken}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
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
  get<T>(idToken: string, path: string, headers?: HeaderMap): Promise<T> {
    return apiFetch<T>(idToken, path, { method: "GET", headers });
  },
  post<T>(idToken: string, path: string, body?: Json, headers?: HeaderMap): Promise<T> {
    return apiFetch<T>(idToken, path, { method: "POST", body: JSON.stringify(body ?? {}), headers });
  },
  delete<T>(idToken: string, path: string, body?: Json, headers?: HeaderMap): Promise<T> {
    // Next.js route supports DELETE with a JSON body
    return apiFetch<T>(idToken, path, { method: "DELETE", body: JSON.stringify(body ?? {}), headers });
  },
};



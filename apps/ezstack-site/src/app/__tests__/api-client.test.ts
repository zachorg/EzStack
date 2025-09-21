import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as clientModule from "@/lib/api/client";

describe("api client error handling", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.spyOn(clientModule, "getIdToken").mockResolvedValue("fake-token");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch as typeof global.fetch;
  });

  it("throws ApiError with message from envelope", async () => {
    const spy = vi.fn() as unknown as import("vitest").MockedFunction<typeof global.fetch>;
    spy.mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify({ error: { message: "bad input" } })),
    } as unknown as Response);
    global.fetch = spy as unknown as typeof global.fetch;
    const { api, ApiError } = await import("@/lib/api/client");
    await expect(api.get("/api/keys")).rejects.toThrowError(ApiError);
    await expect(api.get("/api/keys")).rejects.toMatchObject({ message: "bad input", status: 400 });
  });

  it("includes Authorization header", async () => {
    const spy = vi.fn() as unknown as import("vitest").MockedFunction<typeof global.fetch>;
    spy.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve("{}") } as unknown as Response);
    global.fetch = spy as unknown as typeof global.fetch;
    const { api } = await import("@/lib/api/client");
    await api.get("/api/keys");
    const headers = (spy.mock.calls[0]?.[1]?.headers || {}) as Record<string, string>;
    expect(headers["authorization"]).toBe("Bearer fake-token");
  });
});



import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ...actual,
    getIdToken: vi.fn().mockResolvedValue("fake-token"),
  };
});

vi.mock("@/lib/api/apikeys", () => {
  const list: ReturnType<typeof vi.fn> = vi.fn();
  const create: ReturnType<typeof vi.fn> = vi.fn();
  const revoke: ReturnType<typeof vi.fn> = vi.fn();
  return {
    apiKeys: { list, create, revoke },
  };
});

describe("ApiKeysPage", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders empty state and creates a key", async () => {
    const { apiKeys } = await import("@/lib/api/apikeys");
    (apiKeys.list as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [] });
    (apiKeys.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "1", key: "sk_live_abc123", keyPrefix: "sk_live_abc", name: null, createdAt: null, lastUsedAt: null });
    const Page = (await import("@/app/(dashboard)/api-keys/page")).default;
    render(<Page />);
    expect(await screen.findByText(/No API keys yet/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: "Test" } });
    fireEvent.click(screen.getByRole("button", { name: /Create key/ }));

    expect(await screen.findByText(/New API key created/)).toBeInTheDocument();
    expect(screen.getByText(/Key prefix:/)).toBeInTheDocument();
  });

  it("revokes a key after confirmation", async () => {
    const { apiKeys } = await import("@/lib/api/apikeys");
    (apiKeys.list as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ items: [{ id: "1", name: null, keyPrefix: "sk_live_x", createdAt: null, lastUsedAt: null, revokedAt: null }] })
      .mockResolvedValueOnce({ items: [{ id: "1", name: null, keyPrefix: "sk_live_x", createdAt: null, lastUsedAt: null, revokedAt: { seconds: 1 } }] });
    (apiKeys.revoke as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, deleted: true });
    const Page = (await import("@/app/(dashboard)/api-keys/page")).default;
    render(<Page />);
    expect(await screen.findByText(/Active/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Revoke/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Revoke$/ }));
    await waitFor(async () => expect(await screen.findByText(/Revoked/)).toBeInTheDocument());
  });
});



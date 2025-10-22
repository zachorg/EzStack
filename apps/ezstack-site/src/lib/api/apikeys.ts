import { api } from "./client";

export type TimestampLike =
  | { seconds: number; nanos?: number }
  | string
  | number
  | null;

export type CreateApiKeyRequest = {
  tenantId: string;
  name?: string;
};

export type CreateApiKeyResponse = {
  id: string;
  key: string; // plaintext; must only be displayed once
  keyPrefix: string;
  name: string | null;
  createdAt: TimestampLike | null;
  lastUsedAt: TimestampLike | null;
};

export type ListApiKeysResponse = {
  items: Array<{
    id: string;
    name: string | null;
    keyPrefix: string;
    createdAt: TimestampLike | null;
    lastUsedAt: TimestampLike | null;
    revokedAt: TimestampLike | null;
  }>;
};

export type RevokeApiKeyRequest = { id: string };
export type RevokeApiKeyResponse = { ok: true; deleted: true };

export const apiKeys = {
  create(input: CreateApiKeyRequest) {
    return api.post<CreateApiKeyResponse>(input.tenantId, "/api/v1/keys/create", input);
  },
  list(tenantId: string) {
    return api.get<ListApiKeysResponse>(tenantId, `/api/v1/keys/list`);
  },
  revoke(id: string, tenantId?: string) {
    return api.post<RevokeApiKeyResponse>(
      tenantId || "",
      "/api/v1/keys/revoke", 
      { id }
    );
  },
};

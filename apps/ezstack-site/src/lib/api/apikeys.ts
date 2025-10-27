import { CreateApiKeyRequest, ListApiKeysRequest } from "@/__generated__/requestTypes";
import { CreateApiKeyResponse, ListApiKeysResponse } from "@/__generated__/responseTypes";
import { api } from "./client";

export type RevokeApiKeyRequest = { id: string };
export type RevokeApiKeyResponse = { ok: true; deleted: true };

export const apiKeys = {
  create(input: CreateApiKeyRequest) {
    return api.post<CreateApiKeyResponse>("/api/v1/keys/create", JSON.parse(JSON.stringify(input)));
  },
  list(input: ListApiKeysRequest) {
    return api.get<{api_keys: ListApiKeysResponse[]}>(`/api/v1/keys/list`, JSON.parse(JSON.stringify(input)));
  },
  revoke(id: string) {
    return api.post<RevokeApiKeyResponse>(
      "/api/v1/keys/revoke", 
      { id }
    );
  },
};

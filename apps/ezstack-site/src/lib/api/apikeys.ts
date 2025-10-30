import { CreateApiKeyRequest, ListApiKeysRequest, RevokeApiKeyRequest } from "@/__generated__/requestTypes";
import { CreateApiKeyResponse, ListApiKeysResponse, RevokeApiKeyResponse } from "@/__generated__/responseTypes";
import { api } from "./client";

export const apiKeys = {
  create(input: CreateApiKeyRequest) {
    return api.post<CreateApiKeyResponse>("/api/v1/keys/create", JSON.parse(JSON.stringify(input)));
  },
  list(input: ListApiKeysRequest) {
    return api.get<{api_keys: ListApiKeysResponse[]}>(`/api/v1/keys/list`, JSON.parse(JSON.stringify(input)));
  },
  revoke(input: RevokeApiKeyRequest) {
    return api.post<RevokeApiKeyResponse>(
      "/api/v1/keys/revoke",
      JSON.parse(JSON.stringify(input))
    );
  },
};

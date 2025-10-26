import { CreateApiKeyRequest } from "@/__generated__/requestTypes";
import { CreateApiKeyResponse } from "@/__generated__/responseTypes";
import { api } from "./client";

export type RevokeApiKeyRequest = { id: string };
export type RevokeApiKeyResponse = { ok: true; deleted: true };

export const apiKeys = {
  create(input: CreateApiKeyRequest) {
    return api.post<CreateApiKeyResponse>("/api/v1/keys/create", JSON.parse(JSON.stringify(input)));
  },
  // list() {
  //   return api.get<ListApiKeysResponse>(`/api/v1/keys/list`);
  // },
  revoke(id: string) {
    return api.post<RevokeApiKeyResponse>(
      "/api/v1/keys/revoke", 
      { id }
    );
  },
};

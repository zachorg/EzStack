// Generated Response Types


export interface CreateApiKeyResponse {
  // Primary key
  id: string;
  // Name of the key
  name: string;
  // Prefix of the key
  key_prefix: string;
}

export interface ListApiKeysResponse {
  // Name of the key
  name: string;
  // Prefix of the key
  key_prefix: string;
}

export interface UserProjectResponse {
  // Name of the project
  name: string;
  // Date created
  created_at: string;
  // Date updated
  updated_at: string;
  // List of API keys
  api_keys: ListApiKeysResponse[];
}

export interface ListUserProjectsResponse {
  // List of projects
  projects: UserProjectResponse[];
}


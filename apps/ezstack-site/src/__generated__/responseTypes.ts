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
  // Status of the key
  status: "active" | "inactive";
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
}

export interface ListUserProjectsResponse {
  // List of projects
  projects: UserProjectResponse[];
}


// Generated Document Types

import * as ResponseTypes from "./responseTypes"

export interface ApiKeyDocument {
  // Primary key
  id: string;
  // Foreign key to project
  project_id: string;
  // Foreign key to user
  user_id: string;
  // Hashed key
  hashed_key: string;
  // Lookup hash
  lookup_hash: string;
  // Salt used to hash the key
  salt: string;
  // Algorithm used to hash the key
  alg: string;
  // Status of the key
  status: "active" | "inactive";
  // Date created
  created_at: string;
  // Date updated
  updated_at: string;
  // Version of the config
  config_version: number;
  // Key: Service name. Value: JSON string of config.
  config: Record<string, any>;
}

export interface UserProjectDocument {
  // Primary key
  id: string;
  // Name of the project
  name: string;
  // Date created
  created_at: string;
  // Date updated
  updated_at: string;
  // List of API keys
  api_keys: ResponseTypes.ListApiKeysResponse[];
}

export interface UserProfileDocument {
  // Primary key
  id: string;
  // Email of the user
  email: string;
  // Status of the user
  status: "active" | "inactive";
  // List of projects
  projects: string[];
  // Date created
  created_at: string;
  // Date updated
  updated_at: string;
  // Date last logged in
  last_login?: string;
}


// apikey is a projects services secret key
interface ApiKeyDescriptor {
  // Primary key
  /** @ApiKeyDocument */
  /** @CreateApiKeyResponse */
  id: string;
  // Foreign key to project
  /** @ApiKeyDocument */
  project_id: string;
  // Name of project 
  /** @CreateApiKeyRequest */
  project_name: string;
  // Foreign key to user
  /** @ApiKeyDocument */
  user_id: string;
  // Hashed key
  /** @ApiKeyDocument */
  hashed_key: string;
  // Lookup hash
  /** @ApiKeyDocument */
  lookup_hash: string;
  // Salt used to hash the key
  /** @ApiKeyDocument */
  salt: string;
  // Algorithm used to hash the key
  /** @ApiKeyDocument */
  alg: string;
  // Status of the key
  /** @ApiKeyDocument */
  status: "active" | "inactive";
  // Date created
  /** @ApiKeyDocument */
  created_at: string;
  // Date updated
  /** @ApiKeyDocument */
  updated_at: string;
  // Version of the config
  /** @ApiKeyDocument */
  config_version: number;
  // Key: Service name. Value: JSON string of config.
  /** @ApiKeyDocument */
  config: Record<string, string>;
  // Name of the key
  /** @ListApiKeysResponse */
  /** @CreateApiKeyResponse */
  /** @CreateApiKeyRequest */
  name: string;
  // Prefix of the key
  /** @ListApiKeysResponse */
  /** @CreateApiKeyResponse */
  key_prefix: string;
}

interface ProjectDescriptor {
  // Primary key
  /** @UserProjectDocument */
  id: string;
  // Name of the project
  /** @UserProjectDocument */
  /** @UserProjectResponse */
  /** @CreateProjectRequest */
  name: string;
  // Date created
  /** @UserProjectDocument */
  /** @UserProjectResponse */
  created_at: string;
  // Date updated
  /** @UserProjectDocument */
  /** @UserProjectResponse */
  updated_at: string;
  // List of API keys
  /** @UserProjectDocument */
  /** @UserProjectResponse */
  api_keys: ListApiKeysResponse[];
  // List of projects
  /** @ListUserProjectsResponse */
  projects: UserProjectResponse[];
}

interface UserProfileDescriptor {
  // Primary key
  /** @UserProfileDocument */
  id: string;
  // Email of the user
  /** @UserProfileDocument */
  email: string;
  // Status of the user
  /** @UserProfileDocument */
  status: "active" | "inactive";

  // List of projects
  /** @UserProfileDocument */
  projects: Record<string, string>;

  // Date created
  /** @UserProfileDocument */
  created_at: string;
  // Date updated
  /** @UserProfileDocument */
  updated_at: string;
  // Date last logged in
  /** @UserProfileDocument */
  last_login?: string;
}

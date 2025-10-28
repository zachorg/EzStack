// Generated Request Types


export interface CreateApiKeyRequest {
  // Name of project
  project_name: string;
  // Name of the key
  name: string;
}

export interface ListApiKeysRequest {
  // Name of project
  project_name: string;
}

export interface RevokeApiKeyRequest {
  // Name of project
  project_name: string;
  // Name of the key
  name: string;
}

export interface ProjectAnalyticsRequest {
  // Name of the project
  project_name: string;
}

export interface ServiceAnalyticsRequest {
  // Name of the project
  service_name: string;
}

export interface CreateProjectRequest {
  // Name of the project
  name: string;
}


// Generated Document Types


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
  config: Record<string, string>;
  // Name of the key
  name: string;
  // Prefix of the key
  key_prefix: string;
}

export interface EzAuthAnalyticsDocument {
  // Number of completed send OTP requests per month
  send_otp_completed_monthly_requests: Record<string, number>;
  // Number of completed send OTP requests
  send_otp_completed_requests: number;
  // Number of completed verify OTP requests per month
  verify_otp_completed_monthly_requests: Record<string, number>;
  // Number of completed verify OTP requests
  verify_otp_completed_requests: number;
}

export interface ServiceAnalyticsDocument {
  // Number of completed requests per month
  completed_monthly_requests: Record<string, number>;
  // Number of completed requests
  completed_requests: number;
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
  // List of services: value is JSON string of ServiceConfig.
  services: Record<string, string>;
}

export interface UserProfileDocument {
  // Primary key
  id: string;
  // Email of the user
  email: string;
  // Status of the user
  status: "active" | "inactive";
  // List of projects
  projects: Record<string, string>;
  // Date created
  created_at: string;
  // Date updated
  updated_at: string;
  // Date last logged in
  last_login?: string;
}


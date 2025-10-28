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

export interface EzAuthAnalyticsResponse {
  // Number of completed send OTP requests per month
  send_otp_completed_monthly_requests: Record<string, number>;
  // Number of completed send OTP requests
  send_otp_completed_requests: number;
  // Number of completed verify OTP requests per month
  verify_otp_completed_monthly_requests: Record<string, number>;
  // Number of completed verify OTP requests
  verify_otp_completed_requests: number;
}

export interface ServiceAnalyticsResponse {
  // Number of completed requests per month
  completed_monthly_requests: Record<string, number>;
  // Number of completed requests
  completed_requests: number;
}

export interface RevokeApiKeyResponse {
  // 
  ok: boolean;
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


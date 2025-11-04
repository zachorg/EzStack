// Generated Request Types

import * as ConfigTypes from "./configTypes"

export interface CreateApiKeyRequest {
  // Name of project
  project_name: string;
  // Name of the key
  name: string;
  // 
  api_key_rules: ConfigTypes.ApiKeyRulesConfig;
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

export interface EzAuthAnalyticsRequest {
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

export interface GetProjectServicesRequest {
  // Name of the project
  project_name: string;
}

export interface EzAuthServiceUpdateRequest {
  // Whether the service is enabled
  enabled: boolean;
  // Name of the project this service is associated with
  project_name: string;
  // Company name to be displayed on OTP email/SMS
  organization_name: string;
  // Length of the OTP code (min 4 - max 6)
  otp_code_length: number;
  // Rate limit for destination per minute
  otp_rate_limit_destination_per_minute: number;
  // TTL of the OTP code in seconds
  otp_ttl_seconds: number;
  // Maximum number of OTP verification attempts
  otp_max_verification_attempts: number;
}

export interface BillingUpdateRequest {
  // Stripe payment method ID
  stripe_payment_method_id: string;
}


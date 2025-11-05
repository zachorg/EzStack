// Generated Response Types

import * as ConfigTypes from "./configTypes"

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
  // 
  api_key_rules: ConfigTypes.ApiKeyRulesConfig;
}

export interface EzAuthAnalyticsResponse {
  // Number of completed send OTP requests via SMS per month
  sms_send_otp_completed_monthly_requests: Record<string, number>;
  // Number of completed send OTP requests via SMS
  sms_send_otp_completed_requests: number;
  // Number of completed send OTP requests via email per month
  email_send_otp_completed_monthly_requests: Record<string, number>;
  // Number of completed send OTP requests via email
  email_send_otp_completed_requests: number;
  // Number of completed verify OTP requests per month
  verify_otp_completed_monthly_requests: Record<string, number>;
  // Number of completed verify OTP requests
  verify_otp_completed_requests: number;
  // analytics metrics
  [key: string]: any;
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

export interface EzAuthServiceUpdateResponse {
  // 
  ok: boolean;
}

export interface BillingUpdateResponse {
  // 
  ok: boolean;
}

export interface BillingSetupResponse {
  // 
  ok: boolean;
  // Stripe setup intent ID
  stripe_setup_intent_client_secret: string;
}

export interface UserProjectResponse {
  // Name of the project
  name: string;
  // Date created
  created_at: string;
  // Date updated
  updated_at: string;
  // List of services: value is JSON string of ServiceConfig.
  services: Record<string, string>;
}

export interface ListUserProjectsResponse {
  // List of projects
  projects: UserProjectResponse[];
}

export interface BillingIsSuscribedResponse {
  // Whether the user has a valid payment method
  has_valid_payment_method: boolean;
}

export interface EzAuthSendResponse {
  // Request ID
  request_id: string;
  // Code -- -1 if verify_otp rule enabled in api key config..
  code: string;
}


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
  /** @ListApiKeysRequest */
  /** @RevokeApiKeyRequest */
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
  /** @ListApiKeysResponse */
  status: "active" | "inactive";
  // Date created
  /** @ApiKeyDocument */
  created_at: string;
  // Date updated
  /** @ApiKeyDocument */
  updated_at: string;
  // Key: Service name. Value: JSON string of config.
  /** @ApiKeyDocument */
  config: ApiKeyRulesConfig;
  // Name of the key
  /** @ListApiKeysResponse */
  /** @CreateApiKeyResponse */
  /** @RevokeApiKeyRequest */
  /** @CreateApiKeyRequest */
  /** @ApiKeyDocument */
  name: string;
  // Prefix of the key
  /** @ListApiKeysResponse */
  /** @CreateApiKeyResponse */
  /** @ApiKeyDocument */
  key_prefix: string;

  /** @CreateApiKeyRequest */
  /** @ListApiKeysResponse */
  api_key_rules: ApiKeyRulesConfig;
}

interface ProjectsAnalyticsDescriptor {
  // Name of the project
  /** @EzAuthAnalyticsRequest */
  project_name: string;
  // Number of completed send OTP requests per month
  /** @EzAuthAnalyticsDocument */
  /** @EzAuthAnalyticsResponse */
  send_otp_completed_monthly_requests: Record<string, number>;
  // Number of completed send OTP requests
  /** @EzAuthAnalyticsDocument */
  /** @EzAuthAnalyticsResponse */
  send_otp_completed_requests: number;
  // Number of completed verify OTP requests per month
  /** @EzAuthAnalyticsDocument */
  /** @EzAuthAnalyticsResponse */
  verify_otp_completed_monthly_requests: Record<string, number>;
  // Number of completed verify OTP requests
  /** @EzAuthAnalyticsDocument */
  /** @EzAuthAnalyticsResponse */
  verify_otp_completed_requests: number;
}

interface ServiceAnalyticsDescriptor {
  // Name of the project
  /** @ServiceAnalyticsRequest */
  service_name: string;
  // Number of completed requests per month
  /** @ServiceAnalyticsDocument */
  /** @ServiceAnalyticsResponse */
  completed_monthly_requests: Record<string, number>;
  // Number of completed requests
  /** @ServiceAnalyticsDocument */
  /** @ServiceAnalyticsResponse */
  completed_requests: number;
}

interface DefaultDescriptor {
  /** @RevokeApiKeyResponse */
  /** @EzAuthServiceUpdateResponse */
  /** @BillingUpdateResponse */
  /** @BillingSetupResponse */
  ok: boolean;
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
  // List of projects
  /** @ListUserProjectsResponse */
  projects: UserProjectResponse[];
  // List of services: value is JSON string of ServiceConfig.
  /** @UserProjectDocument */
  /** @UserProjectResponse */
  services: Record<string, string>;
}

interface GetProjectServicesDescriptor {
  // Name of the project
  /** @GetProjectServicesRequest */
  project_name: string;
}

interface ServiceConfigDescriptor {
  // Whether the service is enabled
  /** @EzAuthServiceConfig */
  /** @EzAuthServiceUpdateRequest */
  enabled: boolean;
  // Name of the project this service is associated with
  /** @EzAuthServiceUpdateRequest */
  project_name: string;
  // Company name to be displayed on OTP email/SMS
  /** @EzAuthServiceConfig */
  /** @EzAuthServiceUpdateRequest */
  organization_name: string;
  // Length of the OTP code (min 4 - max 6)
  /** @EzAuthServiceConfig */
  /** @EzAuthServiceUpdateRequest */
  otp_code_length: number;
  // Rate limit for destination per minute
  /** @EzAuthServiceConfig */
  /** @EzAuthServiceUpdateRequest */
  otp_rate_limit_destination_per_minute: number;
  // TTL of the OTP code in seconds
  /** @EzAuthServiceConfig */
  /** @EzAuthServiceUpdateRequest */
  otp_ttl_seconds: number;
  // Maximum number of OTP verification attempts
  /** @EzAuthServiceConfig */
  /** @EzAuthServiceUpdateRequest */
  otp_max_verification_attempts: number;
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
  last_login: string;

  // Stripe customer ID
  /** @UserProfileDocument */
  stripe_customer_id: string;
}

interface UserBillingDescriptor {
  // Stripe setup intent ID
  /** @BillingSetupResponse */
  stripe_setup_intent_client_secret: string;
  // Stripe payment method ID
  /** @BillingUpdateRequest */
  stripe_payment_method_id: string;
  // Whether the user has a valid payment method
  /** @BillingIsSuscribedResponse */
  has_valid_payment_method: boolean;
}

interface EzAuth
{
  // Request ID
  /** @EzAuthSendOtpResponse */
  request_id: string;

  // Code -- -1 if verify_otp rule enabled in api key config..
  /** @EzAuthSendOtpResponse */
  code: string;

  /** @ApiKeyRulesConfig */
  ezauth_send_otp_enabled: boolean;

  /** @ApiKeyRulesConfig */
  ezauth_verify_otp_enabled: boolean;

  /** @ApiKeyRulesConfig */
  [key: string]: boolean;
}

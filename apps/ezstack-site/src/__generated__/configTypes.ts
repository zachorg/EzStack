// Generated Config Types

export interface EzAuthServiceConfig {
  // Whether the service is enabled
  enabled: boolean;
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
  // Email theme
  email_theme: "light" | "dark" | "vibrant" | "custom";
  // 
  email_theme_config: EzAuthEmailThemeConfig;
}

export interface ApiKeyRulesConfig {
  // 
  ezauth_send_otp_enabled: boolean;
  // 
  ezauth_verify_otp_enabled: boolean;
  // 
  [key: string]: boolean;
}

export interface EzAuthEmailThemeConfig {
  // 
  bodyBg: string;
  // 
  containerBg: string;
  // 
  containerBorder: string;
  // 
  headerBg: string;
  // 
  textPrimary: string;
  // 
  textSecondary: string;
  // 
  textMuted: string;
  // 
  accentPrimary: string;
  // 
  codeBoxBg: string;
  // 
  codeBoxBorder: string;
  // 
  timerBoxBg: string;
  // 
  timerBoxBorder: string;
  // 
  footerBg: string;
  // 
  footerBorder: string;
}


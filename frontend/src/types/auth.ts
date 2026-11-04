/**
 * Shared Authentication Types
 */

export interface AuthUser {
  email: string;
  full_name: string;
  picture?: string;
  is_verified: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface OTPRequestResponse {
  message: string;
  email_sent: boolean;
  email_error?: string | null;
}

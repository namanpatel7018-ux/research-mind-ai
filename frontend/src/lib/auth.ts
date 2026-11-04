/**
 * auth.ts — Token storage & JWT decode utilities
 * ------------------------------------------------
 * Handles localStorage persistence of the JWT and provides
 * a lightweight expiry check so the app never uses a stale token.
 */

const TOKEN_KEY = 'researchmind_token';

// ── Persist ───────────────────────────────────────────────────────────────────

export function saveAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAuthToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  // Silently discard tokens that are already expired
  if (isTokenExpired(token)) {
    clearAuthToken();
    return null;
  }

  return token;
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ── JWT decode (no verification — server validates signature) ─────────────────

interface JWTPayload {
  sub:  string;   // email
  exp:  number;   // Unix timestamp
  iat:  number;
  jti?: string;   // unique token ID
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    // Pad base64url to standard base64
    const padded  = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const json    = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='));
    return JSON.parse(json) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Returns true if the token is missing, malformed, or its exp is in the past.
 * Adds a 30-second clock-skew buffer.
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload?.exp) return true;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp < nowSeconds - 30;
}

/** Milliseconds until token expires (negative if already expired). */
export function tokenExpiresInMs(token: string): number {
  const payload = decodeToken(token);
  if (!payload?.exp) return -1;
  return payload.exp * 1000 - Date.now();
}

/** Email embedded in the token — useful for optimistic UI before /me resolves. */
export function getTokenEmail(token: string): string | null {
  return decodeToken(token)?.sub ?? null;
}

import { createHmac, timingSafeEqual } from 'node:crypto';

import type { PlatformRole } from '../shared/contracts';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: PlatformRole;
  exp: number;
}

// Browser sessions are intentionally persistent. The client stores the
// session locally and periodically rotates this token while the user remains
// signed in. Keep a long fallback lifetime so a browser reopened after a
// normal gap does not unexpectedly require another login.
const DEFAULT_AUTH_TOKEN_LIFETIME_SECONDS = 60 * 60 * 24 * 365;

function authTokenLifetimeSeconds() {
  const configured = Number(process.env.AUTH_TOKEN_EXPIRES_IN_SECONDS);
  return Number.isSafeInteger(configured) && configured > 0
    ? configured
    : DEFAULT_AUTH_TOKEN_LIFETIME_SECONDS;
}

function secret() {
  const value = process.env.AUTH_TOKEN_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === 'production')
    throw new Error('AUTH_TOKEN_SECRET is required in production');
  return 'local-sirohi-point-secret-change-before-production';
}

function encode(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signature(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

export function signAuthToken(
  input: Omit<AuthTokenPayload, 'exp'>,
  expiresInSeconds = authTokenLifetimeSeconds(),
) {
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    ...input,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${signature(unsigned)}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const [header, payload, provided] = token.split('.');
  if (!header || !payload || !provided) throw new Error('Malformed token');
  const unsigned = `${header}.${payload}`;
  const expected = Buffer.from(signature(unsigned));
  const actual = Buffer.from(provided);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new Error('Invalid token');
  const parsed = JSON.parse(
    Buffer.from(payload, 'base64url').toString('utf8'),
  ) as AuthTokenPayload;
  if (
    !parsed.sub ||
    !parsed.email ||
    !parsed.role ||
    parsed.exp <= Math.floor(Date.now() / 1000)
  )
    throw new Error('Expired token');
  return parsed;
}

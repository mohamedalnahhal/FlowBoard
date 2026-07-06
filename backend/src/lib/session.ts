import type { CookieOptions } from 'express';

export const SESSION_COOKIE = 'taskboard_session';

export const SESSION_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  signed:   true,
  sameSite: 'lax',
  // HTTPS-only in production; dev runs over plain http://localhost.
  secure:   process.env.NODE_ENV === 'production',
  maxAge:   1000 * 60 * 60 * 24 * 7, // 7 days
};

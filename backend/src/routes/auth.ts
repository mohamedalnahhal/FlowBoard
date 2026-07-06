import { Router } from 'express';
import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from '../lib/session.js';

const router = Router();

// ── Login rate limiting ────────────────────────────────────────────────────────
// In-memory fixed-window limiter keyed by IP + username. Enough to blunt
// credential brute-forcing on a single-process deployment without adding a
// dependency; swap for a shared store if the backend is ever scaled out.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function isLoginRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LOGIN_MAX_ATTEMPTS;
}

// Periodically drop expired windows so the map can't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of loginAttempts) {
    if (entry.resetAt <= now) loginAttempts.delete(key);
  }
}, LOGIN_WINDOW_MS).unref();

// ── POST /auth/login ──────────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    const { username, password } = req.body ?? {};

    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const rateKey = `${req.ip}|${String(username).toLowerCase()}`;
    if (isLoginRateLimited(rateKey)) {
      return res.status(429).json({ error: 'Too many login attempts. Try again in a few minutes.' });
    }

    const user = await prisma.user.findFirst({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    loginAttempts.delete(rateKey);
    res.cookie(SESSION_COOKIE, user.id, SESSION_COOKIE_OPTIONS);
    res.json({
      id:           user.id,
      display_name: user.display_name,
      username:     user.username,
      email:        user.email,
      role:         user.role,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/logout ──────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE, SESSION_COOKIE_OPTIONS);
  res.status(204).send();
});

// ── GET /auth/me ───────────────────────────────────────────────────────────────
router.get('/me', async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const prisma = req.app.get('prisma') as PrismaClient;
    const user = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: { id: true, display_name: true, username: true, email: true, phone_number: true, role: true },
    });

    if (!user) return res.status(401).json({ error: 'Unauthenticated' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /auth/me ─────────────────────────────────────────────────────────────
router.patch('/me', async (req, res, next) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthenticated' });

    const prisma = req.app.get('prisma') as PrismaClient;
    const { display_name, email, phone_number } = req.body ?? {};

    if (display_name !== undefined && !String(display_name).trim()) {
      return res.status(400).json({ error: 'display_name cannot be empty' });
    }

    const updated = await prisma.user.update({
      where:  { id: req.user.id },
      data:   {
        ...(display_name !== undefined && { display_name: String(display_name).trim() }),
        ...(email        !== undefined && { email: email ? String(email).trim() : null }),
        ...(phone_number !== undefined && { phone_number: phone_number ? String(phone_number).trim() : null }),
      },
      select: { id: true, display_name: true, username: true, email: true, phone_number: true, role: true },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/change-password ─────────────────────────────────────────────────
router.post('/change-password', async (req, res, next) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthenticated' });

    const prisma = req.app.get('prisma') as PrismaClient;
    const { current_password, new_password } = req.body ?? {};

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password and new_password are required' });
    }
    if (String(new_password).length < 6) {
      return res.status(400).json({ error: 'new_password must be at least 6 characters' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(401).json({ error: 'Unauthenticated' });

    const valid = await bcrypt.compare(String(current_password), user.password);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(String(new_password), 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });

    res.json({ updated: true });
  } catch (err) {
    next(err);
  }
});

export default router;

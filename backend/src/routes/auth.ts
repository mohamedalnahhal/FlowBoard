import { Router } from 'express';
import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from '../lib/session.js';

const router = Router();

// ── POST /auth/login ──────────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma') as PrismaClient;
    const { username, password } = req.body ?? {};

    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const user = await prisma.user.findFirst({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

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
      select: { id: true, display_name: true, username: true, email: true, role: true },
    });

    if (!user) return res.status(401).json({ error: 'Unauthenticated' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;

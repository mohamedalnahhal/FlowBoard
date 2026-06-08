import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';

const router = Router();

async function requireAuth(req: import('express').Request, res: import('express').Response): Promise<string | null> {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthenticated' });
    return null;
  }
  return req.user.id;
}

// ── GET /dashboard/my-tasks-count ──────────────────────────────────────────────
router.get('/my-tasks-count', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const count = await prisma.taskMember.count({ where: { user_id: userId } });

    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// ── GET /dashboard/announcements?workspace_id= ────────────────────────────────
router.get('/announcements', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const { workspace_id } = req.query as Record<string, string | undefined>;
    if (!workspace_id) return res.status(400).json({ error: 'workspace_id is required' });

    const announcements = await prisma.announcement.findMany({
      where:   { workspace_id },
      include: { author: { select: { id: true, display_name: true, username: true } } },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    res.json(announcements);
  } catch (err) {
    next(err);
  }
});

// ── GET /dashboard/calendar-events?team_id= ───────────────────────────────────
router.get('/calendar-events', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const { team_id, from, to } = req.query as Record<string, string | undefined>;
    if (!team_id) return res.status(400).json({ error: 'team_id is required' });

    const events = await prisma.calendarEvent.findMany({
      where: {
        team_id,
        ...(from && { ends_at:   { gte: new Date(from) } }),
        ...(to   && { starts_at: { lte: new Date(to) } }),
      },
      orderBy: { starts_at: 'asc' },
    });

    res.json(events);
  } catch (err) {
    next(err);
  }
});

// ── GET /dashboard/favorites ───────────────────────────────────────────────────
router.get('/favorites', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const favorites = await prisma.favorite.findMany({
      where:   { user_id: userId },
      include: { board: { select: { id: true, name: true, status: true, team: { select: { id: true, name: true } } } } },
      orderBy: { created_at: 'desc' },
    });

    res.json(favorites.map((f) => f.board));
  } catch (err) {
    next(err);
  }
});

// ── POST /dashboard/favorites ──────────────────────────────────────────────────
router.post('/favorites', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const { board_id } = req.body ?? {};
    if (!board_id) return res.status(400).json({ error: 'board_id is required' });

    const favorite = await prisma.favorite.upsert({
      where:  { user_id_board_id: { user_id: userId, board_id } },
      update: {},
      create: { user_id: userId, board_id },
    });

    res.status(201).json(favorite);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /dashboard/favorites/:boardId ───────────────────────────────────────
router.delete('/favorites/:boardId', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    await prisma.favorite.deleteMany({
      where: { user_id: userId, board_id: (req.params.boardId as string) },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ── GET /dashboard/notifications ───────────────────────────────────────────────
router.get('/notifications', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const notifications = await prisma.notification.findMany({
      where:   { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 30,
    });

    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /dashboard/notifications/:notificationId/read ───────────────────────
router.patch('/notifications/:notificationId/read', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    await prisma.notification.updateMany({
      where: { id: (req.params.notificationId as string), user_id: userId },
      data:  { is_read: true },
    });

    res.json({ updated: true });
  } catch (err) {
    next(err);
  }
});

export default router;

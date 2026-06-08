import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { SYSTEM_ADMIN_ROLE } from '../core/permissions/constants.js';

const router = Router();

async function requireAuth(req: import('express').Request, res: import('express').Response): Promise<string | null> {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthenticated' });
    return null;
  }
  return req.user.id;
}

// ── GET /workspaces ────────────────────────────────────────────────────────────
// Workspaces the current user belongs to (via team membership), or all if system admin.
router.get('/', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

    const workspaces = user?.role === SYSTEM_ADMIN_ROLE
      ? await prisma.workspace.findMany({ orderBy: { name: 'asc' } })
      : await prisma.workspace.findMany({
          where: { teams: { some: { user_teams: { some: { user_id: userId } } } } },
          orderBy: { name: 'asc' },
        });

    res.json(workspaces);
  } catch (err) {
    next(err);
  }
});

// ── GET /workspaces/:workspaceId ───────────────────────────────────────────────
router.get('/:workspaceId', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const workspace = await prisma.workspace.findUnique({
      where:   { id: (req.params.workspaceId as string) },
      include: {
        teams: {
          include: { _count: { select: { user_teams: true, boards: true } } },
        },
      },
    });

    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    res.json(workspace);
  } catch (err) {
    next(err);
  }
});

// ── POST /workspaces ───────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role !== SYSTEM_ADMIN_ROLE) {
      return res.status(403).json({ error: 'Only system administrators can create workspaces' });
    }

    const { name } = req.body ?? {};
    if (!name) return res.status(400).json({ error: 'name is required' });

    const workspace = await prisma.workspace.create({ data: { name } });
    res.status(201).json(workspace);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /workspaces/:workspaceId ─────────────────────────────────────────────
router.patch('/:workspaceId', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role !== SYSTEM_ADMIN_ROLE) {
      return res.status(403).json({ error: 'Only system administrators can edit workspaces' });
    }

    const { name } = req.body ?? {};
    const updated = await prisma.workspace.updateMany({
      where: { id: (req.params.workspaceId as string) },
      data:  { ...(name && { name }) },
    });

    if (updated.count === 0) return res.status(404).json({ error: 'Workspace not found' });
    res.json({ updated: true });
  } catch (err) {
    next(err);
  }
});

export default router;

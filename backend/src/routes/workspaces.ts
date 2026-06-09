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
// Update workspace name. Any team member of the workspace can call this.
router.patch('/:workspaceId', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;

    // Allow any member of the workspace (or system admin)
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role !== SYSTEM_ADMIN_ROLE) {
      const membership = await prisma.userTeam.findFirst({
        where: { user_id: userId, team: { workspace_id: (req.params.workspaceId as string) } },
      });
      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this workspace' });
      }
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

// ── GET /workspaces/:workspaceId/members ───────────────────────────────────────
// List all unique users that are members of any team in this workspace.
router.get('/:workspaceId/members', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;

    // Fetch all UserTeam rows for teams in this workspace
    const userTeams = await prisma.userTeam.findMany({
      where: { team: { workspace_id: (req.params.workspaceId as string) } },
      include: {
        user: { select: { id: true, display_name: true, username: true, email: true, role: true } },
        team: { select: { id: true, name: true } },
      },
    });

    if (!userTeams.length) return res.json([]);

    // Aggregate by user
    const byUser = new Map<string, {
      id: string;
      display_name: string | null;
      username: string;
      email: string | null;
      role: number;
      teams: { id: string; name: string; teamRole: number }[];
    }>();

    for (const ut of userTeams) {
      const existing = byUser.get(ut.user_id);
      if (existing) {
        existing.teams.push({ id: ut.team.id, name: ut.team.name, teamRole: ut.role });
      } else {
        byUser.set(ut.user_id, {
          id:           ut.user.id,
          display_name: ut.user.display_name,
          username:     ut.user.username,
          email:        ut.user.email,
          role:         ut.user.role,
          teams:        [{ id: ut.team.id, name: ut.team.name, teamRole: ut.role }],
        });
      }
    }

    res.json([...byUser.values()]);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /workspaces/:workspaceId/members/:userId ────────────────────────────
// Remove a user from all teams in this workspace.
router.delete('/:workspaceId/members/:targetUserId', async (req, res, next) => {
  try {
    const requesterId = await requireAuth(req, res);
    if (!requesterId) return;

    const { workspaceId, targetUserId } = req.params as { workspaceId: string; targetUserId: string };

    if (requesterId === targetUserId) {
      return res.status(400).json({ error: 'Cannot remove yourself via this endpoint' });
    }

    const prisma = req.app.get('prisma') as PrismaClient;

    // Requester must be a member of the workspace
    const requesterMembership = await prisma.userTeam.findFirst({
      where: { user_id: requesterId, team: { workspace_id: workspaceId } },
    });
    const requesterUser = await prisma.user.findUnique({ where: { id: requesterId }, select: { role: true } });

    if (requesterUser?.role !== SYSTEM_ADMIN_ROLE && !requesterMembership) {
      return res.status(403).json({ error: 'You are not a member of this workspace' });
    }

    const deleted = await prisma.userTeam.deleteMany({
      where: { user_id: targetUserId, team: { workspace_id: workspaceId } },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'User is not a member of any team in this workspace' });
    }

    res.json({ removed: true, count: deleted.count });
  } catch (err) {
    next(err);
  }
});

export default router;

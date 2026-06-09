import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { checkPermission } from '../middleware/checkPermission.js';
import { ACTIONS } from '../core/permissions/constants.js';

const router = Router();

async function requireAuth(req: import('express').Request, res: import('express').Response): Promise<string | null> {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthenticated' });
    return null;
  }
  return req.user.id;
}

// ── GET /teams/mine ────────────────────────────────────────────────────────────
// Teams the current user belongs to — used by the sidebar/team selector.
// Registered before /:teamId so "mine" isn't captured as an id param.
router.get('/mine', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const memberships = await prisma.userTeam.findMany({
      where:   { user_id: userId },
      include: {
        team: {
          include: {
            workspace: true,
            boards: { select: { id: true, name: true, status: true }, orderBy: { name: 'asc' } },
          },
        },
      },
    });

    res.json(memberships.map((m) => ({ ...m.team, my_role: m.role })));
  } catch (err) {
    next(err);
  }
});

// ── GET /teams ─────────────────────────────────────────────────────────────────
// Teams Overview — lists teams in a workspace with member counts, lead, avatars.
router.get('/', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const { workspace_id } = req.query as Record<string, string | undefined>;

    const teams = await prisma.team.findMany({
      where: { ...(workspace_id && { workspace_id }) },
      include: {
        workspace: { select: { id: true, name: true } },
        _count:    { select: { user_teams: true, boards: true } },
        user_teams: {
          orderBy: { role: 'asc' },
          take:    6,
          include: { user: { select: { id: true, display_name: true, username: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(teams.map((t) => ({
      id:           t.id,
      name:         t.name,
      workspace:    t.workspace,
      member_count: t._count.user_teams,
      board_count:  t._count.boards,
      lead:         t.user_teams.find((ut) => ut.role === 1)?.user ?? t.user_teams[0]?.user ?? null,
      members:      t.user_teams.map((ut) => ut.user),
      created_at:   t.created_at,
    })));
  } catch (err) {
    next(err);
  }
});

// ── POST /teams ────────────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const { name, workspace_id } = req.body ?? {};
    if (!name || !workspace_id) {
      return res.status(400).json({ error: 'name and workspace_id are required' });
    }

    const team = await prisma.team.create({
      data: {
        name,
        workspace_id,
        user_teams: { create: { user_id: userId, role: 1 } },
        groups:     { create: { all_members: true } },
      },
    });

    res.status(201).json(team);
  } catch (err) {
    next(err);
  }
});

// ── GET /teams/:teamId ─────────────────────────────────────────────────────────
router.get(
  '/:teamId',
  checkPermission(ACTIONS.TEAM_VIEW, 'team', (req) => (req.params.teamId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const team = await prisma.team.findUnique({
        where:   { id: (req.params.teamId as string) },
        include: {
          workspace: { select: { id: true, name: true } },
          boards:    { select: { id: true, name: true, status: true } },
          user_teams: {
            include: { user: { select: { id: true, display_name: true, username: true, email: true } } },
          },
        },
      });

      if (!team) return res.status(404).json({ error: 'Team not found' });
      res.json(team);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /teams/:teamId ───────────────────────────────────────────────────────
router.patch(
  '/:teamId',
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => (req.params.teamId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { name } = req.body ?? {};

      const updated = await prisma.team.updateMany({
        where: { id: (req.params.teamId as string) },
        data:  { ...(name && { name }) },
      });

      if (updated.count === 0) return res.status(404).json({ error: 'Team not found' });
      res.json({ updated: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /teams/:teamId/members ────────────────────────────────────────────────
router.post(
  '/:teamId/members',
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => (req.params.teamId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { user_id, role = 3 } = req.body ?? {};
      if (!user_id) return res.status(400).json({ error: 'user_id is required' });

      const membership = await prisma.userTeam.create({
        data: { user_id, team_id: (req.params.teamId as string)!, role },
      });

      res.status(201).json(membership);
    } catch (err: any) {
      if (err.code === 'P2002') {
        return res.status(409).json({ error: 'User is already a member of this team' });
      }
      next(err);
    }
  },
);

// ── DELETE /teams/:teamId/members/:userId ─────────────────────────────────────
router.delete(
  '/:teamId/members/:userId',
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => (req.params.teamId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      await prisma.userTeam.deleteMany({
        where: { user_id: (req.params.userId as string), team_id: (req.params.teamId as string) },
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export default router;

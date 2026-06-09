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

// Returns true if the user is a workspace admin (role ≤ 2) or a direct team member.
async function canAccessTeam(prisma: PrismaClient, userId: string, teamId: string): Promise<boolean> {
  const [user, membership] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    prisma.userTeam.findUnique({ where: { user_id_team_id: { user_id: userId, team_id: teamId } } }),
  ]);
  return (user?.role ?? 99) <= 2 || membership !== null;
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

    const team = await prisma.$transaction(async (tx) => {
      const created = await tx.team.create({
        data: {
          name,
          workspace_id,
          user_teams: { create: { user_id: userId, role: 1 } },
        },
      });

      const group = await tx.group.create({ data: { team_id: created.id, all_members: true } });

      const defaultPerms = [
        'team:view', 'team:manage_members',
        'board:view', 'board:edit', 'board:update', 'board:delete', 'board:share',
        'board:manage_lists', 'board:manage_labels',
        'task:view', 'task:create', 'task:edit', 'task:update', 'task:move',
        'task:assign_self', 'task:assign_others', 'task:delete',
        'history:view',
        'comment:create', 'comment:edit_own', 'comment:delete_own', 'comment:delete_any',
        'checklist_item:toggle', 'checklist_item:mutate', 'checklist:manage',
        'list:create', 'list:update', 'list:delete',
      ];

      await tx.permission.createMany({
        data: defaultPerms.map((action) => ({
          action,
          type: 'ALLOW' as const,
          priority: 5,
          group_id: group.id,
        })),
        skipDuplicates: true,
      });

      return created;
    });

    res.status(201).json(team);
  } catch (err) {
    next(err);
  }
});

// ── GET /teams/:teamId ─────────────────────────────────────────────────────────
router.get('/:teamId', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const teamId = req.params.teamId as string;

    if (!(await canAccessTeam(prisma, userId, teamId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const team = await prisma.team.findUnique({
      where:   { id: teamId },
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
});

// ── PATCH /teams/:teamId ───────────────────────────────────────────────────────
router.patch('/:teamId', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const teamId = req.params.teamId as string;

    if (!(await canAccessTeam(prisma, userId, teamId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { name } = req.body ?? {};
    const updated = await prisma.team.updateMany({
      where: { id: teamId },
      data:  { ...(name && { name }) },
    });

    if (updated.count === 0) return res.status(404).json({ error: 'Team not found' });
    res.json({ updated: true });
  } catch (err) {
    next(err);
  }
});

// ── POST /teams/:teamId/members ────────────────────────────────────────────────
router.post('/:teamId/members', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const teamId = req.params.teamId as string;

    if (!(await canAccessTeam(prisma, userId, teamId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { user_id, role = 3 } = req.body ?? {};
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const membership = await prisma.userTeam.create({
      data: { user_id, team_id: teamId, role },
    });

    res.status(201).json(membership);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'User is already a member of this team' });
    }
    next(err);
  }
});

// ── DELETE /teams/:teamId/members/:userId ─────────────────────────────────────
router.delete('/:teamId/members/:userId', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const teamId = req.params.teamId as string;

    if (!(await canAccessTeam(prisma, userId, teamId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.userTeam.deleteMany({
      where: { user_id: (req.params.userId as string), team_id: teamId },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;

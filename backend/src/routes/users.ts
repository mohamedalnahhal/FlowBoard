import { Router } from 'express';
import bcrypt from 'bcryptjs';
import type { PrismaClient, Prisma } from '@prisma/client';

const router = Router();

async function requireAuth(req: import('express').Request, res: import('express').Response): Promise<string | null> {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthenticated' });
    return null;
  }
  return req.user.id;
}

// ── GET /users ─────────────────────────────────────────────────────────────────
// Users Management — search + role + team filters, paginated.
router.get('/', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const { search, role, team_id, page = '1', page_size = '20' } = req.query as Record<string, string | undefined>;

    const take = Math.min(Number.parseInt(page_size, 10) || 20, 100);
    const currentPage = Math.max(Number.parseInt(page, 10) || 1, 1);
    const skip = (currentPage - 1) * take;

    const where: Prisma.UserWhereInput = {
      ...(search && {
        OR: [
          { display_name: { contains: search, mode: 'insensitive' } },
          { username:     { contains: search, mode: 'insensitive' } },
          { email:        { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(role !== undefined && { role: Number.parseInt(role, 10) }),
      ...(team_id && { user_teams: { some: { team_id } } }),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true, display_name: true, username: true, email: true, role: true, created_at: true,
          user_teams: { include: { team: { select: { id: true, name: true } } } },
        },
        orderBy: { display_name: 'asc' },
        take,
        skip,
      }),
    ]);

    res.json({
      data: users.map((u) => ({
        id:           u.id,
        display_name: u.display_name,
        username:     u.username,
        email:        u.email,
        role:         u.role,
        created_at:   u.created_at,
        teams:        u.user_teams.map((ut) => ut.team),
      })),
      pagination: { page: currentPage, page_size: take, total, total_pages: Math.ceil(total / take) },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /users/:userId ─────────────────────────────────────────────────────────
router.get('/:userId', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const user = await prisma.user.findUnique({
      where:  { id: (req.params.userId as string) },
      select: {
        id: true, display_name: true, username: true, email: true, phone_number: true,
        role: true, created_at: true,
        user_teams: { include: { team: { select: { id: true, name: true } } } },
        user_groups: { include: { group: { select: { id: true, team_id: true, all_members: true } } } },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// ── POST /users ────────────────────────────────────────────────────────────────
// Invite / create a user.
router.post('/', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const { display_name, username, email, phone_number, password, role = 3 } = req.body ?? {};

    if (!display_name || !username || !password) {
      return res.status(400).json({ error: 'display_name, username and password are required' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { display_name, username, email, phone_number, password: hashed, role },
      select: { id: true, display_name: true, username: true, email: true, role: true },
    });

    res.status(201).json(user);
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Username already taken' });
    }
    next(err);
  }
});

// ── PATCH /users/:userId/role ──────────────────────────────────────────────────
router.patch('/:userId/role', async (req, res, next) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthenticated' });
    const prisma = req.app.get('prisma') as PrismaClient;

    const requester = await prisma.user.findUnique({ where: { id: req.user.id }, select: { role: true } });
    // Only workspace owner (role=1) or admin (role=2) or system admin (role=0) can change roles
    if (!requester || requester.role > 2) {
      return res.status(403).json({ error: 'Insufficient permissions to change user roles' });
    }

    const { userId } = req.params as { userId: string };
    const { role, sync_permissions = true, revoke_extra = false } = req.body ?? {};
    if (role === undefined || typeof role !== 'number') {
      return res.status(400).json({ error: 'role (number) is required' });
    }

    // Map workspace role → team role for default permissions
    const teamRole = role <= 2 ? 'TEAM_LEAD' : role === 3 ? 'TEAM_MEMBER' : 'TEAM_VIEWER';
    const ROLE_DEFAULTS: Record<string, string[]> = {
      TEAM_LEAD: [
        'team:view','team:manage_members',
        'board:view','board:edit','board:delete','board:manage_lists','board:manage_labels',
        'task:view','task:create','task:edit','task:move',
        'history:view','comment:create','comment:edit_own','comment:delete_own',
        'checklist_item:toggle','checklist_item:mutate','attachment:upload',
      ],
      TEAM_MEMBER: [
        'team:view',
        'board:view','board:manage_lists','board:manage_labels',
        'task:view','task:create','task:edit','task:move',
        'history:view','comment:create','comment:edit_own','comment:delete_own',
        'checklist_item:toggle','checklist_item:mutate','attachment:upload',
      ],
      TEAM_VIEWER: ['team:view','board:view','task:view','history:view','comment:create'],
    };
    const newDefaults = ROLE_DEFAULTS[teamRole] ?? [];

    await prisma.$transaction(async (tx) => {
      // Update the user's workspace role
      await tx.user.update({ where: { id: userId }, data: { role } });

      if (!sync_permissions) return;

      // Get all teams the user belongs to
      const memberships = await tx.userTeam.findMany({
        where: { user_id: userId },
        include: { team: { include: { groups: { where: { all_members: true } } } } },
      });

      for (const membership of memberships) {
        const allMembersGroup = membership.team.groups[0];
        if (!allMembersGroup) continue;

        // Ensure user is in the all_members group
        await tx.userGroup.upsert({
          where: { user_id_group_id: { user_id: userId, group_id: allMembersGroup.id } },
          update: {},
          create: { user_id: userId, group_id: allMembersGroup.id },
        });

        // Add new default permissions (ALLOW, priority 5)
        await tx.permission.createMany({
          data: newDefaults.map((action) => ({
            action,
            type: 'ALLOW' as const,
            priority: 5,
            group_id: allMembersGroup.id,
          })),
          skipDuplicates: true,
        });

        if (revoke_extra) {
          // Revoke permissions not in the new defaults
          await tx.permission.deleteMany({
            where: {
              group_id: allMembersGroup.id,
              action: { notIn: newDefaults },
              priority: { lte: 5 },
            },
          });
        }
      }
    });

    const updated = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, display_name: true, username: true, role: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /users/:userId ───────────────────────────────────────────────────────
router.patch('/:userId', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const { display_name, email, phone_number, role } = req.body ?? {};

    const updated = await prisma.user.updateMany({
      where: { id: (req.params.userId as string) },
      data: {
        ...(display_name !== undefined && { display_name }),
        ...(email        !== undefined && { email }),
        ...(phone_number !== undefined && { phone_number }),
        ...(role         !== undefined && { role }),
      },
    });

    if (updated.count === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ updated: true });
  } catch (err) {
    next(err);
  }
});

export default router;

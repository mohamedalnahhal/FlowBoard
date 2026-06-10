import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { SYSTEM_ADMIN_ROLE, ROLES } from '../core/permissions/constants.js';
import { requireAuth, getUserRole, isSystemAdmin, isWorkspaceAdmin, isWorkspaceMember } from '../lib/auth.js';

const router = Router();

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
    const workspaceId = req.params.workspaceId as string;

    // Only members of the workspace (or system admins) may view it.
    const role = await getUserRole(prisma, userId);
    if (!isSystemAdmin(role) && !(await isWorkspaceMember(prisma, userId, workspaceId))) {
      return res.status(403).json({ error: 'You are not a member of this workspace' });
    }

    const workspace = await prisma.workspace.findUnique({
      where:   { id: workspaceId },
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

    // Only System Admins, Workspace Owners, and Workspace Admins may create workspaces.
    const requestingUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!requestingUser || requestingUser.role > ROLES.SYSTEM.WORKSPACE_ADMIN) {
      return res.status(403).json({
        error: 'Only Workspace Owners and Admins can create workspaces.',
      });
    }

    const { name } = req.body ?? {};
    if (!name) return res.status(400).json({ error: 'name is required' });

    // Create workspace + default team in a transaction
    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({ data: { name } });
      const team = await tx.team.create({ data: { name: 'General', workspace_id: ws.id } });
      const group = await tx.group.create({ data: { team_id: team.id, all_members: true } });
      await tx.userTeam.create({ data: { user_id: userId, team_id: team.id, role: 1 } });
      await tx.userGroup.create({ data: { user_id: userId, group_id: group.id } });
      // Seed TEAM_LEAD default permissions for the group
      const leadPerms = [
        'team:view','team:manage_members',
        'board:view','board:edit','board:delete','board:manage_lists','board:manage_labels',
        'task:view','task:create','task:edit','task:move',
        'history:view','comment:create','comment:edit_own','comment:delete_own',
        'checklist_item:toggle','checklist_item:mutate','attachment:upload',
      ];
      await tx.permission.createMany({
        data: leadPerms.map((action) => ({
          action,
          type: 'ALLOW' as const,
          priority: 5,
          group_id: group.id,
        })),
        skipDuplicates: true,
      });
      return ws;
    });

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
    const workspaceId = req.params.workspaceId as string;

    // Only members of the workspace (or system admins) may list its members.
    const role = await getUserRole(prisma, userId);
    if (!isSystemAdmin(role) && !(await isWorkspaceMember(prisma, userId, workspaceId))) {
      return res.status(403).json({ error: 'You are not a member of this workspace' });
    }

    // Fetch all UserTeam rows for teams in this workspace
    const userTeams = await prisma.userTeam.findMany({
      where: { team: { workspace_id: workspaceId } },
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

    // Removing members is restricted to workspace owners/admins (or system
    // admins) who are themselves members of the workspace.
    const requesterRole = await getUserRole(prisma, requesterId);
    if (!isSystemAdmin(requesterRole)) {
      if (!isWorkspaceAdmin(requesterRole)) {
        return res.status(403).json({ error: 'Insufficient permissions to remove workspace members' });
      }
      if (!(await isWorkspaceMember(prisma, requesterId, workspaceId))) {
        return res.status(403).json({ error: 'You are not a member of this workspace' });
      }
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

// ── GET /workspaces/:workspaceId/permissions ───────────────────────────────────
// Returns workspace members with their roles (workspace permission overview).
router.get('/:workspaceId/permissions', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;
    const prisma = req.app.get('prisma') as PrismaClient;

    // Check requester is a workspace member (system admins are exempt)
    const role = await getUserRole(prisma, userId);
    if (!isSystemAdmin(role) && !(await isWorkspaceMember(prisma, userId, (req.params.workspaceId as string)))) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }

    // Get all unique members across all teams in workspace
    const teams = await prisma.team.findMany({
      where: { workspace_id: (req.params.workspaceId as string) },
      include: {
        user_teams: {
          include: { user: { select: { id: true, display_name: true, username: true, email: true, role: true } } },
        },
      },
    });

    const seen = new Set<string>();
    const members: Array<{ id: string; display_name: string | null; username: string; email: string | null; role: number }> = [];
    for (const team of teams) {
      for (const ut of team.user_teams) {
        if (!seen.has(ut.user.id)) {
          seen.add(ut.user.id);
          members.push(ut.user);
        }
      }
    }

    res.json(members);
  } catch (err) {
    next(err);
  }
});

export default router;

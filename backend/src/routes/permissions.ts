import { Router } from 'express';
import type { PrismaClient, Prisma } from '@prisma/client';
import { checkPermission } from '../middleware/checkPermission.js';
import { resolvePermission } from '../core/permissions/permissionService.js';
import { ACTIONS, SCOPE_TYPES, PERMISSION_TYPES, type ScopeType } from '../core/permissions/constants.js';

const router = Router({ mergeParams: true }); // expects :teamId from parent router

const VALID_ACTIONS     = new Set<string>(Object.values(ACTIONS));
const VALID_SCOPE_TYPES = new Set<string>(Object.values(SCOPE_TYPES));
const VALID_TYPES       = new Set<string>(Object.values(PERMISSION_TYPES));

// The schema stores scope via explicit nullable FK columns rather than a
// generic scope_type/scope_id pair. "team" scope = all three columns NULL.
function scopeColumnFor(scopeType: ScopeType): 'board_id' | 'list_id' | 'task_id' | null {
  switch (scopeType) {
    case SCOPE_TYPES.BOARD: return 'board_id';
    case SCOPE_TYPES.LIST:  return 'list_id';
    case SCOPE_TYPES.TASK:  return 'task_id';
    default:                return null; // team-wide
  }
}

function scopeFromRow(row: { board_id: string | null; list_id: string | null; task_id: string | null }) {
  if (row.task_id)  return { scope_type: SCOPE_TYPES.TASK,  scope_id: row.task_id };
  if (row.list_id)  return { scope_type: SCOPE_TYPES.LIST,  scope_id: row.list_id };
  if (row.board_id) return { scope_type: SCOPE_TYPES.BOARD, scope_id: row.board_id };
  return { scope_type: SCOPE_TYPES.TEAM, scope_id: null as string | null };
}

function validatePermissionBody(body: any) {
  const errors: string[] = [];
  const { action, type, priority, scope_type, scope_id, group_id } = body ?? {};

  if (!action || !VALID_ACTIONS.has(action)) {
    errors.push(`action must be one of: ${[...VALID_ACTIONS].join(', ')}`);
  }
  if (!type || !VALID_TYPES.has(type)) {
    errors.push(`type must be one of: ${[...VALID_TYPES].join(', ')}`);
  }
  if (!scope_type || !VALID_SCOPE_TYPES.has(scope_type)) {
    errors.push(`scope_type must be one of: ${[...VALID_SCOPE_TYPES].join(', ')}`);
  }
  if (scope_type && scope_type !== SCOPE_TYPES.TEAM && scope_type !== SCOPE_TYPES.WORKSPACE && !scope_id) {
    errors.push('scope_id is required for board/list/task scoped rules');
  }
  if (!group_id) {
    errors.push('group_id is required');
  }
  if (priority !== undefined && (!Number.isInteger(priority) || priority < 0)) {
    errors.push('priority must be a non-negative integer');
  }

  return errors;
}

// ── GET /teams/:teamId/permissions ────────────────────────────────────────────
// List all permissions for groups in this team, optionally filtered.
router.get(
  '/',
  checkPermission(ACTIONS.TEAM_VIEW, 'team', (req) => (req.params.teamId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { group_id, scope_type, scope_id, action } = req.query as Record<string, string | undefined>;

      const where: Prisma.PermissionWhereInput = {
        group: { team_id: (req.params.teamId as string) },
        ...(group_id && { group_id }),
        ...(action   && { action }),
      };

      if (scope_type) {
        const column = scopeColumnFor(scope_type as ScopeType);
        if (column) {
          Object.assign(where, scope_id ? { [column]: scope_id } : { [column]: { not: null } });
        } else {
          Object.assign(where, { board_id: null, list_id: null, task_id: null });
        }
      }

      const permissions = await prisma.permission.findMany({
        where,
        include: { group: { select: { id: true, all_members: true } } },
        orderBy: [{ priority: 'desc' }, { created_at: 'asc' }],
      });

      res.json(permissions.map((p) => ({ ...p, ...scopeFromRow(p) })));
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /teams/:teamId/permissions ───────────────────────────────────────────
// Create a new permission rule on a group.
router.post(
  '/',
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => (req.params.teamId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { action, type, priority = 0, description, scope_type, scope_id, group_id } = req.body ?? {};

      const errors = validatePermissionBody(req.body);
      if (errors.length) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
      }

      const group = await prisma.group.findFirst({
        where: { id: group_id, team_id: (req.params.teamId as string) },
      });
      if (!group) {
        return res.status(404).json({ error: 'Group not found in this team' });
      }

      const column = scopeColumnFor(scope_type as ScopeType);
      const scopeData = column ? { [column]: scope_id } : {};

      const permission = await prisma.permission.create({
        data: { action, type, priority, description, group_id, ...scopeData },
      });

      res.status(201).json({ ...permission, ...scopeFromRow(permission) });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /teams/:teamId/permissions/:permissionId ──────────────────────────────
router.get(
  '/:permissionId',
  checkPermission(ACTIONS.TEAM_VIEW, 'team', (req) => (req.params.teamId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;

      const permission = await prisma.permission.findFirst({
        where: {
          id:    (req.params.permissionId as string),
          group: { team_id: (req.params.teamId as string) },
        },
        include: { group: true },
      });

      if (!permission) return res.status(404).json({ error: 'Permission not found' });
      res.json({ ...permission, ...scopeFromRow(permission) });
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /teams/:teamId/permissions/:permissionId ────────────────────────────
// Update a permission rule. type, priority, description, the subject group, and
// the scope (scope_type/scope_id) can all be changed; action is immutable.
router.patch(
  '/:permissionId',
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => (req.params.teamId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const teamId = req.params.teamId as string;
      const { type, priority, description, group_id, scope_type, scope_id } = req.body ?? {};

      const errors: string[] = [];
      if (type !== undefined && !VALID_TYPES.has(type)) {
        errors.push(`type must be one of: ${[...VALID_TYPES].join(', ')}`);
      }
      if (priority !== undefined && (!Number.isInteger(priority) || priority < 0)) {
        errors.push('priority must be a non-negative integer');
      }
      if (scope_type !== undefined && !VALID_SCOPE_TYPES.has(scope_type)) {
        errors.push(`scope_type must be one of: ${[...VALID_SCOPE_TYPES].join(', ')}`);
      }
      if (
        scope_type !== undefined &&
        scope_type !== SCOPE_TYPES.TEAM &&
        scope_type !== SCOPE_TYPES.WORKSPACE &&
        !scope_id
      ) {
        errors.push('scope_id is required for board/list/task scoped rules');
      }
      if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });

      // The new subject group, if provided, must belong to this team.
      if (group_id !== undefined) {
        const group = await prisma.group.findFirst({ where: { id: group_id, team_id: teamId } });
        if (!group) return res.status(404).json({ error: 'Group not found in this team' });
      }

      // When the scope changes, reset all scope columns and set the new one
      // (team-wide leaves them all null).
      let scopeData: Record<string, string | null> | undefined;
      if (scope_type !== undefined) {
        const column = scopeColumnFor(scope_type as ScopeType);
        scopeData = { board_id: null, list_id: null, task_id: null };
        if (column) scopeData[column] = scope_id;
      }

      const updated = await prisma.permission.updateMany({
        where: {
          id:    (req.params.permissionId as string),
          group: { team_id: teamId },
        },
        data: {
          ...(type        !== undefined && { type }),
          ...(priority    !== undefined && { priority }),
          ...(description !== undefined && { description }),
          ...(group_id    !== undefined && { group_id }),
          ...(scopeData   !== undefined && scopeData),
        },
      });

      if (updated.count === 0) return res.status(404).json({ error: 'Permission not found' });
      res.json({ updated: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /teams/:teamId/permissions/:permissionId ───────────────────────────
router.delete(
  '/:permissionId',
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => (req.params.teamId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;

      const deleted = await prisma.permission.deleteMany({
        where: {
          id:    (req.params.permissionId as string),
          group: { team_id: (req.params.teamId as string) },
        },
      });

      if (deleted.count === 0) return res.status(404).json({ error: 'Permission not found' });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /teams/:teamId/permissions/check ─────────────────────────────────────
// Utility endpoint: check if the current user (or a given user) has a permission.
router.post(
  '/check',
  checkPermission(ACTIONS.TEAM_VIEW, 'team', (req) => (req.params.teamId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { action, scope_type, scope_id, user_id } = req.body ?? {};

      if (!action || !scope_type || !scope_id) {
        return res.status(400).json({ error: 'action, scope_type, and scope_id are required' });
      }

      const targetUserId = user_id ?? req.user!.id;
      if (user_id && user_id !== req.user!.id) {
        const canManage = await resolvePermission(
          prisma,
          req.user!.id!,
          ACTIONS.TEAM_MANAGE_MEMBERS,
          'team',
          (req.params.teamId as string)!,
        );
        if (!canManage.allowed) {
          return res.status(403).json({ error: 'Cannot check permissions of other users' });
        }
      }

      const result = await resolvePermission(prisma, targetUserId, action, scope_type, scope_id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /teams/:teamId/permissions/check-bulk ────────────────────────────────
// Returns a map of { "[action]:[scope_type]:[scope_id]": boolean }
router.post(
  '/check-bulk',
  checkPermission(ACTIONS.TEAM_VIEW, 'team', (req) => (req.params.teamId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { checks } = req.body ?? {};

      if (!Array.isArray(checks) || checks.length === 0) {
        return res.status(400).json({ error: 'checks must be a non-empty array' });
      }
      if (checks.length > 50) {
        return res.status(400).json({ error: 'Maximum 50 permission checks per request' });
      }

      const results = await Promise.all(
        checks.map(({ action, scope_type, scope_id }: any) =>
          resolvePermission(prisma, req.user!.id!, action, scope_type, scope_id)
            .then(({ allowed }) => ({ key: `${action}:${scope_type}:${scope_id}`, allowed })),
        ),
      );

      const map = Object.fromEntries(results.map(({ key, allowed }) => [key, allowed]));
      res.json(map);
    } catch (err) {
      next(err);
    }
  },
);

// ── User-scoped permission endpoints (mounted separately at /teams/:teamId/users/:userId/permissions) ──

export const userPermissionsRouter = Router({ mergeParams: true });

// GET /teams/:teamId/users/:userId/permissions
// Returns all permission rules that affect the given user (via their group memberships).
userPermissionsRouter.get(
  '/',
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => req.params.teamId as string),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { teamId, userId } = req.params as Record<string, string>;

      const userGroupRows = await prisma.userGroup.findMany({
        where: { user_id: userId, group: { team_id: teamId } },
        select: { group_id: true },
      });
      const groupIds = userGroupRows.map((r) => r.group_id);

      const permissions = await prisma.permission.findMany({
        where: { group_id: { in: groupIds } },
        include: { group: { select: { id: true, name: true, all_members: true } } },
        orderBy: [{ priority: 'desc' }, { created_at: 'asc' }],
      });

      res.json(permissions.map((p) => ({ ...p, ...scopeFromRow(p) })));
    } catch (err) {
      next(err);
    }
  },
);

// POST /teams/:teamId/users/:userId/permissions
// Grants a permission directly to a user by finding/creating their personal group.
userPermissionsRouter.post(
  '/',
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => req.params.teamId as string),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { teamId, userId } = req.params as Record<string, string>;
      const { action, type, scope_type, scope_id, priority = 50 } = req.body ?? {};

      if (!action || !VALID_ACTIONS.has(action)) {
        return res.status(400).json({ error: `action must be one of: ${[...VALID_ACTIONS].join(', ')}` });
      }
      if (!type || !VALID_TYPES.has(type)) {
        return res.status(400).json({ error: `type must be ALLOW or DENY` });
      }
      if (!scope_type || !VALID_SCOPE_TYPES.has(scope_type)) {
        return res.status(400).json({ error: `scope_type must be one of: ${[...VALID_SCOPE_TYPES].join(', ')}` });
      }

      const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { display_name: true } });
      if (!targetUser) return res.status(404).json({ error: 'User not found' });

      const groupName = `__personal__${userId}`;

      const result = await prisma.$transaction(async (tx) => {
        let group = await tx.group.findFirst({
          where: { team_id: teamId, name: groupName },
        });

        if (!group) {
          group = await tx.group.create({
            data: { team_id: teamId, name: groupName, all_members: false },
          });
          await tx.userGroup.create({ data: { user_id: userId, group_id: group.id } });
        } else {
          const alreadyIn = await tx.userGroup.findFirst({ where: { user_id: userId, group_id: group.id } });
          if (!alreadyIn) {
            await tx.userGroup.create({ data: { user_id: userId, group_id: group.id } });
          }
        }

        const column = scopeColumnFor(scope_type as ScopeType);
        const scopeData = column ? { [column]: scope_id } : {};

        const permission = await tx.permission.create({
          data: { action, type, priority: Number(priority), group_id: group.id, ...scopeData },
          include: { group: { select: { id: true, name: true, all_members: true } } },
        });

        return permission;
      });

      res.status(201).json({ ...result, ...scopeFromRow(result) });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /teams/:teamId/users/:userId/permissions/:permissionId
// Removes a permission rule. Only allowed if the rule belongs to the user's personal group.
userPermissionsRouter.delete(
  '/:permissionId',
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => req.params.teamId as string),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { teamId, userId, permissionId } = req.params as Record<string, string>;

      const permission = await prisma.permission.findFirst({
        where: {
          id: permissionId,
          group: { team_id: teamId, name: `__personal__${userId}` },
        },
      });

      if (!permission) {
        return res.status(404).json({ error: 'Permission not found or not a personal rule' });
      }

      await prisma.permission.delete({ where: { id: permissionId } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export default router;

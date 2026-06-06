const { Router } = require('express');
const { checkPermission } = require('../middleware/checkPermission');
const { resolvePermission } = require('../core/permissions/permissionService');
const { ACTIONS, SCOPE_TYPES, PERMISSION_TYPES } = require('../core/permissions/constants');

const router = Router({ mergeParams: true }); // expects :teamId from parent router

const VALID_ACTIONS     = new Set(Object.values(ACTIONS));
const VALID_SCOPE_TYPES = new Set(Object.values(SCOPE_TYPES));
const VALID_TYPES       = new Set(Object.values(PERMISSION_TYPES));

function validatePermissionBody(body) {
  const errors = [];
  const { action, type, priority, scope_type, scope_id, group_id } = body;

  if (!action || !VALID_ACTIONS.has(action)) {
    errors.push(`action must be one of: ${[...VALID_ACTIONS].join(', ')}`);
  }
  if (!type || !VALID_TYPES.has(type)) {
    errors.push(`type must be one of: ${[...VALID_TYPES].join(', ')}`);
  }
  if (!scope_type || !VALID_SCOPE_TYPES.has(scope_type)) {
    errors.push(`scope_type must be one of: ${[...VALID_SCOPE_TYPES].join(', ')}`);
  }
  if (!scope_id) {
    errors.push('scope_id is required');
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
// List all permissions in a team, optionally filtered by scope/group.
router.get(
  '/',
  checkPermission(ACTIONS.TEAM_VIEW, 'team', (req) => req.params.teamId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const { group_id, scope_type, scope_id, action } = req.query;

      // Build filter — always scope to groups belonging to this team
      const where = {
        groups: { team_id: req.params.teamId },
        ...(group_id   && { group_id }),
        ...(scope_type && { scope_type }),
        ...(scope_id   && { scope_id }),
        ...(action     && { action }),
      };

      const permissions = await prisma.permissions.findMany({
        where,
        include: { groups: { select: { id: true, all_members: true } } },
        orderBy: [{ priority: 'desc' }, { created_at: 'asc' }],
      });

      res.json(permissions);
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /teams/:teamId/permissions ───────────────────────────────────────────
// Create a new permission rule on a group.
router.post(
  '/',
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => req.params.teamId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const { action, type, priority = 0, description, scope_type, scope_id, group_id } = req.body;

      const errors = validatePermissionBody(req.body);
      if (errors.length) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
      }

      // Verify group belongs to this team
      const group = await prisma.groups.findFirst({
        where: { id: group_id, team_id: req.params.teamId },
      });
      if (!group) {
        return res.status(404).json({ error: 'Group not found in this team' });
      }

      const permission = await prisma.permissions.create({
        data: { action, type, priority, description, scope_type, scope_id, group_id },
      });

      res.status(201).json(permission);
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /teams/:teamId/permissions/:permissionId ──────────────────────────────
router.get(
  '/:permissionId',
  checkPermission(ACTIONS.TEAM_VIEW, 'team', (req) => req.params.teamId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');

      const permission = await prisma.permissions.findFirst({
        where: {
          id:     req.params.permissionId,
          groups: { team_id: req.params.teamId },
        },
        include: { groups: true },
      });

      if (!permission) return res.status(404).json({ error: 'Permission not found' });
      res.json(permission);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /teams/:teamId/permissions/:permissionId ────────────────────────────
// Update a permission rule (priority, type, description only — scope/action are immutable).
router.patch(
  '/:permissionId',
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => req.params.teamId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const { type, priority, description } = req.body;

      // Validate only the fields provided
      const errors = [];
      if (type !== undefined && !VALID_TYPES.has(type)) {
        errors.push(`type must be one of: ${[...VALID_TYPES].join(', ')}`);
      }
      if (priority !== undefined && (!Number.isInteger(priority) || priority < 0)) {
        errors.push('priority must be a non-negative integer');
      }
      if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });

      const updated = await prisma.permissions.updateMany({
        where: {
          id:     req.params.permissionId,
          groups: { team_id: req.params.teamId },
        },
        data: {
          ...(type        !== undefined && { type }),
          ...(priority    !== undefined && { priority }),
          ...(description !== undefined && { description }),
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
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => req.params.teamId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');

      const deleted = await prisma.permissions.deleteMany({
        where: {
          id:     req.params.permissionId,
          groups: { team_id: req.params.teamId },
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
// Useful for frontend capability checks before showing UI elements.
router.post(
  '/check',
  checkPermission(ACTIONS.TEAM_VIEW, 'team', (req) => req.params.teamId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const { action, scope_type, scope_id, user_id } = req.body;

      if (!action || !scope_type || !scope_id) {
        return res.status(400).json({ error: 'action, scope_type, and scope_id are required' });
      }

      // Only allow checking other users if the requester can manage the team
      const targetUserId = user_id ?? req.user.id;
      if (user_id && user_id !== req.user.id) {
        const canManage = await resolvePermission(
          prisma,
          req.user.id,
          ACTIONS.TEAM_MANAGE_MEMBERS,
          'team',
          req.params.teamId,
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
// Check multiple permissions in a single request — for frontend batch capability checks.
// Returns a map of { "[action]:[scope_type]:[scope_id]": boolean }
router.post(
  '/check-bulk',
  checkPermission(ACTIONS.TEAM_VIEW, 'team', (req) => req.params.teamId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const { checks } = req.body; // Array of { action, scope_type, scope_id }

      if (!Array.isArray(checks) || checks.length === 0) {
        return res.status(400).json({ error: 'checks must be a non-empty array' });
      }
      if (checks.length > 50) {
        return res.status(400).json({ error: 'Maximum 50 permission checks per request' });
      }

      const results = await Promise.all(
        checks.map(({ action, scope_type, scope_id }) =>
          resolvePermission(prisma, req.user.id, action, scope_type, scope_id)
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

module.exports = router;

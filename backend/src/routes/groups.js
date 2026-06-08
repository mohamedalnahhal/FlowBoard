const { Router } = require('express');
const { checkPermission } = require('../middleware/checkPermission');
const { ACTIONS } = require('../core/permissions/constants');
const { resolveUserGroups } = require('../core/permissions/permissionService');

const router = Router({ mergeParams: true }); // expects :teamId from parent router

// ── GET /teams/:teamId/groups ─────────────────────────────────────────────────
// List all groups in a team.
router.get(
  '/',
  checkPermission(ACTIONS.TEAM_VIEW, 'team', (req) => req.params.teamId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const groups = await prisma.groups.findMany({
        where: { team_id: req.params.teamId },
        include: {
          user_groups: {
            include: { users: { select: { id: true, display_name: true, username: true } } },
          },
        },
      });
      res.json(groups);
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /teams/:teamId/groups ────────────────────────────────────────────────
// Create a new group in a team.
router.post(
  '/',
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => req.params.teamId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const { all_members = false } = req.body;

      const group = await prisma.groups.create({
        data: {
          team_id:     req.params.teamId,
          all_members: Boolean(all_members),
        },
      });

      res.status(201).json(group);
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /teams/:teamId/groups/:groupId ────────────────────────────────────────
router.get(
  '/:groupId',
  checkPermission(ACTIONS.TEAM_VIEW, 'team', (req) => req.params.teamId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const group  = await prisma.groups.findFirst({
        where:   { id: req.params.groupId, team_id: req.params.teamId },
        include: {
          user_groups: {
            include: { users: { select: { id: true, display_name: true, username: true } } },
          },
          permissions: true,
        },
      });

      if (!group) return res.status(404).json({ error: 'Group not found' });
      res.json(group);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /teams/:teamId/groups/:groupId ──────────────────────────────────────
router.patch(
  '/:groupId',
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => req.params.teamId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const { all_members } = req.body;

      const group = await prisma.groups.updateMany({
        where: { id: req.params.groupId, team_id: req.params.teamId },
        data:  { all_members: Boolean(all_members) },
      });

      if (group.count === 0) return res.status(404).json({ error: 'Group not found' });
      res.json({ updated: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /teams/:teamId/groups/:groupId ─────────────────────────────────────
router.delete(
  '/:groupId',
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => req.params.teamId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');

      const deleted = await prisma.groups.deleteMany({
        where: { id: req.params.groupId, team_id: req.params.teamId },
      });

      if (deleted.count === 0) return res.status(404).json({ error: 'Group not found' });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /teams/:teamId/groups/:groupId/members ───────────────────────────────
// Add a user to a group.
router.post(
  '/:groupId/members',
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => req.params.teamId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const { user_id } = req.body;

      if (!user_id) return res.status(400).json({ error: 'user_id is required' });

      const isMember = await prisma.user_teams.findFirst({
        where: { user_id, team_id: req.params.teamId },
      });
      if (!isMember) {
        return res.status(400).json({ error: 'User is not a member of this team' });
      }

      const membership = await prisma.user_groups.create({
        data: { user_id, group_id: req.params.groupId },
      });

      res.status(201).json(membership);
    } catch (err) {
      if (err.code === 'P2002') {
        return res.status(409).json({ error: 'User is already in this group' });
      }
      next(err);
    }
  },
);

// ── DELETE /teams/:teamId/groups/:groupId/members/:userId ─────────────────────
// Remove a user from a group.
router.delete(
  '/:groupId/members/:userId',
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => req.params.teamId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');

      await prisma.user_groups.deleteMany({
        where: { user_id: req.params.userId, group_id: req.params.groupId },
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /teams/:teamId/groups/my-groups ───────────────────────────────────────
// Returns all group IDs the current user belongs to in this team.
router.get(
  '/my-groups',
  checkPermission(ACTIONS.TEAM_VIEW, 'team', (req) => req.params.teamId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const groupIds = await resolveUserGroups(prisma, req.user.id, req.params.teamId);
      res.json({ group_ids: groupIds });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;

import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { checkPermission } from '../middleware/checkPermission.js';
import { ACTIONS } from '../core/permissions/constants.js';
import { resolveUserGroups } from '../core/permissions/permissionService.js';

const router = Router({ mergeParams: true }); // expects :teamId from parent router

// ── GET /teams/:teamId/groups ─────────────────────────────────────────────────
router.get(
  '/',
  checkPermission(ACTIONS.TEAM_VIEW, 'team', (req) => (req.params.teamId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const groups = await prisma.group.findMany({
        where: { team_id: (req.params.teamId as string) },
        include: {
          user_groups: {
            include: { user: { select: { id: true, display_name: true, username: true } } },
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
router.post(
  '/',
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => (req.params.teamId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { all_members = false } = req.body ?? {};

      const group = await prisma.group.create({
        data: {
          team_id:     (req.params.teamId as string)!,
          all_members: Boolean(all_members),
        },
      });

      res.status(201).json(group);
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /teams/:teamId/groups/my-groups ───────────────────────────────────────
// Returns all group IDs the current user belongs to in this team.
// Registered before /:groupId so "my-groups" isn't captured as an id param.
router.get(
  '/my-groups',
  checkPermission(ACTIONS.TEAM_VIEW, 'team', (req) => (req.params.teamId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const groupIds = await resolveUserGroups(prisma, req.user!.id!, (req.params.teamId as string)!);
      res.json({ group_ids: groupIds });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /teams/:teamId/groups/:groupId ────────────────────────────────────────
router.get(
  '/:groupId',
  checkPermission(ACTIONS.TEAM_VIEW, 'team', (req) => (req.params.teamId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const group  = await prisma.group.findFirst({
        where:   { id: (req.params.groupId as string), team_id: (req.params.teamId as string) },
        include: {
          user_groups: {
            include: { user: { select: { id: true, display_name: true, username: true } } },
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
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => (req.params.teamId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { all_members } = req.body ?? {};

      const group = await prisma.group.updateMany({
        where: { id: (req.params.groupId as string), team_id: (req.params.teamId as string) },
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
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => (req.params.teamId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;

      const deleted = await prisma.group.deleteMany({
        where: { id: (req.params.groupId as string), team_id: (req.params.teamId as string) },
      });

      if (deleted.count === 0) return res.status(404).json({ error: 'Group not found' });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /teams/:teamId/groups/:groupId/members ───────────────────────────────
router.post(
  '/:groupId/members',
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => (req.params.teamId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { user_id } = req.body ?? {};

      if (!user_id) return res.status(400).json({ error: 'user_id is required' });

      const isMember = await prisma.userTeam.findFirst({
        where: { user_id, team_id: (req.params.teamId as string) },
      });
      if (!isMember) {
        return res.status(400).json({ error: 'User is not a member of this team' });
      }

      const membership = await prisma.userGroup.create({
        data: { user_id, group_id: (req.params.groupId as string)! },
      });

      res.status(201).json(membership);
    } catch (err: any) {
      if (err.code === 'P2002') {
        return res.status(409).json({ error: 'User is already in this group' });
      }
      next(err);
    }
  },
);

// ── DELETE /teams/:teamId/groups/:groupId/members/:userId ─────────────────────
router.delete(
  '/:groupId/members/:userId',
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => (req.params.teamId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;

      await prisma.userGroup.deleteMany({
        where: { user_id: (req.params.userId as string), group_id: (req.params.groupId as string) },
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export default router;

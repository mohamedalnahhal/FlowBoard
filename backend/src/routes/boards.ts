import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { checkPermission, checkAllPermissions } from '../middleware/checkPermission.js';
import { ACTIONS } from '../core/permissions/constants.js';

const router = Router({ mergeParams: true }); // parent mounts at /teams/:teamId/boards

export const TASK_CARD_SELECT = {
  id: true, name: true, status: true, position: true, start_date: true, end_date: true,
  checklist:    { select: { checklist_items: { select: { status: true } } } },
  task_members: { include: { user: { select: { id: true, display_name: true, username: true } } } },
  task_labels:  { include: { label: true } },
  creator:      { select: { id: true, display_name: true, username: true } },
} as const;

export const BOARD_DETAIL_INCLUDE = {
  team: {
    select: {
      id: true,
      name: true,
      user_teams: { include: { user: { select: { id: true, display_name: true, username: true } } } },
    },
  },
  labels: true,
  lists: {
    orderBy: { created_at: 'asc' },
    include: { tasks: { orderBy: { position: 'asc' }, select: TASK_CARD_SELECT } },
  },
} as const;

// ── GET /teams/:teamId/boards ──────────────────────────────────────────────────
router.get(
  '/',
  checkPermission(ACTIONS.TEAM_VIEW, 'team', (req) => (req.params.teamId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const boards = await prisma.board.findMany({
        where:   { team_id: (req.params.teamId as string) },
        include: { _count: { select: { lists: true } } },
        orderBy: { name: 'asc' },
      });
      res.json(boards);
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /teams/:teamId/boards ─────────────────────────────────────────────────
router.post(
  '/',
  checkPermission(ACTIONS.TEAM_MANAGE_MEMBERS, 'team', (req) => (req.params.teamId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { name, status = 'ACTIVE' } = req.body ?? {};
      if (!name) return res.status(400).json({ error: 'name is required' });

      const board = await prisma.board.create({
        data: { name, status, team_id: (req.params.teamId as string)! },
      });

      res.status(201).json(board);
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /teams/:teamId/boards/:boardId ────────────────────────────────────────
router.get(
  '/:boardId',
  checkPermission(ACTIONS.BOARD_VIEW, 'board', (req) => (req.params.boardId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const board  = await prisma.board.findFirst({
        where:   { id: (req.params.boardId as string), team_id: (req.params.teamId as string) },
        include: BOARD_DETAIL_INCLUDE,
      });
      if (!board) return res.status(404).json({ error: 'Board not found' });
      res.json(board);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /teams/:teamId/boards/:boardId ──────────────────────────────────────
router.patch(
  '/:boardId',
  checkPermission(ACTIONS.BOARD_EDIT, 'board', (req) => (req.params.boardId as string)),
  async (req, res, next) => {
    try {
      const prisma  = req.app.get('prisma') as PrismaClient;
      const { name, status } = req.body ?? {};

      const board = await prisma.board.updateMany({
        where: { id: (req.params.boardId as string), team_id: (req.params.teamId as string) },
        data:  { ...(name && { name }), ...(status && { status }) },
      });

      if (board.count === 0) return res.status(404).json({ error: 'Board not found' });
      res.json({ updated: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /teams/:teamId/boards/:boardId ─────────────────────────────────────
router.delete(
  '/:boardId',
  checkPermission(ACTIONS.BOARD_DELETE, 'board', (req) => (req.params.boardId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      await prisma.board.deleteMany({
        where: { id: (req.params.boardId as string), team_id: (req.params.teamId as string) },
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /teams/:teamId/boards/:boardId/lists ─────────────────────────────────
router.post(
  '/:boardId/lists',
  checkAllPermissions([
    [ACTIONS.BOARD_VIEW,         'board', (req) => (req.params.boardId as string)],
    [ACTIONS.BOARD_MANAGE_LISTS, 'board', (req) => (req.params.boardId as string)],
  ]),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { name } = req.body ?? {};
      if (!name) return res.status(400).json({ error: 'name is required' });

      const list = await prisma.list.create({
        data: { name, board_id: (req.params.boardId as string)! },
      });

      res.status(201).json(list);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /teams/:teamId/boards/:boardId/lists/:listId ────────────────────────
router.patch(
  '/:boardId/lists/:listId',
  checkAllPermissions([
    [ACTIONS.BOARD_VIEW,         'board', (req) => (req.params.boardId as string)],
    [ACTIONS.BOARD_MANAGE_LISTS, 'board', (req) => (req.params.boardId as string)],
  ]),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { name } = req.body ?? {};

      const list = await prisma.list.updateMany({
        where: { id: (req.params.listId as string), board_id: (req.params.boardId as string) },
        data:  { ...(name && { name }) },
      });

      if (list.count === 0) return res.status(404).json({ error: 'List not found' });
      res.json({ updated: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /teams/:teamId/boards/:boardId/lists/:listId ───────────────────────
router.delete(
  '/:boardId/lists/:listId',
  checkAllPermissions([
    [ACTIONS.BOARD_VIEW,         'board', (req) => (req.params.boardId as string)],
    [ACTIONS.BOARD_MANAGE_LISTS, 'board', (req) => (req.params.boardId as string)],
  ]),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      await prisma.list.deleteMany({ where: { id: (req.params.listId as string), board_id: (req.params.boardId as string) } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /teams/:teamId/boards/:boardId/labels ─────────────────────────────────
router.post(
  '/:boardId/labels',
  checkAllPermissions([
    [ACTIONS.BOARD_VIEW,          'board', (req) => (req.params.boardId as string)],
    [ACTIONS.BOARD_MANAGE_LABELS, 'board', (req) => (req.params.boardId as string)],
  ]),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { name, color } = req.body ?? {};
      if (!name || !color) return res.status(400).json({ error: 'name and color are required' });

      const label = await prisma.label.create({
        data: { name, color, board_id: (req.params.boardId as string)! },
      });

      res.status(201).json(label);
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /teams/:teamId/boards/:boardId/labels/:labelId ─────────────────────
router.delete(
  '/:boardId/labels/:labelId',
  checkAllPermissions([
    [ACTIONS.BOARD_VIEW,          'board', (req) => (req.params.boardId as string)],
    [ACTIONS.BOARD_MANAGE_LABELS, 'board', (req) => (req.params.boardId as string)],
  ]),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      await prisma.label.deleteMany({ where: { id: (req.params.labelId as string), board_id: (req.params.boardId as string) } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /teams/:teamId/boards/:boardId/lists/:listId/tasks ───────────────────
router.post(
  '/:boardId/lists/:listId/tasks',
  checkAllPermissions([
    [ACTIONS.BOARD_VIEW,  'board', (req) => (req.params.boardId as string)],
    [ACTIONS.TASK_CREATE, 'board', (req) => (req.params.boardId as string)],
  ]),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { name, description = '', start_date, end_date } = req.body ?? {};
      if (!name) return res.status(400).json({ error: 'name is required' });

      const lastTask = await prisma.task.findFirst({
        where:   { list_id: (req.params.listId as string) },
        orderBy: { position: 'desc' },
        select:  { position: true },
      });

      const task = await prisma.task.create({
        data: {
          name,
          description,
          list_id:    (req.params.listId as string)!,
          created_by: req.user!.id!,
          status:     'TODO',
          position:   (lastTask?.position ?? 0) + 1,
          ...(start_date && { start_date: new Date(start_date) }),
          ...(end_date   && { end_date: new Date(end_date) }),
        },
      });

      res.status(201).json(task);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /teams/:teamId/boards/:boardId/tasks/:taskId/move ──────────────────
// Separate endpoint for drag-drop moves; requires task:move (not task:edit)
router.patch(
  '/:boardId/tasks/:taskId/move',
  checkPermission(ACTIONS.TASK_MOVE, 'task', (req) => (req.params.taskId as string), { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { list_id, position } = req.body ?? {};
      if (!list_id) return res.status(400).json({ error: 'list_id is required' });
      if (position !== undefined && !Number.isInteger(position)) {
        return res.status(400).json({ error: 'position must be an integer' });
      }

      // The target list must belong to the board in the URL — otherwise a task
      // could be moved into a board the permission check never covered.
      const targetList = await prisma.list.findFirst({
        where:  { id: list_id, board_id: (req.params.boardId as string) },
        select: { id: true, name: true },
      });
      if (!targetList) {
        return res.status(400).json({ error: 'Target list does not belong to this board' });
      }

      // Capture the originating list so we can record the move in activity.
      const current = await prisma.task.findUnique({
        where:  { id: (req.params.taskId as string) },
        select: { list_id: true, list: { select: { name: true } } },
      });
      if (!current) return res.status(404).json({ error: 'Task not found' });

      const movedLists = current.list_id !== list_id;

      await prisma.task.update({
        where: { id: (req.params.taskId as string) },
        data:  {
          list_id,
          ...(position !== undefined && { position }),
        },
      });

      // Only a list-to-list move is an activity event; reordering within a
      // list is not.
      if (movedLists) {
        await prisma.taskHistory.create({
          data: {
            task_id:  (req.params.taskId as string)!,
            user_id:  req.user!.id!,
            type:     'task_moved',
            activity: { from: current.list.name, to: targetList.name },
          },
        });
      }

      res.json({ updated: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /teams/:teamId/boards/:boardId/tasks/:taskId ────────────────────────
router.patch(
  '/:boardId/tasks/:taskId',
  checkPermission(ACTIONS.TASK_EDIT, 'task', (req) => (req.params.taskId as string), { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { name, description, status, start_date, end_date } = req.body ?? {};

      const task = await prisma.task.updateMany({
        where: { id: (req.params.taskId as string) },
        data:  {
          ...(name        !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(status      !== undefined && { status }),
          ...(start_date  !== undefined && { start_date: start_date ? new Date(start_date) : null }),
          ...(end_date    !== undefined && { end_date: end_date ? new Date(end_date) : null }),
        },
      });

      if (task.count === 0) return res.status(404).json({ error: 'Task not found' });
      res.json({ updated: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /teams/:teamId/boards/:boardId/tasks/:taskId ───────────────────────
router.delete(
  '/:boardId/tasks/:taskId',
  checkPermission(ACTIONS.TASK_DELETE, 'task', (req) => (req.params.taskId as string), { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      await prisma.task.deleteMany({ where: { id: (req.params.taskId as string) } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /teams/:teamId/boards/:boardId/tasks/:taskId/members ─────────────────
router.post(
  '/:boardId/tasks/:taskId/members',
  checkPermission(ACTIONS.TASK_ASSIGN_OTHERS, 'task', (req) => (req.params.taskId as string), { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { user_id, role } = req.body ?? {};
      if (!user_id) return res.status(400).json({ error: 'user_id is required' });

      const member = await prisma.taskMember.upsert({
        where:  { user_id_task_id: { user_id, task_id: (req.params.taskId as string)! } },
        update: { role },
        create: { user_id, task_id: (req.params.taskId as string)!, role },
      });

      res.status(201).json(member);
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /teams/:teamId/boards/:boardId/tasks/:taskId/members/:userId ───────
router.delete(
  '/:boardId/tasks/:taskId/members/:userId',
  checkPermission(ACTIONS.TASK_ASSIGN_OTHERS, 'task', (req) => (req.params.taskId as string), { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      await prisma.taskMember.deleteMany({
        where: { user_id: (req.params.userId as string), task_id: (req.params.taskId as string) },
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /teams/:teamId/boards/:boardId/tasks/:taskId/labels ──────────────────
router.post(
  '/:boardId/tasks/:taskId/labels',
  checkPermission(ACTIONS.LABEL_APPLY, 'task', (req) => (req.params.taskId as string), { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { label_id } = req.body ?? {};
      if (!label_id) return res.status(400).json({ error: 'label_id is required' });

      const taskLabel = await prisma.taskLabel.upsert({
        where:  { task_id_label_id: { task_id: (req.params.taskId as string)!, label_id } },
        update: {},
        create: { task_id: (req.params.taskId as string)!, label_id },
      });

      res.status(201).json(taskLabel);
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /teams/:teamId/boards/:boardId/tasks/:taskId/labels/:labelId ───────
router.delete(
  '/:boardId/tasks/:taskId/labels/:labelId',
  checkPermission(ACTIONS.LABEL_APPLY, 'task', (req) => (req.params.taskId as string), { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      await prisma.taskLabel.deleteMany({
        where: { task_id: (req.params.taskId as string), label_id: (req.params.labelId as string) },
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export default router;

/**
 * Example: boards router
 * Demonstrates real-world usage of checkPermission middleware.
 * This is NOT a full boards implementation — it shows how to wire permissions
 * onto an existing resource router.
 */

const { Router } = require('express');
const {
  checkPermission,
  checkAllPermissions,
} = require('../middleware/checkPermission');
const { ACTIONS } = require('../core/permissions/constants');

const router = Router({ mergeParams: true }); // parent mounts at /teams/:teamId/boards

// ── GET /teams/:teamId/boards/:boardId ────────────────────────────────────────
router.get(
  '/:boardId',
  checkPermission(ACTIONS.BOARD_VIEW, 'board', (req) => req.params.boardId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const board  = await prisma.boards.findFirst({
        where:   { id: req.params.boardId, team_id: req.params.teamId },
        include: { lists: { include: { tasks: true } }, labels: true },
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
  checkPermission(ACTIONS.BOARD_EDIT, 'board', (req) => req.params.boardId),
  async (req, res, next) => {
    try {
      const prisma  = req.app.get('prisma');
      const { name, status } = req.body;

      const board = await prisma.boards.updateMany({
        where: { id: req.params.boardId, team_id: req.params.teamId },
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
  checkPermission(ACTIONS.BOARD_DELETE, 'board', (req) => req.params.boardId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      await prisma.boards.deleteMany({
        where: { id: req.params.boardId, team_id: req.params.teamId },
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /teams/:teamId/boards/:boardId/lists ─────────────────────────────────
// Requires BOTH board:view AND board:manage_lists
router.post(
  '/:boardId/lists',
  checkAllPermissions([
    [ACTIONS.BOARD_VIEW,         'board', (req) => req.params.boardId],
    [ACTIONS.BOARD_MANAGE_LISTS, 'board', (req) => req.params.boardId],
  ]),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const { name } = req.body;

      if (!name) return res.status(400).json({ error: 'name is required' });

      const list = await prisma.lists.create({
        data: { name, board_id: req.params.boardId },
      });

      res.status(201).json(list);
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /teams/:teamId/boards/:boardId/labels ────────────────────────────────
router.post(
  '/:boardId/labels',
  checkAllPermissions([
    [ACTIONS.BOARD_VIEW,          'board', (req) => req.params.boardId],
    [ACTIONS.BOARD_MANAGE_LABELS, 'board', (req) => req.params.boardId],
  ]),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const { name, color } = req.body;

      const label = await prisma.labels.create({
        data: { name, color, board_id: req.params.boardId },
      });

      res.status(201).json(label);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /teams/:teamId/boards/:boardId/tasks/:taskId ────────────────────────
// task:edit — also demonstrates inherit:true which walks task → list → board → team
router.patch(
  '/:boardId/tasks/:taskId',
  checkPermission(
    ACTIONS.TASK_EDIT,
    'task',
    (req) => req.params.taskId,
    { inherit: true },
  ),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const { name, description, status, start_date, end_date } = req.body;

      const task = await prisma.tasks.updateMany({
        where: { id: req.params.taskId },
        data:  {
          ...(name        && { name }),
          ...(description && { description }),
          ...(status      && { status }),
          ...(start_date  && { start_date }),
          ...(end_date    && { end_date }),
        },
      });

      if (task.count === 0) return res.status(404).json({ error: 'Task not found' });
      res.json({ updated: true });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;

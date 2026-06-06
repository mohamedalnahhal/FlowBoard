const { Router }                              = require('express');
const { checkPermission, checkAllPermissions } = require('../middleware/checkPermission');
const { ACTIONS }                             = require('../core/permissions/constants');

// Mounted at /teams/:teamId/boards/:boardId/lists
const router = Router({ mergeParams: true });

// ── GET /…/boards/:boardId/lists ───────────────────────────────────────────────
router.get(
  '/',
  checkPermission(ACTIONS.BOARD_VIEW, 'board', (req) => req.params.boardId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');

      const lists = await prisma.list.findMany({
        where:   { board_id: req.params.boardId },
        include: { tasks: { orderBy: { position: 'asc' } } },
        orderBy: { created_at: 'asc' },
      });

      res.json(lists);
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /…/boards/:boardId/lists ──────────────────────────────────────────────
router.post(
  '/',
  checkPermission(ACTIONS.LIST_CREATE, 'board', (req) => req.params.boardId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const { name } = req.body;

      if (!name) return res.status(400).json({ error: 'name is required' });

      const boardExists = await prisma.board.findFirst({
        where: { id: req.params.boardId, team_id: req.params.teamId },
      });
      if (!boardExists) return res.status(404).json({ error: 'Board not found' });

      const list = await prisma.list.create({
        data: { name, board_id: req.params.boardId },
      });

      res.status(201).json(list);
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /…/boards/:boardId/lists/:listId ───────────────────────────────────────
router.get(
  '/:listId',
  checkPermission(ACTIONS.BOARD_VIEW, 'board', (req) => req.params.boardId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');

      const list = await prisma.list.findFirst({
        where:   { id: req.params.listId, board_id: req.params.boardId },
        include: { tasks: { orderBy: { position: 'asc' } } },
      });

      if (!list) return res.status(404).json({ error: 'List not found' });
      res.json(list);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /…/boards/:boardId/lists/:listId ─────────────────────────────────────
router.patch(
  '/:listId',
  checkPermission(ACTIONS.LIST_UPDATE, 'list', (req) => req.params.listId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const { name } = req.body;

      if (!name) return res.status(400).json({ error: 'name is required' });

      const result = await prisma.list.updateMany({
        where: { id: req.params.listId, board_id: req.params.boardId },
        data:  { name },
      });

      if (result.count === 0) return res.status(404).json({ error: 'List not found' });
      res.json({ updated: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /…/boards/:boardId/lists/:listId ────────────────────────────────────
// Requires both board:view (can see it) and list:delete (can remove it)
router.delete(
  '/:listId',
  checkAllPermissions([
    [ACTIONS.BOARD_VIEW,  'board', (req) => req.params.boardId],
    [ACTIONS.LIST_DELETE, 'list',  (req) => req.params.listId],
  ]),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');

      const result = await prisma.list.deleteMany({
        where: { id: req.params.listId, board_id: req.params.boardId },
      });

      if (result.count === 0) return res.status(404).json({ error: 'List not found' });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;

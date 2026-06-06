const { Router }         = require('express');
const { checkPermission } = require('../middleware/checkPermission');
const { ACTIONS }         = require('../core/permissions/constants');

// Mounted at /teams/:teamId/boards
const router = Router({ mergeParams: true });

// ── GET /teams/:teamId/boards ──────────────────────────────────────────────────
// List all boards in a team visible to the user.
router.get('/', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');

    const boards = await prisma.board.findMany({
      where:   { team_id: req.params.teamId },
      include: { lists: { select: { id: true, name: true } }, labels: true },
      orderBy: { created_at: 'asc' },
    });

    res.json(boards);
  } catch (err) {
    next(err);
  }
});

// ── POST /teams/:teamId/boards ─────────────────────────────────────────────────
// Create a new board in the team.
router.post('/', async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const { name, status = 'ACTIVE' } = req.body;

    if (!name) return res.status(400).json({ error: 'name is required' });

    const VALID_STATUSES = ['ACTIVE', 'ARCHIVED', 'CLOSED'];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const isMember = await prisma.userTeam.findUnique({
      where: { user_id_team_id: { user_id: req.user.id, team_id: req.params.teamId } },
    });
    if (!isMember) return res.status(403).json({ error: 'Not a member of this team' });

    const board = await prisma.board.create({
      data: { name, team_id: req.params.teamId, status },
    });

    res.status(201).json(board);
  } catch (err) {
    next(err);
  }
});

// ── GET /teams/:teamId/boards/:boardId ─────────────────────────────────────────
router.get(
  '/:boardId',
  checkPermission(ACTIONS.BOARD_VIEW, 'board', (req) => req.params.boardId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');

      const board = await prisma.board.findFirst({
        where:   { id: req.params.boardId, team_id: req.params.teamId },
        include: {
          lists: {
            include: { tasks: { orderBy: { position: 'asc' } } },
            orderBy: { created_at: 'asc' },
          },
          labels:     true,
          checklists: { include: { checklist_items: true } },
        },
      });

      if (!board) return res.status(404).json({ error: 'Board not found' });
      res.json(board);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /teams/:teamId/boards/:boardId ───────────────────────────────────────
router.patch(
  '/:boardId',
  checkPermission(ACTIONS.BOARD_UPDATE, 'board', (req) => req.params.boardId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const { name, status } = req.body;

      if (!name && !status) {
        return res.status(400).json({ error: 'Provide at least one of: name, status' });
      }

      const VALID_STATUSES = ['ACTIVE', 'ARCHIVED', 'CLOSED'];
      if (status && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
      }

      const result = await prisma.board.updateMany({
        where: { id: req.params.boardId, team_id: req.params.teamId },
        data:  {
          ...(name   && { name }),
          ...(status && { status }),
        },
      });

      if (result.count === 0) return res.status(404).json({ error: 'Board not found' });
      res.json({ updated: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /teams/:teamId/boards/:boardId ──────────────────────────────────────
router.delete(
  '/:boardId',
  checkPermission(ACTIONS.BOARD_DELETE, 'board', (req) => req.params.boardId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');

      const result = await prisma.board.deleteMany({
        where: { id: req.params.boardId, team_id: req.params.teamId },
      });

      if (result.count === 0) return res.status(404).json({ error: 'Board not found' });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /teams/:teamId/boards/:boardId/labels ──────────────────────────────────
router.get(
  '/:boardId/labels',
  checkPermission(ACTIONS.BOARD_VIEW, 'board', (req) => req.params.boardId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const labels = await prisma.label.findMany({
        where:   { board_id: req.params.boardId },
        orderBy: { name: 'asc' },
      });
      res.json(labels);
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /teams/:teamId/boards/:boardId/labels ─────────────────────────────────
router.post(
  '/:boardId/labels',
  checkPermission(ACTIONS.LABEL_DEFINE, 'board', (req) => req.params.boardId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const { name, color } = req.body;

      if (!name || !color) return res.status(400).json({ error: 'name and color are required' });

      const label = await prisma.label.create({
        data: { name, color, board_id: req.params.boardId },
      });

      res.status(201).json(label);
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /teams/:teamId/boards/:boardId/labels/:labelId ──────────────────────
router.delete(
  '/:boardId/labels/:labelId',
  checkPermission(ACTIONS.LABEL_DEFINE, 'board', (req) => req.params.boardId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');

      const result = await prisma.label.deleteMany({
        where: { id: req.params.labelId, board_id: req.params.boardId },
      });

      if (result.count === 0) return res.status(404).json({ error: 'Label not found' });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;

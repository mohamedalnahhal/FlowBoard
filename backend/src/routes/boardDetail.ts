import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { checkPermission } from '../middleware/checkPermission.js';
import { ACTIONS } from '../core/permissions/constants.js';
import { BOARD_DETAIL_INCLUDE } from './boards.js';

// Flat lookup mounted at /boards — lets the frontend resolve a board (and its
// team) from the board id alone, without needing the team id in the URL.
const router = Router();

// ── GET /boards — list all boards accessible to the current user ──────────────
router.get('/', async (req, res, next) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthenticated' });
    const prisma = req.app.get('prisma') as PrismaClient;
    const userId = req.user.id;

    const memberships = await prisma.userTeam.findMany({
      where:   { user_id: userId },
      include: {
        team: {
          select: {
            id:    true,
            name:  true,
            boards: {
              select:  { id: true, name: true, status: true },
              orderBy: { name: 'asc' },
            },
          },
        },
      },
    });

    const seen = new Set<string>();
    const boards: { id: string; name: string; status: string; team: { id: string; name: string } }[] = [];

    for (const m of memberships) {
      for (const b of m.team.boards) {
        if (!seen.has(b.id)) {
          seen.add(b.id);
          boards.push({ ...b, team: { id: m.team.id, name: m.team.name } });
        }
      }
    }

    res.json(boards);
  } catch (err) {
    next(err);
  }
});

router.get(
  '/:boardId',
  checkPermission(ACTIONS.BOARD_VIEW, 'board', (req) => (req.params.boardId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const board  = await prisma.board.findUnique({
        where:   { id: (req.params.boardId as string) },
        include: BOARD_DETAIL_INCLUDE,
      });
      if (!board) return res.status(404).json({ error: 'Board not found' });
      res.json(board);
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /boards/:boardId ────────────────────────────────────────────────────
router.delete(
  '/:boardId',
  checkPermission(ACTIONS.BOARD_DELETE, 'board', (req) => (req.params.boardId as string)),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const deleted = await prisma.board.deleteMany({
        where: { id: (req.params.boardId as string) },
      });
      if (deleted.count === 0) return res.status(404).json({ error: 'Board not found' });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export default router;

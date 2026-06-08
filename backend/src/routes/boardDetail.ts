import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { checkPermission } from '../middleware/checkPermission.js';
import { ACTIONS } from '../core/permissions/constants.js';
import { BOARD_DETAIL_INCLUDE } from './boards.js';

// Flat lookup mounted at /boards — lets the frontend resolve a board (and its
// team) from the board id alone, without needing the team id in the URL.
const router = Router();

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

export default router;

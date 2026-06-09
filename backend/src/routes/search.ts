import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';

const router = Router();

// GET /search?q=<term>  Returns boards and tasks matching the query.
// Only returns items the user can reach via team membership.
router.get('/', async (req, res, next) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthenticated' });
    const prisma = req.app.get('prisma') as PrismaClient;
    const q = (req.query.q as string | undefined)?.trim();
    if (!q || q.length < 2) return res.json({ boards: [], tasks: [] });

    // Get team IDs the user belongs to
    const memberships = await prisma.userTeam.findMany({
      where:  { user_id: req.user.id },
      select: { team_id: true },
    });
    const teamIds = memberships.map((m) => m.team_id);
    if (!teamIds.length) return res.json({ boards: [], tasks: [] });

    const search = { contains: q, mode: 'insensitive' as const };

    const [boards, tasks] = await Promise.all([
      prisma.board.findMany({
        where:   { team_id: { in: teamIds }, name: search },
        select:  { id: true, name: true, status: true, team: { select: { id: true, name: true } } },
        take: 10,
      }),
      prisma.task.findMany({
        where:   { name: search, list: { board: { team_id: { in: teamIds } } } },
        select:  {
          id: true, name: true, status: true,
          list: { select: { board: { select: { id: true, name: true, team: { select: { id: true, name: true } } } } } },
        },
        take: 10,
      }),
    ]);

    res.json({ boards, tasks });
  } catch (err) {
    next(err);
  }
});

export default router;

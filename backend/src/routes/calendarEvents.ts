import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { checkPermission } from '../middleware/checkPermission.js';
import { ACTIONS, ROLES } from '../core/permissions/constants.js';
import { requireAuth, getUserRole, isSystemAdmin, isWorkspaceAdmin, isWorkspaceMember } from '../lib/auth.js';

const router = Router({ mergeParams: true }); // expects :teamId from parent router

const HEX_COLOR_RE = /^#([0-9A-Fa-f]{6})$/;

/** True if the user may create/edit/delete calendar events for this team. */
async function canManageCalendarEvents(
  prisma: PrismaClient,
  userId: string,
  teamId: string,
): Promise<boolean> {
  const globalRole = await getUserRole(prisma, userId);
  if (isSystemAdmin(globalRole)) return true;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { workspace_id: true },
  });
  if (!team) return false;

  if (isWorkspaceAdmin(globalRole) && (await isWorkspaceMember(prisma, userId, team.workspace_id))) {
    return true;
  }

  const membership = await prisma.userTeam.findUnique({
    where: { user_id_team_id: { user_id: userId, team_id: teamId } },
    select: { role: true },
  });
  return membership?.role === ROLES.TEAM.LEAD;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ── GET /teams/:teamId/calendar-events ────────────────────────────────────────
router.get(
  '/',
  checkPermission(ACTIONS.TEAM_VIEW, 'team', (req) => ((req.params as Record<string, string>).teamId ?? '')),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { from, to } = req.query as Record<string, string | undefined>;
      const teamId = (req.params as Record<string, string>).teamId ?? '';

      const events = await prisma.calendarEvent.findMany({
        where: {
          team_id: teamId,
          ...(from && { ends_at:   { gte: new Date(from) } }),
          ...(to   && { starts_at: { lte: new Date(to) } }),
        },
        orderBy: { starts_at: 'asc' },
      });

      res.json(events);
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /teams/:teamId/calendar-events/task-deadlines ─────────────────────────
// Returns tasks in this team's boards that have an end_date within the range.
router.get(
  '/task-deadlines',
  checkPermission(ACTIONS.TEAM_VIEW, 'team', (req) => ((req.params as Record<string, string>).teamId ?? '')),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const teamId = (req.params as Record<string, string>).teamId ?? '';
      const { from, to } = req.query as Record<string, string | undefined>;

      const fromDate = from ? new Date(from) : undefined;
      const toDate = to ? new Date(to) : undefined;
      if (from && Number.isNaN(fromDate?.getTime() ?? 0)) {
        return res.status(400).json({ error: 'from must be a valid date' });
      }
      if (to && Number.isNaN(toDate?.getTime() ?? 0)) {
        return res.status(400).json({ error: 'to must be a valid date' });
      }

      const tasks = await prisma.task.findMany({
        where: {
          archived: false,
          end_date: { not: null },
          list: { board: { team_id: teamId } },
          ...(fromDate && { end_date: { gte: fromDate } }),
          ...(toDate && { end_date: { lte: toDate } }),
        },
        select: {
          id: true,
          name: true,
          end_date: true,
          status: true,
          list: { select: { board: { select: { id: true, name: true } } } },
        },
        orderBy: { end_date: 'asc' },
      });

      res.json(
        tasks.map((t) => ({
          id: t.id,
          name: t.name,
          end_date: t.end_date,
          status: t.status,
          board: t.list.board,
        })),
      );
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /teams/:teamId/calendar-events ───────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const teamId = (req.params as Record<string, string>).teamId ?? '';

    if (!(await canManageCalendarEvents(prisma, userId, teamId))) {
      return res.status(403).json({ error: 'You do not have permission to manage calendar events' });
    }

    const { title, description, starts_at, ends_at, color, all_day } = req.body ?? {};

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'title is required' });
    }

    const startDate = parseDate(starts_at);
    const endDate = parseDate(ends_at);
    if (!startDate) return res.status(400).json({ error: 'starts_at must be a valid date' });
    if (!endDate) return res.status(400).json({ error: 'ends_at must be a valid date' });
    if (endDate.getTime() < startDate.getTime()) {
      return res.status(400).json({ error: 'ends_at must be after or equal to starts_at' });
    }

    let eventColor: string | undefined;
    if (color !== undefined) {
      if (typeof color !== 'string' || !HEX_COLOR_RE.test(color)) {
        return res.status(400).json({ error: 'color must be a hex string like #4648d4' });
      }
      eventColor = color;
    }

    const event = await prisma.calendarEvent.create({
      data: {
        team_id:     teamId,
        title:       title.trim(),
        description: typeof description === 'string' ? description : '',
        starts_at:   startDate,
        ends_at:     endDate,
        all_day:     typeof all_day === 'boolean' ? all_day : false,
        ...(eventColor && { color: eventColor }),
        created_by:  userId,
      },
    });

    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /teams/:teamId/calendar-events/:eventId ─────────────────────────────
router.patch('/:eventId', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const teamId = (req.params as Record<string, string>).teamId ?? '';
    const eventId = (req.params as Record<string, string>).eventId ?? '';

    if (!(await canManageCalendarEvents(prisma, userId, teamId))) {
      return res.status(403).json({ error: 'You do not have permission to manage calendar events' });
    }

    const existing = await prisma.calendarEvent.findFirst({
      where: { id: eventId, team_id: teamId },
    });
    if (!existing) return res.status(404).json({ error: 'Event not found' });

    const { title, description, starts_at, ends_at, color, all_day } = req.body ?? {};
    const data: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ error: 'title must be a non-empty string' });
      }
      data.title = title.trim();
    }
    if (description !== undefined) data.description = String(description);
    if (all_day !== undefined) data.all_day = Boolean(all_day);

    const startDate = starts_at !== undefined ? parseDate(starts_at) : undefined;
    const endDate = ends_at !== undefined ? parseDate(ends_at) : undefined;
    if (starts_at !== undefined && startDate === null) {
      return res.status(400).json({ error: 'starts_at must be a valid date' });
    }
    if (ends_at !== undefined && endDate === null) {
      return res.status(400).json({ error: 'ends_at must be a valid date' });
    }

    const finalStart = startDate ?? existing.starts_at;
    const finalEnd = endDate ?? existing.ends_at;
    if (finalEnd.getTime() < finalStart.getTime()) {
      return res.status(400).json({ error: 'ends_at must be after or equal to starts_at' });
    }
    if (startDate) data.starts_at = startDate;
    if (endDate) data.ends_at = endDate;

    if (color !== undefined) {
      if (typeof color !== 'string' || !HEX_COLOR_RE.test(color)) {
        return res.status(400).json({ error: 'color must be a hex string like #4648d4' });
      }
      data.color = color;
    }

    const updated = await prisma.calendarEvent.updateMany({
      where: { id: eventId, team_id: teamId },
      data,
    });

    if (updated.count === 0) return res.status(404).json({ error: 'Event not found' });
    res.json({ updated: true });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /teams/:teamId/calendar-events/:eventId ────────────────────────────
router.delete('/:eventId', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const teamId = (req.params as Record<string, string>).teamId ?? '';
    const eventId = (req.params as Record<string, string>).eventId ?? '';

    if (!(await canManageCalendarEvents(prisma, userId, teamId))) {
      return res.status(403).json({ error: 'You do not have permission to manage calendar events' });
    }

    const deleted = await prisma.calendarEvent.deleteMany({
      where: { id: eventId, team_id: teamId },
    });

    if (deleted.count === 0) return res.status(404).json({ error: 'Event not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;

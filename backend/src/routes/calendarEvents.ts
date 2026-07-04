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

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

function addWeeks(d: Date, weeks: number): Date {
  return addDays(d, weeks * 7);
}

function addMonths(d: Date, months: number): Date {
  const result = new Date(d);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addYears(d: Date, years: number): Date {
  const result = new Date(d);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

type RecurrenceEnd =
  | { type: 'never' }
  | { type: 'count'; count: number }
  | { type: 'until'; until: string };

type RecurrenceRule = {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  end: RecurrenceEnd;
};

function isValidRecurrenceRule(value: unknown): value is RecurrenceRule {
  if (typeof value !== 'object' || value === null) return false;
  const rule = value as Record<string, unknown>;
  if (!['daily', 'weekly', 'monthly', 'yearly'].includes(rule.frequency as string)) return false;
  if (typeof rule.interval !== 'number' || !Number.isInteger(rule.interval) || rule.interval < 1) return false;
  if (typeof rule.end !== 'object' || rule.end === null) return false;
  const end = rule.end as Record<string, unknown>;
  if (end.type === 'count') {
    if (typeof end.count !== 'number' || !Number.isInteger(end.count) || end.count < 1) return false;
  } else if (end.type === 'until') {
    if (typeof end.until !== 'string' || parseDate(end.until) === null) return false;
  } else if (end.type !== 'never') {
    return false;
  }
  return true;
}

function nextOccurrence(start: Date, frequency: RecurrenceRule['frequency'], interval: number): Date {
  switch (frequency) {
    case 'daily':
      return addDays(start, interval);
    case 'weekly':
      return addWeeks(start, interval);
    case 'monthly':
      return addMonths(start, interval);
    case 'yearly':
      return addYears(start, interval);
  }
}

function expandEvent(
  event: {
    id: string;
    team_id: string;
    title: string;
    description: string;
    starts_at: Date;
    ends_at: Date;
    all_day: boolean;
    color: string;
    recurrence_rule: RecurrenceRule | null;
    created_by: string | null;
    created_at: Date;
    updated_at: Date;
    exceptions: { exception_date: Date; deleted: boolean; override_event_id: string | null }[];
  },
  rangeStart: Date,
  rangeEnd: Date,
): Array<Record<string, unknown>> {
  const durationMs = event.ends_at.getTime() - event.starts_at.getTime();
  const exceptionsByDate = new Map(
    event.exceptions.map((ex) => [toDateKey(ex.exception_date), ex]),
  );

  const results: Array<Record<string, unknown>> = [];
  let occurrenceStart = new Date(event.starts_at);
  let occurrenceEnd = new Date(event.ends_at);
  let count = 0;

  while (occurrenceStart <= rangeEnd) {
    if (occurrenceEnd >= rangeStart) {
      const key = toDateKey(occurrenceStart);
      const exception = exceptionsByDate.get(key);

      if (exception?.deleted) {
        // skip
      } else if (exception?.override_event_id) {
        // overridden occurrence is returned by the caller's join; skip generated version
      } else {
        results.push({
          ...event,
          id: `${event.id}:${key}`,
          parent_event_id: event.id,
          is_recurring: true,
          starts_at: occurrenceStart.toISOString(),
          ends_at: occurrenceEnd.toISOString(),
          recurrence_rule: undefined,
          exceptions: undefined,
        });
      }
    }

    count += 1;
    if (event.recurrence_rule) {
      if (event.recurrence_rule.end.type === 'count' && count >= event.recurrence_rule.end.count) break;
      if (event.recurrence_rule.end.type === 'until') {
        const until = new Date(event.recurrence_rule.end.until);
        if (occurrenceStart >= until) break;
      }
      occurrenceStart = nextOccurrence(occurrenceStart, event.recurrence_rule.frequency, event.recurrence_rule.interval);
      occurrenceEnd = new Date(occurrenceStart.getTime() + durationMs);
    } else {
      break;
    }
  }

  return results;
}

function serializeEvent(event: {
  id: string;
  team_id: string;
  title: string;
  description: string;
  starts_at: Date;
  ends_at: Date;
  all_day: boolean;
  color: string;
  recurrence_rule: RecurrenceRule | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}): Record<string, unknown> {
  return {
    ...event,
    starts_at: event.starts_at.toISOString(),
    ends_at: event.ends_at.toISOString(),
    parent_event_id: null,
    is_recurring: !!event.recurrence_rule,
  };
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

      const rangeStart = from ? parseDate(from) : new Date('1970-01-01');
      const rangeEnd = to ? parseDate(to) : new Date('2100-01-01');
      if (!rangeStart || !rangeEnd) {
        return res.status(400).json({ error: 'from and to must be valid dates' });
      }

      const events = await prisma.calendarEvent.findMany({
        where: {
          team_id: teamId,
          ...(from && { ends_at: { gte: rangeStart } }),
          ...(to && { starts_at: { lte: rangeEnd } }),
        },
        include: { exceptions: { select: { exception_date: true, deleted: true, override_event_id: true } } },
        orderBy: { starts_at: 'asc' },
      });

      const expanded: Array<Record<string, unknown>> = [];
      for (const event of events) {
        if (event.recurrence_rule) {
          expanded.push(...expandEvent(event as unknown as Parameters<typeof expandEvent>[0], rangeStart, rangeEnd));
        } else {
          expanded.push(serializeEvent(event as unknown as Parameters<typeof serializeEvent>[0]));
        }
      }

      // Fetch override events for any exceptions in the range.
      const overrideIds = events
        .flatMap((e) => e.exceptions)
        .map((ex) => ex.override_event_id)
        .filter((id): id is string => id !== null);

      if (overrideIds.length > 0) {
        const overrides = await prisma.calendarEvent.findMany({
          where: { id: { in: overrideIds }, team_id: teamId },
        });
        const overridesById = new Map(overrides.map((o) => [o.id, o]));

        for (const event of events) {
          if (!event.recurrence_rule) continue;
          for (const ex of event.exceptions) {
            if (!ex.override_event_id || ex.deleted) continue;
            const override = overridesById.get(ex.override_event_id);
            if (!override) continue;
            const exDate = new Date(ex.exception_date);
            if (exDate >= rangeStart && exDate <= rangeEnd) {
              expanded.push({
                ...serializeEvent(override as unknown as Parameters<typeof serializeEvent>[0]),
                id: `${event.id}:${toDateKey(exDate)}`,
                parent_event_id: event.id,
                is_recurring: true,
                exception_date: exDate.toISOString(),
              });
            }
          }
        }
      }

      expanded.sort((a, b) => new Date(a.starts_at as string).getTime() - new Date(b.starts_at as string).getTime());
      res.json(expanded);
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

    const { title, description, starts_at, ends_at, color, all_day, recurrence_rule } = req.body ?? {};

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

    if (recurrence_rule !== undefined && !isValidRecurrenceRule(recurrence_rule)) {
      return res.status(400).json({ error: 'recurrence_rule is invalid' });
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
        team_id: teamId,
        title: title.trim(),
        description: typeof description === 'string' ? description : '',
        starts_at: startDate,
        ends_at: endDate,
        all_day: typeof all_day === 'boolean' ? all_day : false,
        ...(eventColor && { color: eventColor }),
        ...(recurrence_rule && { recurrence_rule: recurrence_rule as RecurrenceRule }),
        created_by: userId,
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

    const { title, description, starts_at, ends_at, color, all_day, recurrence_rule } = req.body ?? {};
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

    if (recurrence_rule !== undefined) {
      if (recurrence_rule !== null && !isValidRecurrenceRule(recurrence_rule)) {
        return res.status(400).json({ error: 'recurrence_rule is invalid' });
      }
      data.recurrence_rule = recurrence_rule;
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

// ── POST /teams/:teamId/calendar-events/:eventId/exceptions ───────────────────
// Edit or delete a single occurrence of a recurring event.
router.post('/:eventId/exceptions', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const teamId = (req.params as Record<string, string>).teamId ?? '';
    const eventId = (req.params as Record<string, string>).eventId ?? '';

    if (!(await canManageCalendarEvents(prisma, userId, teamId))) {
      return res.status(403).json({ error: 'You do not have permission to manage calendar events' });
    }

    const parent = await prisma.calendarEvent.findFirst({
      where: { id: eventId, team_id: teamId },
    });
    if (!parent) return res.status(404).json({ error: 'Event not found' });
    if (!parent.recurrence_rule) {
      return res.status(400).json({ error: 'Event is not recurring' });
    }

    const { exception_date, deleted, override } = req.body ?? {};
    const exceptionDate = parseDate(exception_date);
    if (!exceptionDate) {
      return res.status(400).json({ error: 'exception_date must be a valid date' });
    }

    // Validate override if provided.
    let overrideEventId: string | null = null;
    if (override && !deleted) {
      const { title, description, starts_at, ends_at, color, all_day } = override;
      const overrideStart = parseDate(starts_at);
      const overrideEnd = parseDate(ends_at);
      if (!overrideStart || !overrideEnd) {
        return res.status(400).json({ error: 'override starts_at and ends_at are required' });
      }
      if (overrideEnd.getTime() < overrideStart.getTime()) {
        return res.status(400).json({ error: 'ends_at must be after or equal to starts_at' });
      }

      let overrideColor: string | undefined;
      if (color !== undefined) {
        if (typeof color !== 'string' || !HEX_COLOR_RE.test(color)) {
          return res.status(400).json({ error: 'color must be a hex string like #4648d4' });
        }
        overrideColor = color;
      }

      const created = await prisma.calendarEvent.create({
        data: {
          team_id: teamId,
          title: typeof title === 'string' ? title.trim() : parent.title,
          description: typeof description === 'string' ? description : parent.description,
          starts_at: overrideStart,
          ends_at: overrideEnd,
          all_day: typeof all_day === 'boolean' ? all_day : parent.all_day,
          color: overrideColor ?? parent.color,
          created_by: userId,
        },
      });
      overrideEventId = created.id;
    }

    await prisma.calendarEventException.upsert({
      where: { event_id_exception_date: { event_id: eventId, exception_date: exceptionDate } },
      update: { deleted: Boolean(deleted), override_event_id: overrideEventId },
      create: {
        event_id: eventId,
        exception_date: exceptionDate,
        deleted: Boolean(deleted),
        override_event_id: overrideEventId,
      },
    });

    res.json({ updated: true });
  } catch (err) {
    next(err);
  }
});

export default router;

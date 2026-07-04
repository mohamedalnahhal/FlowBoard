import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { requireAuth, getUserRole, isSystemAdmin, isWorkspaceAdmin, isWorkspaceMember } from '../lib/auth.js';

const router = Router({ mergeParams: true }); // expects :workspaceId from parent router

function truncateTitle(title: string, max = 60): string {
  if (title.length <= max) return title;
  return `${title.slice(0, max)}…`;
}

// ── GET /workspaces/:workspaceId/announcements ────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const workspaceId = (req.params as Record<string, string>).workspaceId ?? '';

    const role = await getUserRole(prisma, userId);
    if (!isSystemAdmin(role) && !(await isWorkspaceMember(prisma, userId, workspaceId))) {
      return res.status(403).json({ error: 'You are not a member of this workspace' });
    }

    const rawLimit = req.query.limit as string | undefined;
    const rawOffset = req.query.offset as string | undefined;
    const limit = Math.min(parseInt(rawLimit ?? '20', 10) || 20, 100);
    const offset = Math.max(parseInt(rawOffset ?? '0', 10) || 0, 0);

    const [items, total] = await Promise.all([
      prisma.announcement.findMany({
        where:   { workspace_id: workspaceId },
        include: { author: { select: { id: true, display_name: true, username: true } } },
        orderBy: { created_at: 'desc' },
        skip:    offset,
        take:    limit,
      }),
      prisma.announcement.count({ where: { workspace_id: workspaceId } }),
    ]);

    res.setHeader('X-Total-Count', String(total));
    res.json({ items, total });
  } catch (err) {
    next(err);
  }
});

// ── POST /workspaces/:workspaceId/announcements ───────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const workspaceId = (req.params as Record<string, string>).workspaceId ?? '';

    const role = await getUserRole(prisma, userId);
    if (!isSystemAdmin(role) && !(isWorkspaceAdmin(role) && (await isWorkspaceMember(prisma, userId, workspaceId)))) {
      return res.status(403).json({ error: 'You do not have permission to post announcements' });
    }

    const { title, body } = req.body ?? {};
    if (typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'title is required' });
    }
    if (typeof body !== 'string' || body.trim() === '') {
      return res.status(400).json({ error: 'body is required' });
    }

    const announcement = await prisma.$transaction(async (tx) => {
      const created = await tx.announcement.create({
        data: {
          workspace_id: workspaceId,
          author_id:    userId,
          title:        title.trim(),
          body:         body.trim(),
        },
        include: { author: { select: { id: true, display_name: true, username: true } } },
      });

      // Notify every distinct workspace member except the author.
      const recipients = await tx.userTeam.findMany({
        where: { team: { workspace_id: workspaceId }, user_id: { not: userId } },
        select: { user_id: true, team_id: true },
        distinct: ['user_id'],
      });

      if (recipients.length > 0) {
        const userTeamIds = new Map<string, string>();
        for (const r of recipients) {
          if (!userTeamIds.has(r.user_id)) userTeamIds.set(r.user_id, r.team_id);
        }

        await tx.notification.createMany({
          data: Array.from(userTeamIds.entries()).map(([recipientId, teamId]) => ({
            user_id: recipientId,
            message: `New announcement: "${truncateTitle(created.title)}"`,
            link:    `/${workspaceId}/${teamId}/announcements`,
          })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    res.status(201).json(announcement);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /workspaces/:workspaceId/announcements/:announcementId ──────────────
router.patch('/:announcementId', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const workspaceId = (req.params as Record<string, string>).workspaceId ?? '';
    const announcementId = (req.params as Record<string, string>).announcementId ?? '';

    const role = await getUserRole(prisma, userId);
    const isAdmin = isSystemAdmin(role) || (isWorkspaceAdmin(role) && (await isWorkspaceMember(prisma, userId, workspaceId)));

    const existing = await prisma.announcement.findFirst({
      where: { id: announcementId, workspace_id: workspaceId },
    });
    if (!existing) return res.status(404).json({ error: 'Announcement not found' });

    if (!isAdmin && existing.author_id !== userId) {
      return res.status(403).json({ error: 'You do not have permission to update this announcement' });
    }

    const { title, body } = req.body ?? {};
    const data: Record<string, unknown> = {};
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ error: 'title must be a non-empty string' });
      }
      data.title = title.trim();
    }
    if (body !== undefined) {
      if (typeof body !== 'string' || body.trim() === '') {
        return res.status(400).json({ error: 'body must be a non-empty string' });
      }
      data.body = body.trim();
    }

    const updated = await prisma.announcement.updateMany({
      where: { id: announcementId, workspace_id: workspaceId },
      data,
    });

    if (updated.count === 0) return res.status(404).json({ error: 'Announcement not found' });
    res.json({ updated: true });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /workspaces/:workspaceId/announcements/:announcementId ─────────────
router.delete('/:announcementId', async (req, res, next) => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const prisma = req.app.get('prisma') as PrismaClient;
    const workspaceId = (req.params as Record<string, string>).workspaceId ?? '';
    const announcementId = (req.params as Record<string, string>).announcementId ?? '';

    const role = await getUserRole(prisma, userId);
    const isAdmin = isSystemAdmin(role) || (isWorkspaceAdmin(role) && (await isWorkspaceMember(prisma, userId, workspaceId)));

    const existing = await prisma.announcement.findFirst({
      where: { id: announcementId, workspace_id: workspaceId },
    });
    if (!existing) return res.status(404).json({ error: 'Announcement not found' });

    if (!isAdmin && existing.author_id !== userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this announcement' });
    }

    const deleted = await prisma.announcement.deleteMany({
      where: { id: announcementId, workspace_id: workspaceId },
    });

    if (deleted.count === 0) return res.status(404).json({ error: 'Announcement not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;

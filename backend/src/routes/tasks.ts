import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { checkPermission } from '../middleware/checkPermission.js';
import { ACTIONS } from '../core/permissions/constants.js';
import { recordTaskActivity } from '../core/activity/taskActivity.js';

const router = Router();

// ── GET /tasks/:taskId ─────────────────────────────────────────────────────────
// Full task detail — powers the Task Details modal.
router.get(
  '/:taskId',
  checkPermission(ACTIONS.TASK_VIEW, 'task', (req) => (req.params.taskId as string), { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const task = await prisma.task.findUnique({
        where:   { id: (req.params.taskId as string) },
        include: {
          list: { select: { id: true, name: true, board_id: true, board: { select: { id: true, name: true, team_id: true } } } },
          creator:   { select: { id: true, display_name: true, username: true } },
          task_members: { select: { user_id: true, role: true, user: { select: { id: true, display_name: true, username: true } } } },
          task_labels:  { include: { label: true } },
          task_attachments: { include: { attachment: true } },
          checklist: { include: { checklist_items: { orderBy: { created_at: 'asc' } } } },
          task_comments: {
            where:   { parent_comment_id: null },
            orderBy: { created_at: 'asc' },
            include: {
              user:      { select: { id: true, display_name: true, username: true } },
              reactions: { select: { emoji: true, user_id: true } },
              replies: {
                orderBy: { created_at: 'asc' },
                include: {
                  user:      { select: { id: true, display_name: true, username: true } },
                  reactions: { select: { emoji: true, user_id: true } },
                },
              },
            },
          },
          task_history: {
            orderBy: { created_at: 'desc' },
            take: 30,
            include: { user: { select: { id: true, display_name: true, username: true } } },
          },
        },
      });

      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json(task);
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /tasks/:taskId/comments ───────────────────────────────────────────────
router.post(
  '/:taskId/comments',
  checkPermission(ACTIONS.COMMENT_CREATE, 'task', (req) => (req.params.taskId as string), { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { content, parent_comment_id } = req.body ?? {};
      if (!content) return res.status(400).json({ error: 'content is required' });

      const comment = await prisma.taskComment.create({
        data: {
          task_id: (req.params.taskId as string)!,
          user_id: req.user!.id!,
          content,
          ...(parent_comment_id && { parent_comment_id }),
        },
        include: { user: { select: { id: true, display_name: true, username: true } } },
      });

      res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /tasks/:taskId/comments/:commentId ──────────────────────────────────
router.patch(
  '/:taskId/comments/:commentId',
  checkPermission(ACTIONS.COMMENT_EDIT_OWN, 'task', (req) => (req.params.taskId as string), { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { content } = req.body ?? {};
      if (!content) return res.status(400).json({ error: 'content is required' });

      const updated = await prisma.taskComment.updateMany({
        where: { id: (req.params.commentId as string), task_id: (req.params.taskId as string), user_id: req.user!.id },
        data:  { content, is_edited: true },
      });

      if (updated.count === 0) return res.status(404).json({ error: 'Comment not found' });
      res.json({ updated: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /tasks/:taskId/comments/:commentId ─────────────────────────────────
router.delete(
  '/:taskId/comments/:commentId',
  checkPermission(ACTIONS.COMMENT_DELETE_OWN, 'task', (req) => (req.params.taskId as string), { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      await prisma.taskComment.deleteMany({
        where: { id: (req.params.commentId as string), task_id: (req.params.taskId as string), user_id: req.user!.id },
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /tasks/:taskId/comments/:commentId/reactions ─────────────────────────
// Toggles the current user's emoji reaction on a comment (adds it, or removes
// it if they had already reacted with that emoji).
const ALLOWED_REACTIONS = new Set(['👍', '❤️', '😄', '🎉', '🚀', '👀']);

router.post(
  '/:taskId/comments/:commentId/reactions',
  checkPermission(ACTIONS.COMMENT_CREATE, 'task', (req) => (req.params.taskId as string), { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { emoji } = req.body ?? {};
      const taskId = req.params.taskId as string;
      const commentId = req.params.commentId as string;

      if (!emoji || !ALLOWED_REACTIONS.has(emoji)) {
        return res.status(400).json({ error: `emoji must be one of: ${[...ALLOWED_REACTIONS].join(' ')}` });
      }

      // The comment must belong to the task in the URL.
      const comment = await prisma.taskComment.findFirst({
        where:  { id: commentId, task_id: taskId },
        select: { id: true },
      });
      if (!comment) return res.status(404).json({ error: 'Comment not found' });

      const userId = req.user!.id!;
      const existing = await prisma.commentReaction.findUnique({
        where: { comment_id_user_id_emoji: { comment_id: commentId, user_id: userId, emoji } },
        select: { id: true },
      });

      if (existing) {
        await prisma.commentReaction.delete({ where: { id: existing.id } });
        return res.json({ toggled: 'removed', emoji });
      }

      await prisma.commentReaction.create({ data: { comment_id: commentId, user_id: userId, emoji } });
      return res.status(201).json({ toggled: 'added', emoji });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /tasks/:taskId/checklist-items ────────────────────────────────────────
// Creates the task's checklist on first use, then appends an item.
router.post(
  '/:taskId/checklist-items',
  checkPermission(ACTIONS.CHECKLIST_ITEM_MUTATE, 'task', (req) => (req.params.taskId as string), { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { name } = req.body ?? {};
      if (!name) return res.status(400).json({ error: 'name is required' });

      const task = await prisma.task.findUnique({
        where:  { id: (req.params.taskId as string) },
        select: { checklist_id: true, list: { select: { board_id: true } } },
      });
      if (!task) return res.status(404).json({ error: 'Task not found' });

      let checklistId = task.checklist_id;
      if (!checklistId) {
        const checklist = await prisma.checklist.create({ data: { board_id: task.list.board_id } });
        await prisma.task.update({ where: { id: (req.params.taskId as string) }, data: { checklist_id: checklist.id } });
        checklistId = checklist.id;
      }

      const item = await prisma.checklistItem.create({
        data: { checklist_id: checklistId, name },
      });

      await recordTaskActivity(prisma, (req.params.taskId as string)!, req.user!.id!, 'checklist_item_added', {
        item: item.name,
      });

      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /tasks/:taskId/checklist-items/:itemId ──────────────────────────────
// Toggle / rename a checklist item.
router.patch(
  '/:taskId/checklist-items/:itemId',
  checkPermission(ACTIONS.CHECKLIST_ITEM_TOGGLE, 'task', (req) => (req.params.taskId as string), { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { name, status } = req.body ?? {};

      const task = await prisma.task.findUnique({ where: { id: (req.params.taskId as string) }, select: { checklist_id: true } });
      if (!task?.checklist_id) return res.status(404).json({ error: 'Checklist item not found' });

      const updated = await prisma.checklistItem.updateMany({
        where: { id: (req.params.itemId as string), checklist_id: task.checklist_id },
        data:  { ...(name !== undefined && { name }), ...(status !== undefined && { status: Boolean(status) }) },
      });

      if (updated.count === 0) return res.status(404).json({ error: 'Checklist item not found' });
      res.json({ updated: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /tasks/:taskId/checklist-items/:itemId ─────────────────────────────
router.delete(
  '/:taskId/checklist-items/:itemId',
  checkPermission(ACTIONS.CHECKLIST_ITEM_MUTATE, 'task', (req) => (req.params.taskId as string), { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;

      const task = await prisma.task.findUnique({ where: { id: (req.params.taskId as string) }, select: { checklist_id: true } });
      if (!task?.checklist_id) return res.status(404).json({ error: 'Checklist item not found' });

      await prisma.checklistItem.deleteMany({
        where: { id: (req.params.itemId as string), checklist_id: task.checklist_id },
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /tasks/:taskId/attachments ────────────────────────────────────────────
router.post(
  '/:taskId/attachments',
  checkPermission(ACTIONS.ATTACHMENT_UPLOAD, 'task', (req) => (req.params.taskId as string), { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { type, name, url } = req.body ?? {};
      if (!type || !name || !url) return res.status(400).json({ error: 'type, name and url are required' });

      // Attachment URLs are rendered as links in the UI — only allow http(s)
      // to rule out javascript: and similar schemes.
      let parsed: URL;
      try {
        parsed = new URL(String(url));
      } catch {
        return res.status(400).json({ error: 'url must be a valid URL' });
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return res.status(400).json({ error: 'url must use http or https' });
      }

      const attachment = await prisma.attachment.create({ data: { type, name, url } });
      await prisma.taskAttachment.create({
        data: { task_id: (req.params.taskId as string)!, attachment_id: attachment.id },
      });

      res.status(201).json(attachment);
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /tasks/:taskId/attachments/:attachmentId ───────────────────────────
router.delete(
  '/:taskId/attachments/:attachmentId',
  checkPermission(ACTIONS.ATTACHMENT_DELETE, 'task', (req) => (req.params.taskId as string), { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      await prisma.taskAttachment.deleteMany({
        where: { task_id: (req.params.taskId as string), attachment_id: (req.params.attachmentId as string) },
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /tasks/:taskId/members ───────────────────────────────────────────────
router.post(
  '/:taskId/members',
  checkPermission(ACTIONS.TASK_ASSIGN_OTHERS, 'task', (req) => (req.params.taskId as string), { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const { user_id, role = 1 } = req.body ?? {};
      if (!user_id) return res.status(400).json({ error: 'user_id is required' });

      const member = await prisma.taskMember.upsert({
        where:  { user_id_task_id: { user_id, task_id: (req.params.taskId as string) } },
        update: { role },
        create: { user_id, task_id: (req.params.taskId as string), role },
        include: { user: { select: { display_name: true } } },
      });

      await recordTaskActivity(prisma, (req.params.taskId as string)!, req.user!.id!, 'task_assigned', {
        user: member.user.display_name,
      });

      res.status(201).json(member);
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /tasks/:taskId/members/:userId ─────────────────────────────────────
router.delete(
  '/:taskId/members/:userId',
  checkPermission(ACTIONS.TASK_ASSIGN_OTHERS, 'task', (req) => (req.params.taskId as string), { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const removed = await prisma.taskMember.deleteMany({
        where: { task_id: (req.params.taskId as string), user_id: (req.params.userId as string) },
      });

      // Only record the change when a member was actually removed.
      if (removed.count > 0) {
        const removedUser = await prisma.user.findUnique({
          where:  { id: (req.params.userId as string) },
          select: { display_name: true },
        });
        await recordTaskActivity(prisma, (req.params.taskId as string)!, req.user!.id!, 'task_unassigned', {
          user: removedUser?.display_name ?? 'a member',
        });
      }

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /tasks/:taskId/history ─────────────────────────────────────────────────
router.get(
  '/:taskId/history',
  checkPermission(ACTIONS.HISTORY_VIEW, 'task', (req) => (req.params.taskId as string), { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const history = await prisma.taskHistory.findMany({
        where:   { task_id: (req.params.taskId as string) },
        orderBy: { created_at: 'desc' },
        include: { user: { select: { id: true, display_name: true, username: true } } },
      });
      res.json(history);
    } catch (err) {
      next(err);
    }
  },
);

export default router;

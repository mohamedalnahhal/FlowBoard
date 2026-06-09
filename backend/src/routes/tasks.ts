import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { checkPermission } from '../middleware/checkPermission.js';
import { ACTIONS } from '../core/permissions/constants.js';

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
          task_members: { select: { id: true, role: true, user: { select: { id: true, display_name: true, username: true } } } },
          task_labels:  { include: { label: true } },
          task_attachments: { include: { attachment: true } },
          checklist: { include: { checklist_items: { orderBy: { created_at: 'asc' } } } },
          task_comments: {
            where:   { parent_comment_id: null },
            orderBy: { created_at: 'asc' },
            include: {
              user: { select: { id: true, display_name: true, username: true } },
              replies: {
                orderBy: { created_at: 'asc' },
                include: { user: { select: { id: true, display_name: true, username: true } } },
              },
            },
          },
          task_history: {
            orderBy: { id: 'desc' },
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

// ── GET /tasks/:taskId/history ─────────────────────────────────────────────────
router.get(
  '/:taskId/history',
  checkPermission(ACTIONS.HISTORY_VIEW, 'task', (req) => (req.params.taskId as string), { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma') as PrismaClient;
      const history = await prisma.taskHistory.findMany({
        where:   { task_id: (req.params.taskId as string) },
        orderBy: { id: 'desc' },
        include: { user: { select: { id: true, display_name: true, username: true } } },
      });
      res.json(history);
    } catch (err) {
      next(err);
    }
  },
);

export default router;

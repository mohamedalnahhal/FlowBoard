const { Router }                                        = require('express');
const { checkPermission, checkAllPermissions,
        checkAnyPermission }                             = require('../middleware/checkPermission');
const { ACTIONS }                                       = require('../core/permissions/constants');

// Mounted at /teams/:teamId/boards/:boardId/lists/:listId/tasks
const router = Router({ mergeParams: true });

const VALID_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'];

// ── GET /…/lists/:listId/tasks ─────────────────────────────────────────────────
router.get(
  '/',
  checkPermission(ACTIONS.TASK_VIEW, 'list', (req) => req.params.listId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');

      const tasks = await prisma.task.findMany({
        where:   { list_id: req.params.listId },
        include: {
          task_members: { include: { user: { select: { id: true, display_name: true, username: true } } } },
          task_labels:  { include: { label: true } },
        },
        orderBy: { position: 'asc' },
      });

      res.json(tasks);
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /…/lists/:listId/tasks ────────────────────────────────────────────────
router.post(
  '/',
  checkPermission(ACTIONS.TASK_CREATE, 'list', (req) => req.params.listId),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const { name, description = '', status = 'TODO', start_date, end_date } = req.body;

      if (!name) return res.status(400).json({ error: 'name is required' });
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
      }

      const lastTask = await prisma.task.findFirst({
        where:   { list_id: req.params.listId },
        orderBy: { position: 'desc' },
        select:  { position: true },
      });

      const task = await prisma.task.create({
        data: {
          name,
          description,
          status,
          list_id:    req.params.listId,
          created_by: req.user.id,
          position:   (lastTask?.position ?? 0) + 1,
          ...(start_date && { start_date: new Date(start_date) }),
          ...(end_date   && { end_date:   new Date(end_date)   }),
        },
      });

      res.status(201).json(task);
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /…/lists/:listId/tasks/:taskId ────────────────────────────────────────
router.get(
  '/:taskId',
  checkPermission(ACTIONS.TASK_VIEW, 'task', (req) => req.params.taskId, { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');

      const task = await prisma.task.findFirst({
        where:   { id: req.params.taskId, list_id: req.params.listId },
        include: {
          task_members:     { include: { user: { select: { id: true, display_name: true, username: true } } } },
          task_labels:      { include: { label: true } },
          task_attachments: { include: { attachment: true } },
          task_comments:    {
            where:   { parent_comment_id: null },
            include: {
              user:    { select: { id: true, display_name: true, username: true } },
              replies: { include: { user: { select: { id: true, display_name: true, username: true } } } },
            },
            orderBy: { created_at: 'asc' },
          },
          checklist:   { include: { checklist_items: true } },
          creator:     { select: { id: true, display_name: true, username: true } },
        },
      });

      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json(task);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /…/lists/:listId/tasks/:taskId ──────────────────────────────────────
router.patch(
  '/:taskId',
  checkPermission(ACTIONS.TASK_UPDATE, 'task', (req) => req.params.taskId, { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const { name, description, status, start_date, end_date } = req.body;

      if (status && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
      }

      const result = await prisma.task.updateMany({
        where: { id: req.params.taskId, list_id: req.params.listId },
        data:  {
          ...(name        !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(status      !== undefined && { status }),
          ...(start_date  !== undefined && { start_date: start_date ? new Date(start_date) : null }),
          ...(end_date    !== undefined && { end_date:   end_date   ? new Date(end_date)   : null }),
        },
      });

      if (result.count === 0) return res.status(404).json({ error: 'Task not found' });
      res.json({ updated: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /…/lists/:listId/tasks/:taskId ─────────────────────────────────────
router.delete(
  '/:taskId',
  checkPermission(ACTIONS.TASK_DELETE, 'task', (req) => req.params.taskId, { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');

      const result = await prisma.task.deleteMany({
        where: { id: req.params.taskId, list_id: req.params.listId },
      });

      if (result.count === 0) return res.status(404).json({ error: 'Task not found' });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /…/tasks/:taskId/move ────────────────────────────────────────────────
// Move task to a different list and/or change its position.
router.patch(
  '/:taskId/move',
  checkPermission(ACTIONS.TASK_MOVE, 'task', (req) => req.params.taskId, { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const { target_list_id, position } = req.body;

      if (!target_list_id && position === undefined) {
        return res.status(400).json({ error: 'Provide target_list_id and/or position' });
      }

      // Verify target list belongs to the same board
      if (target_list_id) {
        const targetList = await prisma.list.findFirst({
          where: { id: target_list_id, board_id: req.params.boardId },
        });
        if (!targetList) return res.status(404).json({ error: 'Target list not found in this board' });
      }

      const result = await prisma.task.updateMany({
        where: { id: req.params.taskId, list_id: req.params.listId },
        data:  {
          ...(target_list_id !== undefined && { list_id: target_list_id }),
          ...(position       !== undefined && { position }),
        },
      });

      if (result.count === 0) return res.status(404).json({ error: 'Task not found' });
      res.json({ moved: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /…/tasks/:taskId/members ──────────────────────────────────────────────
// Assign a member to a task.
router.post(
  '/:taskId/members',
  async (req, res, next) => {
    try {
      const prisma  = req.app.get('prisma');
      const { user_id, role } = req.body;

      if (!user_id) return res.status(400).json({ error: 'user_id is required' });

      // Assigning yourself uses TASK_ASSIGN_SELF; assigning others needs TASK_ASSIGN_OTHERS
      const action = user_id === req.user.id ? ACTIONS.TASK_ASSIGN_SELF : ACTIONS.TASK_ASSIGN_OTHERS;
      const { resolvePermission } = require('../core/permissions/permissionService');
      const { allowed, reason }   = await resolvePermission(
        prisma, req.user.id, action, 'task', req.params.taskId,
      );
      if (!allowed) return res.status(403).json({ error: 'Forbidden', reason });

      const membership = await prisma.taskMember.create({
        data: { task_id: req.params.taskId, user_id, ...(role !== undefined && { role }) },
      });

      res.status(201).json(membership);
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'User already assigned' });
      next(err);
    }
  },
);

// ── DELETE /…/tasks/:taskId/members/:userId ────────────────────────────────────
router.delete(
  '/:taskId/members/:userId',
  checkPermission(ACTIONS.TASK_ASSIGN_OTHERS, 'task', (req) => req.params.taskId, { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');

      await prisma.taskMember.deleteMany({
        where: { task_id: req.params.taskId, user_id: req.params.userId },
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /…/tasks/:taskId/labels ───────────────────────────────────────────────
router.post(
  '/:taskId/labels',
  checkPermission(ACTIONS.LABEL_APPLY, 'task', (req) => req.params.taskId, { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const { label_id } = req.body;

      if (!label_id) return res.status(400).json({ error: 'label_id is required' });

      // Verify label belongs to the same board
      const label = await prisma.label.findFirst({
        where: { id: label_id, board_id: req.params.boardId },
      });
      if (!label) return res.status(404).json({ error: 'Label not found in this board' });

      const taskLabel = await prisma.taskLabel.create({
        data: { task_id: req.params.taskId, label_id },
      });

      res.status(201).json(taskLabel);
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Label already applied' });
      next(err);
    }
  },
);

// ── DELETE /…/tasks/:taskId/labels/:labelId ────────────────────────────────────
router.delete(
  '/:taskId/labels/:labelId',
  checkPermission(ACTIONS.LABEL_APPLY, 'task', (req) => req.params.taskId, { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');

      await prisma.taskLabel.deleteMany({
        where: { task_id: req.params.taskId, label_id: req.params.labelId },
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /…/tasks/:taskId/history ───────────────────────────────────────────────
router.get(
  '/:taskId/history',
  checkPermission(ACTIONS.HISTORY_VIEW, 'task', (req) => req.params.taskId, { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');

      const history = await prisma.taskHistory.findMany({
        where:   { task_id: req.params.taskId },
        include: { user: { select: { id: true, display_name: true, username: true } } },
        orderBy: { id: 'asc' },
      });

      res.json(history);
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /…/tasks/:taskId/comments ─────────────────────────────────────────────
router.post(
  '/:taskId/comments',
  checkPermission(ACTIONS.COMMENT_CREATE, 'task', (req) => req.params.taskId, { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const { content, parent_comment_id } = req.body;

      if (!content) return res.status(400).json({ error: 'content is required' });

      // Verify parent comment belongs to the same task
      if (parent_comment_id) {
        const parent = await prisma.taskComment.findFirst({
          where: { id: parent_comment_id, task_id: req.params.taskId },
        });
        if (!parent) return res.status(404).json({ error: 'Parent comment not found' });
      }

      const comment = await prisma.taskComment.create({
        data: {
          content,
          task_id: req.params.taskId,
          user_id: req.user.id,
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

// ── PATCH /…/tasks/:taskId/comments/:commentId ────────────────────────────────
// Only the comment author can edit (COMMENT_EDIT_OWN).
router.patch(
  '/:taskId/comments/:commentId',
  checkPermission(ACTIONS.COMMENT_EDIT_OWN, 'task', (req) => req.params.taskId, { inherit: true }),
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');
      const { content } = req.body;

      if (!content) return res.status(400).json({ error: 'content is required' });

      // Enforce ownership — must be the author
      const comment = await prisma.taskComment.findFirst({
        where: { id: req.params.commentId, task_id: req.params.taskId },
      });
      if (!comment) return res.status(404).json({ error: 'Comment not found' });
      if (comment.user_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only edit your own comments' });
      }

      await prisma.taskComment.update({
        where: { id: req.params.commentId },
        data:  { content, is_edited: true },
      });

      res.json({ updated: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /…/tasks/:taskId/comments/:commentId ───────────────────────────────
// Owner can delete their own comment; moderators with COMMENT_DELETE_ANY can delete any.
router.delete(
  '/:taskId/comments/:commentId',
  async (req, res, next) => {
    try {
      const prisma = req.app.get('prisma');

      const comment = await prisma.taskComment.findFirst({
        where: { id: req.params.commentId, task_id: req.params.taskId },
      });
      if (!comment) return res.status(404).json({ error: 'Comment not found' });

      const isOwner = comment.user_id === req.user.id;

      if (!isOwner) {
        // Require COMMENT_DELETE_ANY to delete someone else's comment
        const { resolvePermission } = require('../core/permissions/permissionService');
        const { allowed, reason }   = await resolvePermission(
          prisma, req.user.id, ACTIONS.COMMENT_DELETE_ANY, 'task', req.params.taskId,
        );
        if (!allowed) return res.status(403).json({ error: 'Forbidden', reason });
      }
      // Owner only needs COMMENT_DELETE_OWN — checked implicitly by ownership above

      await prisma.taskComment.delete({ where: { id: req.params.commentId } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;

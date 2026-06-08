const { resolvePermission, resolvePermissionWithInheritance } = require('../core/permissions/permissionService');

/**
 * Middleware factory that enforces a single permission rule.
 *
 * Usage (exact scope only):
 *   router.get('/:boardId/tasks',
 *     checkPermission('board:view', 'board', (req) => req.params.boardId),
 *     controller.listTasks,
 *   );
 *
 * Usage (with scope inheritance — task inherits from list → board → team):
 *   router.patch('/:taskId',
 *     checkPermission('task:edit', 'task', (req) => req.params.taskId, { inherit: true }),
 *     controller.updateTask,
 *   );
 *
 * @param {string}   action         - Permission action string, e.g. 'board:edit'
 * @param {string}   scopeType      - Resource type: 'board' | 'list' | 'task' | 'team'
 * @param {Function} scopeIdFn      - (req) => string  — extracts the resource ID from the request
 * @param {object}   [opts]
 * @param {boolean}  [opts.inherit=false] - Walk the scope hierarchy if no rule found at exact scope
 */
function checkPermission(action, scopeType, scopeIdFn, opts = {}) {
  const { inherit = false } = opts;

  return async (req, res, next) => {
    try {
      const userId  = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthenticated' });
      }

      const scopeId = scopeIdFn(req);
      if (!scopeId) {
        return res.status(400).json({ error: 'Could not determine resource scope' });
      }

      const prisma  = req.app.get('prisma');
      const resolve = inherit ? resolvePermissionWithInheritance : resolvePermission;

      const { allowed, reason } = await resolve(prisma, userId, action, scopeType, scopeId);

      if (!allowed) {
        return res.status(403).json({ error: 'Forbidden', reason });
      }

      // Attach resolved context so downstream handlers can use it
      req.permissionContext = { action, scopeType, scopeId, userId };
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * Middleware factory that enforces multiple permissions on the same scope (AND logic).
 * All permissions must be satisfied.
 *
 * Usage:
 *   router.post('/:boardId/labels',
 *     checkAllPermissions([
 *       ['board:view',          'board', (req) => req.params.boardId],
 *       ['board:manage_labels', 'board', (req) => req.params.boardId],
 *     ]),
 *     controller.createLabel,
 *   );
 */
function checkAllPermissions(rules, opts = {}) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthenticated' });
      }

      const prisma  = req.app.get('prisma');
      const resolve = opts.inherit ? resolvePermissionWithInheritance : resolvePermission;

      const checks = await Promise.all(
        rules.map(([action, scopeType, scopeIdFn]) =>
          resolve(prisma, userId, action, scopeType, scopeIdFn(req)),
        ),
      );

      const denied = checks.find((c) => !c.allowed);
      if (denied) {
        return res.status(403).json({ error: 'Forbidden', reason: denied.reason });
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * Middleware factory that enforces at least one permission (OR logic).
 *
 * Usage:
 *   router.get('/:taskId',
 *     checkAnyPermission([
 *       ['task:view',  'task',  (req) => req.params.taskId],
 *       ['board:view', 'board', (req) => req.params.boardId],
 *     ]),
 *     controller.getTask,
 *   );
 */
function checkAnyPermission(rules, opts = {}) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthenticated' });
      }

      const prisma  = req.app.get('prisma');
      const resolve = opts.inherit ? resolvePermissionWithInheritance : resolvePermission;

      const checks = await Promise.all(
        rules.map(([action, scopeType, scopeIdFn]) =>
          resolve(prisma, userId, action, scopeType, scopeIdFn(req)),
        ),
      );

      const granted = checks.find((c) => c.allowed);
      if (!granted) {
        return res.status(403).json({
          error:   'Forbidden',
          reason:  'None of the required permissions were satisfied',
          details: checks.map((c) => c.reason),
        });
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { checkPermission, checkAllPermissions, checkAnyPermission };

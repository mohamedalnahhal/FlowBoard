import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { PrismaClient } from '@prisma/client';
import { resolvePermission, resolvePermissionWithInheritance } from '../core/permissions/permissionService.js';
import type { ScopeType } from '../core/permissions/constants.js';

type ScopeIdFn = (req: Request) => string | undefined;

interface CheckOptions {
  inherit?: boolean;
}

/**
 * Middleware factory that enforces a single permission rule.
 *
 * Usage (exact scope only):
 *   router.get('/:boardId/tasks',
 *     checkPermission(ACTIONS.BOARD_VIEW, 'board', (req) => (req.params.boardId as string)),
 *     controller.listTasks,
 *   );
 *
 * Usage (with scope inheritance — task inherits from list → board → team):
 *   router.patch('/:taskId',
 *     checkPermission(ACTIONS.TASK_EDIT, 'task', (req) => (req.params.taskId as string), { inherit: true }),
 *     controller.updateTask,
 *   );
 */
export function checkPermission(action: string, scopeType: ScopeType, scopeIdFn: ScopeIdFn, opts: CheckOptions = {}): RequestHandler {
  const { inherit = false } = opts;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthenticated' });
      }

      const scopeId = scopeIdFn(req);
      if (!scopeId) {
        return res.status(400).json({ error: 'Could not determine resource scope' });
      }

      const prisma  = req.app.get('prisma') as PrismaClient;
      const resolve = inherit ? resolvePermissionWithInheritance : resolvePermission;

      const { allowed, reason } = await resolve(prisma, userId, action, scopeType, scopeId);

      if (!allowed) {
        return res.status(403).json({ error: 'Forbidden', reason });
      }

      req.permissionContext = { action, scopeType, scopeId, userId };
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

type Rule = [action: string, scopeType: ScopeType, scopeIdFn: ScopeIdFn];

/**
 * Middleware factory that enforces multiple permissions on the same scope (AND logic).
 * All permissions must be satisfied.
 */
export function checkAllPermissions(rules: Rule[], opts: CheckOptions = {}): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthenticated' });
      }

      const prisma  = req.app.get('prisma') as PrismaClient;
      const resolve = opts.inherit ? resolvePermissionWithInheritance : resolvePermission;

      const checks = await Promise.all(
        rules.map(([action, scopeType, scopeIdFn]) => {
          const scopeId = scopeIdFn(req);
          if (!scopeId) return { allowed: false, reason: 'Could not determine resource scope' };
          return resolve(prisma, userId, action, scopeType, scopeId);
        }),
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
 */
export function checkAnyPermission(rules: Rule[], opts: CheckOptions = {}): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthenticated' });
      }

      const prisma  = req.app.get('prisma') as PrismaClient;
      const resolve = opts.inherit ? resolvePermissionWithInheritance : resolvePermission;

      const checks = await Promise.all(
        rules.map(([action, scopeType, scopeIdFn]) => {
          const scopeId = scopeIdFn(req);
          if (!scopeId) return { allowed: false, reason: 'Could not determine resource scope' };
          return resolve(prisma, userId, action, scopeType, scopeId);
        }),
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

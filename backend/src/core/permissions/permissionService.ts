import type { PrismaClient, Permission } from '@prisma/client';
import { PERMISSION_TYPES, SCOPE_TYPES, SYSTEM_ADMIN_ROLE, type ScopeType } from './constants.js';

export interface PermissionResult {
  allowed: boolean;
  reason: string;
}

/**
 * Resolves whether a user is authorized to perform an action on a resource.
 *
 * Resolution order (per spec):
 *   1. System admin  → always authorized
 *   2. Team membership → not a member → not authorized
 *   3. Explicit scope permissions (the FK column matching scopeType = scopeId)
 *      → resolved by priority DESC; at equal priority DENY beats ALLOW
 *      → if any found: result is final (overrides team-wide rules)
 *   4. Team-wide permissions (board_id, list_id AND task_id all NULL)
 *      → resolved by priority DESC; at equal priority DENY beats ALLOW
 *   5. Default → not authorized
 *
 * Note: the schema models scope via explicit nullable FK columns
 * (board_id / list_id / task_id) on Permission rather than a generic
 * scope_type/scope_id pair — a "team-wide" rule is one where all three
 * are NULL (the owning team is reached through group.team_id).
 */
export async function resolvePermission(
  prisma: PrismaClient,
  userId: string,
  action: string,
  scopeType: ScopeType,
  scopeId: string,
): Promise<PermissionResult> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { role: true },
  });

  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  if (user.role === SYSTEM_ADMIN_ROLE) {
    return { allowed: true, reason: 'System administrator' };
  }

  const teamId = await resolveTeamFromScope(prisma, scopeType, scopeId);
  if (!teamId) {
    return { allowed: false, reason: 'Resource not found or has no team context' };
  }

  const isMember = await prisma.userTeam.findUnique({
    where: { user_id_team_id: { user_id: userId, team_id: teamId } },
  });
  if (!isMember) {
    return { allowed: false, reason: 'User is not a member of the team' };
  }

  const groupIds = await resolveUserGroups(prisma, userId, teamId);
  if (!groupIds.length) {
    return { allowed: false, reason: 'User belongs to no permission groups' };
  }

  const result = await resolveAtScope(prisma, groupIds, action, scopeType, scopeId);
  return result ?? { allowed: false, reason: 'No permission rule found' };
}

/**
 * Like resolvePermission, but walks the scope hierarchy from most specific
 * to least specific (task → list → board → team) and returns the result
 * from the first level that has a matching rule (explicit or team-wide).
 */
export async function resolvePermissionWithInheritance(
  prisma: PrismaClient,
  userId: string,
  action: string,
  scopeType: ScopeType,
  scopeId: string,
): Promise<PermissionResult> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { role: true },
  });

  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  if (user.role === SYSTEM_ADMIN_ROLE) {
    return { allowed: true, reason: 'System administrator' };
  }

  const chain = await buildScopeChain(prisma, scopeType, scopeId);
  if (!chain.length) {
    return { allowed: false, reason: 'Resource not found or has no team context' };
  }

  const teamId = chain[chain.length - 1]!.scopeId;

  const isMember = await prisma.userTeam.findUnique({
    where: { user_id_team_id: { user_id: userId, team_id: teamId } },
  });
  if (!isMember) {
    return { allowed: false, reason: 'User is not a member of the team' };
  }

  const groupIds = await resolveUserGroups(prisma, userId, teamId);
  if (!groupIds.length) {
    return { allowed: false, reason: 'User belongs to no permission groups' };
  }

  for (const level of chain) {
    const result = await resolveAtScope(prisma, groupIds, action, level.scopeType, level.scopeId);
    if (result) return result;
  }

  return { allowed: false, reason: 'No permission rule found' };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Looks up permission rules for a single scope level and resolves them.
 * Returns null when no rule exists at this level (caller should fall back).
 */
async function resolveAtScope(
  prisma: PrismaClient,
  groupIds: string[],
  action: string,
  scopeType: ScopeType,
  scopeId: string,
): Promise<PermissionResult | null> {
  if (scopeType === SCOPE_TYPES.TEAM || scopeType === SCOPE_TYPES.WORKSPACE) {
    const teamWide = await prisma.permission.findMany({
      where: {
        group_id: { in: groupIds },
        action,
        board_id: null,
        list_id:  null,
        task_id:  null,
      },
    });

    if (!teamWide.length) return null;
    return resolveConflicts(sortByPriorityDesc(teamWide));
  }

  const scopeColumn = scopeColumnFor(scopeType);

  const [explicit, teamWide] = await Promise.all([
    prisma.permission.findMany({
      where: {
        group_id: { in: groupIds },
        action,
        [scopeColumn]: scopeId,
      } as Record<string, unknown>,
    }),
    prisma.permission.findMany({
      where: {
        group_id: { in: groupIds },
        action,
        board_id: null,
        list_id:  null,
        task_id:  null,
      },
    }),
  ]);

  if (explicit.length) {
    return resolveConflicts(sortByPriorityDesc(explicit));
  }

  if (teamWide.length) {
    return resolveConflicts(sortByPriorityDesc(teamWide));
  }

  return null;
}

function scopeColumnFor(scopeType: ScopeType): 'board_id' | 'list_id' | 'task_id' {
  switch (scopeType) {
    case SCOPE_TYPES.BOARD: return 'board_id';
    case SCOPE_TYPES.LIST:  return 'list_id';
    case SCOPE_TYPES.TASK:  return 'task_id';
    default:
      throw new Error(`No explicit scope column for scope type "${scopeType}"`);
  }
}

function sortByPriorityDesc(permissions: Permission[]): Permission[] {
  return [...permissions].sort((a, b) => b.priority - a.priority);
}

/**
 * At the top priority level, DENY always beats ALLOW.
 * If the top-priority tier is unambiguously ALLOW → allow.
 */
function resolveConflicts(sortedPermissions: Permission[]): PermissionResult {
  const topPriority = sortedPermissions[0]!.priority;
  const topTier     = sortedPermissions.filter((p) => p.priority === topPriority);

  const hasDeny  = topTier.some((p) => p.type === PERMISSION_TYPES.DENY);
  const hasAllow = topTier.some((p) => p.type === PERMISSION_TYPES.ALLOW);

  if (hasDeny)  return { allowed: false, reason: 'Blocked by a DENY rule' };
  if (hasAllow) return { allowed: true,  reason: 'Granted by an ALLOW rule' };

  return { allowed: false, reason: 'No effective rule' };
}

/**
 * Collects all group IDs the user belongs to within the given team:
 * - Groups the user is explicitly a member of
 * - Groups where all_members = true (auto-includes all team members)
 */
export async function resolveUserGroups(prisma: PrismaClient, userId: string, teamId: string): Promise<string[]> {
  const [direct, allMember] = await Promise.all([
    prisma.userGroup.findMany({
      where:  { user_id: userId },
      select: { group_id: true },
    }),
    prisma.group.findMany({
      where:  { team_id: teamId, all_members: true },
      select: { id: true },
    }),
  ]);

  return [
    ...new Set([
      ...direct.map((g) => g.group_id),
      ...allMember.map((g) => g.id),
    ]),
  ];
}

/**
 * Walks up the resource hierarchy to find the owning team_id.
 * task → list.board → board.team
 * list → board.team
 * board → board.team
 * team → team
 */
async function resolveTeamFromScope(prisma: PrismaClient, scopeType: ScopeType, scopeId: string): Promise<string | null> {
  switch (scopeType) {
    case SCOPE_TYPES.TEAM:
      return scopeId;

    case SCOPE_TYPES.BOARD: {
      const board = await prisma.board.findUnique({
        where:  { id: scopeId },
        select: { team_id: true },
      });
      return board?.team_id ?? null;
    }

    case SCOPE_TYPES.LIST: {
      const list = await prisma.list.findUnique({
        where:  { id: scopeId },
        select: { board: { select: { team_id: true } } },
      });
      return list?.board?.team_id ?? null;
    }

    case SCOPE_TYPES.TASK: {
      const task = await prisma.task.findUnique({
        where:  { id: scopeId },
        select: { list: { select: { board: { select: { team_id: true } } } } },
      });
      return task?.list?.board?.team_id ?? null;
    }

    default:
      return null;
  }
}

interface ScopeLevel {
  scopeType: ScopeType;
  scopeId: string;
}

/**
 * Builds the inheritance chain for a scope, from most specific to least
 * specific, ending with the owning team. e.g. task → [task, list, board, team]
 */
async function buildScopeChain(prisma: PrismaClient, scopeType: ScopeType, scopeId: string): Promise<ScopeLevel[]> {
  switch (scopeType) {
    case SCOPE_TYPES.TEAM:
      return [{ scopeType: SCOPE_TYPES.TEAM, scopeId }];

    case SCOPE_TYPES.BOARD: {
      const board = await prisma.board.findUnique({
        where:  { id: scopeId },
        select: { team_id: true },
      });
      if (!board) return [];
      return [
        { scopeType: SCOPE_TYPES.BOARD, scopeId },
        { scopeType: SCOPE_TYPES.TEAM, scopeId: board.team_id },
      ];
    }

    case SCOPE_TYPES.LIST: {
      const list = await prisma.list.findUnique({
        where:  { id: scopeId },
        select: { board_id: true, board: { select: { team_id: true } } },
      });
      if (!list?.board) return [];
      return [
        { scopeType: SCOPE_TYPES.LIST, scopeId },
        { scopeType: SCOPE_TYPES.BOARD, scopeId: list.board_id },
        { scopeType: SCOPE_TYPES.TEAM, scopeId: list.board.team_id },
      ];
    }

    case SCOPE_TYPES.TASK: {
      const task = await prisma.task.findUnique({
        where:  { id: scopeId },
        select: {
          list_id: true,
          list: { select: { board_id: true, board: { select: { team_id: true } } } },
        },
      });
      if (!task?.list?.board) return [];
      return [
        { scopeType: SCOPE_TYPES.TASK, scopeId },
        { scopeType: SCOPE_TYPES.LIST, scopeId: task.list_id },
        { scopeType: SCOPE_TYPES.BOARD, scopeId: task.list.board_id },
        { scopeType: SCOPE_TYPES.TEAM, scopeId: task.list.board.team_id },
      ];
    }

    default:
      return [];
  }
}

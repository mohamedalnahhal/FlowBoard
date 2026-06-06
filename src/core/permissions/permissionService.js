const { PERMISSION_TYPES, SYSTEM_ADMIN_ROLE } = require('./constants');

/**
 * Resolves whether a user is authorized to perform an action on a resource.
 *
 * Resolution order (per spec):
 *   1. System admin  → always authorized
 *   2. Team membership → not a member → not authorized
 *   3. Explicit scope permissions (scope_id = target resource)
 *      → resolved by priority DESC; at equal priority DENY beats PERMIT
 *      → if any found: result is final (overrides team-wide rules)
 *   4. Team-wide permissions (scope_id IS NULL, scope_type matches)
 *      → resolved by priority DESC; at equal priority DENY beats PERMIT
 *   5. Default → not authorized
 *
 * @param {object} prisma
 * @param {string} userId
 * @param {string} action    - e.g. 'task:update'
 * @param {string} scopeType - 'board' | 'list' | 'task' | 'team'
 * @param {string} scopeId   - UUID of the target resource
 * @returns {Promise<{ allowed: boolean, reason: string }>}
 */
async function resolvePermission(prisma, userId, action, scopeType, scopeId) {
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

  // Map scopeType to the FK column used in the Permission table.
  // Schema uses separate nullable FKs (board_id / list_id / task_id)
  // rather than a generic scope_type + scope_id pair.
  const scopeCol = { board: 'board_id', list: 'list_id', task: 'task_id' }[scopeType];

  const permissions = await prisma.permission.findMany({
    where: {
      group_id: { in: groupIds },
      action,
      OR: [
        // Explicit scope — permission targets this exact resource
        ...(scopeCol ? [{ [scopeCol]: scopeId }] : []),
        // Team-wide fallback — all three scope FKs are null
        { board_id: null, list_id: null, task_id: null },
      ],
    },
  });

  if (!permissions.length) {
    return { allowed: false, reason: 'No permission rule found' };
  }

  // Tier 1: explicit resource-scoped permissions (highest precedence)
  const explicit = permissions
    .filter((p) => scopeCol && p[scopeCol] === scopeId)
    .sort((a, b) => b.priority - a.priority);

  if (explicit.length) {
    return resolveConflicts(explicit);
  }

  // Tier 2: team-wide permissions (all scope FKs null), only reached when
  // no explicit rule exists for this resource
  const teamWide = permissions
    .filter((p) => !p.board_id && !p.list_id && !p.task_id)
    .sort((a, b) => b.priority - a.priority);

  if (teamWide.length) {
    return resolveConflicts(teamWide);
  }

  return { allowed: false, reason: 'No permission rule found' };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * At the top priority level, DENY always beats PERMIT.
 * If the top-priority tier is unambiguously PERMIT → allow.
 */
function resolveConflicts(sortedPermissions) {
  const topPriority = sortedPermissions[0].priority;
  const topTier     = sortedPermissions.filter((p) => p.priority === topPriority);

  const hasDeny   = topTier.some((p) => p.type === PERMISSION_TYPES.DENY);
  const hasPermit = topTier.some((p) => p.type === PERMISSION_TYPES.PERMIT);

  if (hasDeny)   return { allowed: false, reason: 'Blocked by a DENY rule' };
  if (hasPermit) return { allowed: true,  reason: 'Granted by a PERMIT rule' };

  return { allowed: false, reason: 'No effective rule' };
}

/**
 * Collects all group IDs the user belongs to within the given team:
 * - Groups the user is explicitly a member of
 * - Groups where all_members = true (auto-includes all team members)
 */
async function resolveUserGroups(prisma, userId, teamId) {
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
async function resolveTeamFromScope(prisma, scopeType, scopeId) {
  switch (scopeType) {
    case 'team':
      return scopeId;

    case 'board': {
      const board = await prisma.board.findUnique({
        where:  { id: scopeId },
        select: { team_id: true },
      });
      return board?.team_id ?? null;
    }

    case 'list': {
      const list = await prisma.list.findUnique({
        where:  { id: scopeId },
        select: { board: { select: { team_id: true } } },
      });
      return list?.board?.team_id ?? null;
    }

    case 'task': {
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

/**
 * Like resolvePermission but walks up the scope hierarchy when no explicit
 * rule is found: task → list → board → team-wide.
 */
async function resolvePermissionWithInheritance(prisma, userId, action, scopeType, scopeId) {
  const result = await resolvePermission(prisma, userId, action, scopeType, scopeId);
  if (result.allowed || scopeType === 'board') return result;

  // Walk up one level and retry
  if (scopeType === 'task') {
    const task = await prisma.task.findUnique({
      where:  { id: scopeId },
      select: { list_id: true },
    });
    if (task) return resolvePermissionWithInheritance(prisma, userId, action, 'list', task.list_id);
  }

  if (scopeType === 'list') {
    const list = await prisma.list.findUnique({
      where:  { id: scopeId },
      select: { board_id: true },
    });
    if (list) return resolvePermission(prisma, userId, action, 'board', list.board_id);
  }

  return result;
}

module.exports = { resolvePermission, resolvePermissionWithInheritance, resolveUserGroups };

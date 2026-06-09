export const ACTIONS = {
  // Workspace
  WORKSPACE_CREATE: 'workspace:create',
  WORKSPACE_VIEW:   'workspace:view',
  WORKSPACE_MANAGE: 'workspace:manage',

  // Team
  TEAM_VIEW:           'team:view',
  TEAM_MANAGE_MEMBERS: 'team:manage_members',

  // Board
  BOARD_VIEW:          'board:view',
  BOARD_EDIT:          'board:edit',
  BOARD_UPDATE:        'board:update',
  BOARD_DELETE:        'board:delete',
  BOARD_SHARE:         'board:share',
  BOARD_MANAGE_LISTS:  'board:manage_lists',
  BOARD_MANAGE_LABELS: 'board:manage_labels',

  // History
  HISTORY_VIEW: 'history:view',

  // Task
  TASK_VIEW:          'task:view',
  TASK_CREATE:        'task:create',
  TASK_EDIT:          'task:edit',
  TASK_UPDATE:        'task:update',
  TASK_MOVE:          'task:move',
  TASK_ASSIGN_SELF:   'task:assign_self',
  TASK_DELETE:        'task:delete',
  TASK_ASSIGN_OTHERS: 'task:assign_others',

  // Comment
  COMMENT_CREATE:     'comment:create',
  COMMENT_EDIT_OWN:   'comment:edit_own',
  COMMENT_DELETE_OWN: 'comment:delete_own',
  COMMENT_DELETE_ANY: 'comment:delete_any',

  // List
  LIST_CREATE: 'list:create',
  LIST_UPDATE: 'list:update',
  LIST_DELETE: 'list:delete',

  // Checklist
  CHECKLIST_MANAGE:      'checklist:manage',
  CHECKLIST_ITEM_MUTATE: 'checklist_item:mutate',
  CHECKLIST_ITEM_TOGGLE: 'checklist_item:toggle',

  // Label
  LABEL_APPLY:  'label:apply',
  LABEL_DEFINE: 'label:define',

  // Attachment
  ATTACHMENT_UPLOAD: 'attachment:upload',
  ATTACHMENT_DELETE: 'attachment:delete',
} as const;

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

export const SCOPE_TYPES = {
  WORKSPACE: 'workspace',
  TEAM:      'team',
  BOARD:     'board',
  LIST:      'list',
  TASK:      'task',
} as const;

export type ScopeType = (typeof SCOPE_TYPES)[keyof typeof SCOPE_TYPES];

export const PERMISSION_TYPES = {
  ALLOW: 'ALLOW',
  DENY:  'DENY',
} as const;

export type PermissionTypeValue = (typeof PERMISSION_TYPES)[keyof typeof PERMISSION_TYPES];

export const SYSTEM_ADMIN_ROLE = 0;

// ── Role hierarchy ─────────────────────────────────────────────────────────────
// User.role (global system role):
//   0 = SYSTEM_ADMIN  – bypasses all permission checks
//   1 = WORKSPACE_OWNER – owns a workspace; full control within it
//   2 = WORKSPACE_ADMIN  – manages workspace settings, members, permissions
//   3 = MEMBER           – standard team member
//   4 = VIEWER           – read-only access
//
// UserTeam.role (per-team role):
//   1 = TEAM_LEAD        – manages team boards, lists, tasks, members
//   2 = TEAM_MEMBER      – creates/edits tasks, comments
//   3 = TEAM_VIEWER      – read-only
//
// TaskMember.role (per-task role):
//   1 = TASK_LEAD        – primary assignee / responsible
//   2 = TASK_CONTRIBUTOR – contributing member
export const ROLES = {
  SYSTEM: { ADMIN: 0, WORKSPACE_OWNER: 1, WORKSPACE_ADMIN: 2, MEMBER: 3, VIEWER: 4 },
  TEAM:   { LEAD: 1, MEMBER: 2, VIEWER: 3 },
  TASK:   { LEAD: 1, CONTRIBUTOR: 2 },
} as const;

// Default permissions granted to each role automatically
// (team-wide ALLOW rules with priority 5 — seeded on team/workspace creation)
export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  TEAM_LEAD:   [
    'team:view','team:manage_members',
    'board:view','board:edit','board:manage_lists','board:manage_labels',
    'task:view','task:create','task:edit','task:move',
    'history:view','comment:create','comment:edit_own','comment:delete_own',
    'checklist_item:toggle','checklist_item:mutate','attachment:upload',
  ],
  TEAM_MEMBER: [
    'team:view',
    'board:view','board:manage_lists','board:manage_labels',
    'task:view','task:create','task:edit','task:move',
    'history:view','comment:create','comment:edit_own','comment:delete_own',
    'checklist_item:toggle','checklist_item:mutate','attachment:upload',
  ],
  TEAM_VIEWER: [
    'team:view','board:view','task:view','history:view','comment:create',
  ],
};

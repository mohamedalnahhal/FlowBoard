export const ACTIONS = {
  // Workspace
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

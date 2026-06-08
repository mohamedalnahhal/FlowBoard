const ACTIONS = {
  // Board
  BOARD_VIEW:   'board:view',
  BOARD_UPDATE: 'board:update',
  BOARD_DELETE: 'board:delete',
  BOARD_SHARE:  'board:share',

  // History
  HISTORY_VIEW: 'history:view',

  // Task
  TASK_VIEW:          'task:view',
  TASK_CREATE:        'task:create',
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
};

const SCOPE_TYPES = {
  BOARD: 'board',
  LIST:  'list',
  TASK:  'task',
  TEAM:  'team',
};

const PERMISSION_TYPES = {
  PERMIT: 'PERMIT',
  DENY:   'DENY',
};

const SYSTEM_ADMIN_ROLE = 0;

module.exports = { ACTIONS, SCOPE_TYPES, PERMISSION_TYPES, SYSTEM_ADMIN_ROLE };

export const ACTION_LABELS: Record<string, string> = {
  "workspace:create": "Create Workspace",
  "workspace:view": "View Workspace",
  "workspace:manage": "Manage Workspace",
  "team:view": "View Team",
  "team:manage_members": "Manage Team Members",
  "board:view": "View Boards",
  "board:edit": "Edit Boards",
  "board:update": "Update Boards",
  "board:delete": "Delete Boards",
  "board:share": "Share Boards",
  "board:manage_lists": "Manage Lists",
  "board:manage_labels": "Manage Labels",
  "history:view": "View History",
  "task:view": "View Tasks",
  "task:create": "Create Tasks",
  "task:edit": "Edit Tasks",
  "task:update": "Update Tasks",
  "task:move": "Move Tasks",
  "task:assign_self": "Assign Self to Tasks",
  "task:delete": "Delete Tasks",
  "task:assign_others": "Assign Others to Tasks",
  "comment:create": "Create Comments",
  "comment:edit_own": "Edit Own Comments",
  "comment:delete_own": "Delete Own Comments",
  "comment:delete_any": "Delete Any Comment",
  "list:create": "Create Lists",
  "list:update": "Update Lists",
  "list:delete": "Delete Lists",
  "checklist:manage": "Manage Checklists",
  "checklist_item:mutate": "Edit Checklist Items",
  "checklist_item:toggle": "Toggle Checklist Items",
};

// Human-readable explanation of what each action grants, shown in an info
// tooltip next to the rule so admins understand the effect of a Permit/Deny.
export const ACTION_DESCRIPTIONS: Record<string, string> = {
  "workspace:create": "Create new workspaces.",
  "workspace:view": "View this workspace and its contents.",
  "workspace:manage": "Manage workspace settings, members, and permissions.",
  "team:view": "View this team, its boards, and members.",
  "team:manage_members": "Add or remove team members and manage their permissions.",
  "board:view": "Open and view boards and their tasks.",
  "board:edit": "Rename boards and change their settings.",
  "board:update": "Update board details and status.",
  "board:delete": "Permanently delete boards.",
  "board:share": "Share boards with other people.",
  "board:manage_lists": "Create, rename, reorder, and remove lists on a board.",
  "board:manage_labels": "Create and edit the labels available on a board.",
  "history:view": "View the activity and change history.",
  "task:view": "View tasks and their details.",
  "task:create": "Create new tasks.",
  "task:edit": "Edit task name, description, dates, and labels.",
  "task:update": "Update task status and fields.",
  "task:move": "Move tasks between lists or reorder them.",
  "task:assign_self": "Assign yourself to tasks.",
  "task:delete": "Delete tasks.",
  "task:assign_others": "Assign other people to tasks.",
  "comment:create": "Post comments on tasks.",
  "comment:edit_own": "Edit your own comments.",
  "comment:delete_own": "Delete your own comments.",
  "comment:delete_any": "Delete anyone's comments.",
  "list:create": "Create new lists.",
  "list:update": "Rename and update lists.",
  "list:delete": "Delete lists.",
  "checklist:manage": "Add, edit, and remove checklists on tasks.",
  "checklist_item:mutate": "Add, edit, and remove checklist items.",
  "checklist_item:toggle": "Check off and uncheck checklist items.",
  "label:apply": "Apply existing labels to tasks.",
  "label:define": "Create and edit label definitions.",
  "attachment:upload": "Upload file attachments to tasks.",
  "attachment:delete": "Delete file attachments from tasks.",
};

export function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

export function actionDescription(action: string) {
  return ACTION_DESCRIPTIONS[action] ?? "Controls access to this action.";
}

export function groupLabel(group: { all_members: boolean; id: string; name?: string | null }) {
  if (group.all_members) return "All Members";
  if (group.name?.startsWith("__personal__")) return "Personal";
  if (group.name) return group.name;
  return `Group ${group.id.slice(0, 8)}`;
}

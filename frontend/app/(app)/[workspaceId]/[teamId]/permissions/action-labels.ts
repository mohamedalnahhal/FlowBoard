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

export function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

export function groupLabel(group: { all_members: boolean; id: string; name?: string | null }) {
  if (group.all_members) return "All Members";
  if (group.name?.startsWith("__personal__")) return "Personal";
  if (group.name) return group.name;
  return `Group ${group.id.slice(0, 8)}`;
}

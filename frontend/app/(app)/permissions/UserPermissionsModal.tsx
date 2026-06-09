"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { grantUserPermissionAction, revokeUserPermissionAction, updateUserGroupsAction } from "@/lib/permissions-actions";
import { ACTION_LABELS, groupLabel } from "./action-labels";

type Person = { id: string; display_name: string; username: string; email: string | null };
type Group = { id: string; name?: string | null; all_members: boolean };
type UserPermission = {
  id: string;
  action: string;
  type: "ALLOW" | "DENY";
  priority: number;
  scope_type: string;
  scope_id: string | null;
  group: { id: string; name: string | null; all_members: boolean };
};
type Board = { id: string; name: string };

const GROUPED_ACTIONS: { label: string; actions: string[] }[] = [
  {
    label: "Team & Workspace",
    actions: ["team:view", "team:manage_members", "workspace:view", "workspace:manage"],
  },
  {
    label: "Boards",
    actions: ["board:view", "board:edit", "board:update", "board:delete", "board:share", "board:manage_lists", "board:manage_labels"],
  },
  {
    label: "Tasks",
    actions: ["task:view", "task:create", "task:edit", "task:update", "task:move", "task:delete", "task:assign_self", "task:assign_others"],
  },
  {
    label: "Lists",
    actions: ["list:create", "list:update", "list:delete"],
  },
  {
    label: "Comments & Checklists",
    actions: ["comment:create", "comment:edit_own", "comment:delete_own", "comment:delete_any", "checklist:manage", "checklist_item:mutate", "checklist_item:toggle"],
  },
  {
    label: "Other",
    actions: ["history:view"],
  },
];

function isPersonalRule(p: UserPermission) {
  return p.group.name?.startsWith("__personal__") ?? false;
}

export function UserPermissionsModal({
  teamId,
  user,
  groups,
  memberGroupIds,
  userPermissions,
  boards,
}: {
  teamId: string;
  user: Person;
  groups: Group[];
  memberGroupIds: string[];
  userPermissions: UserPermission[];
  boards: Board[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"permissions" | "groups">("permissions");
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [, startTransition] = useTransition();
  const [revoking, setRevoking] = useState<string | null>(null);
  const wasGrantingRef = useRef(false);
  const wasUpdatingGroupsRef = useRef(false);

  const grantAction = grantUserPermissionAction.bind(null, teamId, user.id);
  const [grantState, grantFormAction, grantPending] = useActionState(grantAction, undefined);

  const groupsAction = updateUserGroupsAction.bind(null, teamId, user.id);
  const [groupsState, groupsFormAction, groupsPending] = useActionState(groupsAction, undefined);

  useEffect(() => {
    if (grantPending) { wasGrantingRef.current = true; return; }
    if (wasGrantingRef.current && !grantState?.error) {
      wasGrantingRef.current = false;
      setShowGrantForm(false);
      startTransition(() => router.refresh());
    }
  }, [grantPending, grantState]);

  useEffect(() => {
    if (groupsPending) { wasUpdatingGroupsRef.current = true; return; }
    if (wasUpdatingGroupsRef.current && !groupsState?.error) {
      wasUpdatingGroupsRef.current = false;
      startTransition(() => router.refresh());
    }
  }, [groupsPending, groupsState]);

  const personalPerms = userPermissions.filter(isPersonalRule);
  const inheritedPerms = userPermissions.filter((p) => !isPersonalRule(p));

  function close() {
    setOpen(false);
    setShowGrantForm(false);
  }

  async function handleRevoke(permId: string) {
    setRevoking(permId);
    await revokeUserPermissionAction(teamId, user.id, permId);
    setRevoking(null);
    startTransition(() => router.refresh());
  }

  function scopeLabel(p: UserPermission) {
    if (p.scope_type === "team") return "Entire team";
    if (p.scope_type === "board" && p.scope_id) {
      const board = boards.find((b) => b.id === p.scope_id);
      return `Board: ${board?.name ?? p.scope_id.slice(0, 8)}`;
    }
    return p.scope_type;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-on-surface-variant hover:bg-primary/5 hover:text-primary border border-outline-variant hover:border-primary/30 transition-colors font-label-sm text-[12px]"
        aria-label={`Manage permissions for ${user.display_name}`}
      >
        <Icon name="shield" className="text-[14px]" />
        Manage
      </button>

      <Modal
        open={open}
        onClose={close}
        title="User Permissions"
        width="lg"
        footer={
          <Button variant="ghost" onClick={close} type="button">
            Close
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {/* User card */}
          <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-lg border border-outline-variant">
            <Avatar person={user} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-label-md text-label-md text-on-surface font-semibold truncate">{user.display_name}</p>
              <p className="font-body-md text-on-surface-variant text-[12px] truncate">{user.email ?? user.username}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-outline-variant">
            <button
              type="button"
              onClick={() => setActiveTab("permissions")}
              className={`px-4 py-2 font-label-md text-[13px] border-b-2 -mb-px transition-colors ${
                activeTab === "permissions"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Permissions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("groups")}
              className={`px-4 py-2 font-label-md text-[13px] border-b-2 -mb-px transition-colors ${
                activeTab === "groups"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Group Memberships
            </button>
          </div>

          {activeTab === "permissions" ? (
            <div className="flex flex-col gap-4">
              {/* Direct (personal) permissions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-label-md text-[13px] font-semibold text-on-surface">Direct Permissions</h4>
                  <button
                    type="button"
                    onClick={() => setShowGrantForm((v) => !v)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-on-primary font-label-sm text-[12px] hover:opacity-90 transition-opacity"
                  >
                    <Icon name="add" className="text-[14px]" />
                    Grant Permission
                  </button>
                </div>

                {showGrantForm && (
                  <form
                    action={grantFormAction}
                    className="mb-3 p-3 bg-surface-container-low rounded-lg border border-outline-variant flex flex-col gap-3"
                  >
                    <div className="flex flex-col gap-1">
                      <label className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wide">Permission</label>
                      <select
                        name="action"
                        required
                        className="px-2 py-1.5 text-[13px] border border-outline-variant rounded-md bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="">Select…</option>
                        {GROUPED_ACTIONS.map((group) => (
                          <optgroup key={group.label} label={group.label}>
                            {group.actions.map((a) => (
                              <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex flex-col gap-1 flex-1">
                        <label className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wide">Type</label>
                        <select
                          name="type"
                          className="px-2 py-1.5 text-[13px] border border-outline-variant rounded-md bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                          <option value="ALLOW">Allow</option>
                          <option value="DENY">Deny</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1 flex-1">
                        <label className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wide">Scope</label>
                        <select
                          name="scope_type"
                          className="px-2 py-1.5 text-[13px] border border-outline-variant rounded-md bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                          <option value="team">Entire Team</option>
                          {boards.length > 0 && <option value="board">Specific Board</option>}
                        </select>
                      </div>
                    </div>

                    {boards.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <label className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wide">Board (if board scope)</label>
                        <select
                          name="scope_id"
                          className="px-2 py-1.5 text-[13px] border border-outline-variant rounded-md bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                          <option value="">None</option>
                          {boards.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {grantState?.error && (
                      <p className="text-error text-[12px] flex items-center gap-1">
                        <Icon name="error" className="text-[14px]" />{grantState.error}
                      </p>
                    )}

                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="ghost" onClick={() => setShowGrantForm(false)} className="text-[12px] py-1">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={grantPending} className="text-[12px] py-1">
                        {grantPending ? "Granting…" : "Grant"}
                      </Button>
                    </div>
                  </form>
                )}

                {personalPerms.length === 0 && !showGrantForm ? (
                  <p className="text-[12px] text-on-surface-variant italic py-2">
                    No direct permissions — click &ldquo;Grant Permission&rdquo; to add one.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {personalPerms.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/60"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                            p.type === "ALLOW"
                              ? "bg-[#d3f0d3] text-[#1a6e1a]"
                              : "bg-[#fde8e8] text-[#9b1c1c]"
                          }`}>
                            {p.type}
                          </span>
                          <span className="font-label-sm text-[13px] text-on-surface truncate">
                            {ACTION_LABELS[p.action] ?? p.action}
                          </span>
                          <span className="text-[11px] text-on-surface-variant shrink-0">— {scopeLabel(p)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRevoke(p.id)}
                          disabled={revoking === p.id}
                          className="shrink-0 p-1 rounded hover:bg-error/10 hover:text-error text-on-surface-variant transition-colors ml-2"
                          aria-label="Revoke permission"
                        >
                          {revoking === p.id ? (
                            <Icon name="progress_activity" className="text-[14px] animate-spin" />
                          ) : (
                            <Icon name="close" className="text-[14px]" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Inherited permissions (via shared groups) */}
              {inheritedPerms.length > 0 && (
                <div>
                  <h4 className="font-label-md text-[13px] font-semibold text-on-surface mb-2">
                    Inherited via Groups
                  </h4>
                  <div className="flex flex-col gap-1">
                    {inheritedPerms.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container/40 border border-outline-variant/40"
                      >
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                          p.type === "ALLOW"
                            ? "bg-[#d3f0d3] text-[#1a6e1a]"
                            : "bg-[#fde8e8] text-[#9b1c1c]"
                        }`}>
                          {p.type}
                        </span>
                        <span className="font-label-sm text-[13px] text-on-surface truncate">
                          {ACTION_LABELS[p.action] ?? p.action}
                        </span>
                        <span className="text-[11px] text-on-surface-variant shrink-0">— {scopeLabel(p)}</span>
                        <span className="ml-auto text-[11px] text-on-surface-variant shrink-0 italic">
                          via {groupLabel(p.group)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {personalPerms.length === 0 && inheritedPerms.length === 0 && !showGrantForm && (
                <div className="flex items-start gap-2 p-3 bg-surface-container-low border border-outline-variant rounded-lg text-[12px] text-on-surface-variant">
                  <Icon name="info" className="text-[16px] text-primary shrink-0 mt-0.5" />
                  <p>
                    This user has no explicit permissions. Use <strong>Grant Permission</strong> above to add direct rules,
                    or assign them to a group in the <strong>Group Memberships</strong> tab.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Groups tab */
            <form id={`edit-groups-${user.id}`} action={groupsFormAction} className="flex flex-col gap-3">
              <input type="hidden" name="all_group_ids" value={groups.map((g) => g.id).join(",")} />

              <p className="font-body-md text-[12px] text-on-surface-variant">
                Assign this user to groups to give them the permissions those groups carry.
              </p>

              {groups.length === 0 ? (
                <p className="font-body-md text-body-md text-on-surface-variant italic text-[13px]">
                  No groups exist in this team yet. Create groups in the Groups tab first.
                </p>
              ) : (
                groups.filter((g) => !g.name?.startsWith("__personal__")).map((group) => (
                  <label
                    key={group.id}
                    className="flex items-center justify-between p-3 bg-surface-bright rounded-lg border border-outline-variant hover:border-primary transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Icon name="group" className="text-[16px] text-on-surface-variant" />
                      <span className="font-label-md text-label-md text-on-surface">{groupLabel(group)}</span>
                    </div>
                    <input
                      type="checkbox"
                      name="group_id"
                      value={group.id}
                      defaultChecked={memberGroupIds.includes(group.id)}
                      className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    />
                  </label>
                ))
              )}

              {groupsState?.error && (
                <p className="font-body-md text-[13px] text-error flex items-center gap-1">
                  <Icon name="error" className="text-[14px]" />{groupsState.error}
                </p>
              )}

              {groups.filter((g) => !g.name?.startsWith("__personal__")).length > 0 && (
                <div className="flex justify-end pt-1">
                  <Button form={`edit-groups-${user.id}`} type="submit" disabled={groupsPending}>
                    {groupsPending ? "Saving…" : "Save Groups"}
                  </Button>
                </div>
              )}
            </form>
          )}
        </div>
      </Modal>
    </>
  );
}

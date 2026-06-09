"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AvatarStack } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { deletePermissionRuleAction, togglePermissionTypeAction } from "@/lib/permissions-actions";
import { actionLabel, groupLabel } from "./action-labels";

type Person = { id: string; display_name: string; username: string; email: string | null };
type Group = { id: string; all_members: boolean; user_groups: { user: Person }[] };
type Board = { id: string; name: string };
type Permission = {
  id: string;
  action: string;
  type: "ALLOW" | "DENY";
  priority: number;
  group: { id: string; all_members: boolean };
  scope_type: "team" | "board" | "list" | "task";
  scope_id: string | null;
};

function scopeLabel(permission: Permission, boards: Board[]) {
  if (permission.scope_type === "team") return "Team-wide";
  if (permission.scope_type === "board") {
    const board = boards.find((b) => b.id === permission.scope_id);
    return board ? board.name : "Specific Board";
  }
  return permission.scope_type === "list" ? "Specific List" : "Specific Task";
}

export function PermissionsRulesTable({
  teamId,
  teamName,
  permissions,
  groups,
  boards,
}: {
  teamId: string;
  teamName: string;
  permissions: Permission[];
  groups: Group[];
  boards: Board[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleToggle(permissionId: string, currentType: "ALLOW" | "DENY") {
    if (isPending) return;
    setError(null);
    setPendingId(permissionId);
    startTransition(async () => {
      const result = await togglePermissionTypeAction(teamId, permissionId, currentType);
      setPendingId(null);
      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleDelete(permissionId: string) {
    if (isPending) return;
    setError(null);
    setPendingId(permissionId);
    startTransition(async () => {
      const result = await deletePermissionRuleAction(teamId, permissionId);
      setPendingId(null);
      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <>
      {error && (
        <div className="px-6 py-3 bg-error-container/20 text-error font-body-md text-sm flex items-center gap-2 border-b border-error-container/40">
          <Icon name="error" className="text-[16px] shrink-0" />
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-auto text-error/60 hover:text-error">
            <Icon name="close" className="text-[16px]" />
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
              <th className="px-6 py-3 font-semibold">Permission</th>
              <th className="px-6 py-3 font-semibold">Type</th>
              <th className="px-6 py-3 font-semibold">Subject</th>
              <th className="px-6 py-3 font-semibold">Scope</th>
              <th className="px-6 py-3 font-semibold text-right">Status</th>
              <th className="px-6 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60 font-body-md text-body-md text-on-surface">
            {permissions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">
                  No custom permission rules yet — create one to override the defaults.
                </td>
              </tr>
            )}
            {permissions.map((permission) => {
              const group = groups.find((g) => g.id === permission.group.id);
              const members = group?.user_groups.map((ug) => ug.user) ?? [];
              const isAllow = permission.type === "ALLOW";
              const isRowPending = pendingId === permission.id;
              return (
                <tr
                  key={permission.id}
                  className={`hover:bg-surface-container-low/40 transition-colors group ${isRowPending ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-on-surface">{actionLabel(permission.action)}</span>
                      <span className="text-on-surface-variant text-label-sm">Priority {permission.priority}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-label-sm text-label-sm font-medium border ${
                        isAllow
                          ? "bg-[#e6f4ea] text-[#137333] border-[#ceead6]"
                          : "bg-error-container/20 text-error border-error-container"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isAllow ? "bg-[#137333]" : "bg-error"}`} />
                      {isAllow ? "Permit" : "Deny"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-label-sm font-semibold text-on-surface-variant truncate max-w-[140px]">
                        {groupLabel(permission.group)}
                      </span>
                      {members.length > 0 && <AvatarStack people={members} max={3} size="xs" />}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{scopeLabel(permission, boards)}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggle(permission.id, permission.type)}
                      disabled={isPending}
                      className={`relative inline-flex items-center w-9 h-5 rounded-full transition-colors disabled:cursor-not-allowed ${isAllow ? "bg-primary" : "bg-surface-variant"}`}
                      aria-label={`Toggle ${actionLabel(permission.action)} between Permit and Deny`}
                      title={isAllow ? "Currently Permit — click to Deny" : "Currently Deny — click to Permit"}
                    >
                      <span
                        className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform ${isAllow ? "translate-x-[18px]" : "translate-x-[2px]"}`}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleDelete(permission.id)}
                      disabled={isPending}
                      className="w-8 h-8 rounded bg-error-container/20 text-error hover:bg-error hover:text-on-error transition-all duration-200 inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete Rule"
                      aria-label={`Delete rule ${actionLabel(permission.action)}`}
                    >
                      <Icon name="delete" className="text-[20px]" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-surface-bright border-t border-outline-variant/60 flex justify-between items-center text-on-surface-variant font-label-sm text-label-sm">
        <span>
          {permissions.length} {permissions.length === 1 ? "rule" : "rules"} configured for {teamName}
        </span>
      </div>
    </>
  );
}

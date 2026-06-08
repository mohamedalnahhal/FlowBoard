import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Tabs } from "@/components/ui/Tabs";
import { AvatarStack } from "@/components/ui/Avatar";
import { deletePermissionRuleAction, togglePermissionTypeAction } from "@/lib/permissions-actions";
import { CreateRuleModal } from "./CreateRuleModal";
import { EditUserGroupsModal } from "./EditUserGroupsModal";
import { actionLabel, groupLabel } from "./action-labels";

type Team = { id: string; name: string };
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
type TeamDetail = {
  id: string;
  name: string;
  boards: Board[];
  user_teams: { role: number; user: Person }[];
};

const ROLE_LABELS: Record<number, string> = { 1: "Owner", 2: "Leader", 3: "Member" };

function scopeLabel(permission: Permission, boards: Board[]) {
  if (permission.scope_type === "team") return "Team-wide";
  if (permission.scope_type === "board") {
    const board = boards.find((b) => b.id === permission.scope_id);
    return board ? board.name : "Specific Board";
  }
  return permission.scope_type === "list" ? "Specific List" : "Specific Task";
}

export default async function PermissionsPage({ searchParams }: PageProps<"/permissions">) {
  const sp = await searchParams;
  const tab = (sp.tab ?? "rules").toString() === "users" ? "users" : "rules";

  const teams = await api.get<Team[]>("/teams/mine");
  const requestedTeamId = sp.team_id?.toString();
  const team = teams.find((t) => t.id === requestedTeamId) ?? teams[0];

  if (!team) {
    return (
      <Card className="p-8 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">You are not a member of any team yet.</p>
      </Card>
    );
  }

  const tabHref = (key: string) => `/permissions?team_id=${team.id}&tab=${key}`;

  const [detail, groups] = await Promise.all([
    api.get<TeamDetail>(`/teams/${team.id}`),
    api.get<Group[]>(`/teams/${team.id}/groups`),
  ]);

  const groupSummaries = groups.map(({ id, all_members }) => ({ id, all_members }));

  let permissions: Permission[] = [];
  if (tab === "rules") {
    permissions = await api.get<Permission[]>(`/teams/${team.id}/permissions`);
  }

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-display text-on-surface mb-1">Permissions Management</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Configure access rules for <span className="font-semibold text-on-surface">{team.name}</span>.
          </p>
        </div>
        {tab === "rules" && <CreateRuleModal teamId={team.id} groups={groupSummaries} boards={detail.boards} />}
      </div>

      <div className="mb-6">
        <Tabs
          active={tab}
          tabs={[
            { key: "rules", label: "Rules", href: tabHref("rules") },
            { key: "users", label: "Users", href: tabHref("users") },
          ]}
        />
      </div>

      {tab === "rules" ? (
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-outline-variant/60">
            <h3 className="font-title-lg text-title-lg text-on-surface">Custom Permission Rules</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Fine-grained ALLOW/DENY policies targeting groups, ordered by priority.
            </p>
          </div>
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
                  return (
                    <tr key={permission.id} className="hover:bg-surface-container-low/40 transition-colors group">
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
                      <td className="px-6 py-4 text-on-surface-variant">{scopeLabel(permission, detail.boards)}</td>
                      <td className="px-6 py-4 text-right">
                        <form action={togglePermissionTypeAction.bind(null, team.id, permission.id, permission.type)}>
                          <button
                            type="submit"
                            className={`relative inline-flex items-center w-9 h-5 rounded-full transition-colors ${isAllow ? "bg-primary" : "bg-surface-variant"}`}
                            aria-label={`Toggle ${actionLabel(permission.action)} between Permit and Deny`}
                            title={isAllow ? "Currently Permit — click to Deny" : "Currently Deny — click to Permit"}
                          >
                            <span
                              className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform ${isAllow ? "translate-x-[18px]" : "translate-x-[2px]"}`}
                            />
                          </button>
                        </form>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <form action={deletePermissionRuleAction.bind(null, team.id, permission.id)} className="inline">
                          <button
                            type="submit"
                            className="w-8 h-8 rounded bg-error-container/20 text-error hover:bg-error hover:text-on-error transition-all duration-200 inline-flex items-center justify-center"
                            title="Delete Rule"
                            aria-label={`Delete rule ${actionLabel(permission.action)}`}
                          >
                            <Icon name="delete" className="text-[20px]" />
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-surface-bright border-t border-outline-variant/60 flex justify-between items-center text-on-surface-variant font-label-sm text-label-sm">
            <span>{permissions.length} {permissions.length === 1 ? "rule" : "rules"} configured for {team.name}</span>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">User</th>
                  <th className="p-4 font-semibold">Team Role</th>
                  <th className="p-4 font-semibold">Groups</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {detail.user_teams.map(({ user, role }) => {
                  const memberGroups = groups.filter((g) => g.user_groups.some((ug) => ug.user.id === user.id));
                  return (
                    <tr key={user.id} className="hover:bg-surface-container-low/40 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <AvatarStack people={[user]} max={1} size="md" />
                          <div>
                            <p className="font-label-md text-label-md text-on-surface font-semibold">{user.display_name}</p>
                            <p className="font-body-md text-on-surface-variant text-xs">{user.email ?? user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm">
                          {ROLE_LABELS[role] ?? "Member"}
                        </span>
                      </td>
                      <td className="p-4">
                        {memberGroups.length === 0 ? (
                          <span className="text-on-surface-variant text-[12px] italic">No groups</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {memberGroups.map((g) => (
                              <span key={g.id} className="inline-flex items-center px-2 py-0.5 rounded border border-outline-variant bg-surface font-body-md text-[12px] text-on-surface-variant">
                                {groupLabel(g)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <EditUserGroupsModal
                          teamId={team.id}
                          user={user}
                          groups={groupSummaries}
                          memberGroupIds={memberGroups.map((g) => g.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

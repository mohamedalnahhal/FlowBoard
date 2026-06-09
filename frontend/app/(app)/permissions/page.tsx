import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { AvatarStack } from "@/components/ui/Avatar";
import { CreateRuleModal } from "./CreateRuleModal";
import { EditUserGroupsModal } from "./EditUserGroupsModal";
import { PermissionsRulesTable } from "./PermissionsRulesTable";
import { groupLabel } from "./action-labels";

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
          <PermissionsRulesTable
            teamId={team.id}
            teamName={team.name}
            permissions={permissions}
            groups={groups}
            boards={detail.boards}
          />
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

import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { AvatarStack } from "@/components/ui/Avatar";
import { CreateRuleModal } from "./CreateRuleModal";
import { UserPermissionsModal } from "./UserPermissionsModal";
import { PermissionsRulesTable } from "./PermissionsRulesTable";
import { GroupsTab } from "./GroupsTab";
import { groupLabel } from "./action-labels";

type Team = { id: string; name: string };
type Person = { id: string; display_name: string; username: string; email: string | null };
type Group = { id: string; name?: string | null; all_members: boolean; user_groups: { user: Person }[] };
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
type UserPermission = {
  id: string;
  action: string;
  type: "ALLOW" | "DENY";
  priority: number;
  scope_type: string;
  scope_id: string | null;
  group: { id: string; name: string | null; all_members: boolean };
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
  const rawTab = (sp.tab ?? "rules").toString();
  const tab: "rules" | "users" | "groups" = rawTab === "users" ? "users" : rawTab === "groups" ? "groups" : "rules";

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

  const groupSummaries = groups.map(({ id, name, all_members }) => ({ id, name, all_members }));

  let permissions: Permission[] = [];
  if (tab === "rules") {
    permissions = await api.get<Permission[]>(`/teams/${team.id}/permissions`).catch(() => []);
  }

  // For users tab, pre-fetch each user's permissions
  let userPermissionsMap: Record<string, UserPermission[]> = {};
  if (tab === "users") {
    const results = await Promise.allSettled(
      detail.user_teams.map(async ({ user }) => {
        const perms = await api
          .get<UserPermission[]>(`/teams/${team.id}/users/${user.id}/permissions`)
          .catch(() => [] as UserPermission[]);
        return { userId: user.id, perms };
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled") {
        userPermissionsMap[r.value.userId] = r.value.perms;
      }
    }
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
            { key: "groups", label: "Groups", href: tabHref("groups") },
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
      ) : tab === "groups" ? (
        <Card className="p-6">
          <GroupsTab teamId={team.id} groups={groups} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-outline-variant/60 bg-surface-container-low">
            <p className="font-body-md text-[13px] text-on-surface-variant">
              Grant or revoke permissions per user. Click <strong className="text-on-surface">Manage</strong> to
              add direct permissions or adjust group memberships.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">User</th>
                  <th className="p-4 font-semibold">Team Role</th>
                  <th className="p-4 font-semibold">Permissions</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {detail.user_teams.map(({ user, role }) => {
                  const memberGroups = groups.filter((g) =>
                    !g.name?.startsWith("__personal__") && g.user_groups.some((ug) => ug.user.id === user.id),
                  );
                  const userPerms = userPermissionsMap[user.id] ?? [];
                  const directCount = userPerms.filter((p) => p.group.name?.startsWith("__personal__")).length;
                  const inheritedCount = userPerms.filter((p) => !p.group.name?.startsWith("__personal__")).length;

                  return (
                    <tr key={user.id} className="hover:bg-surface-container-low/40 transition-colors">
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
                        <div className="flex flex-wrap gap-1.5">
                          {directCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded border border-primary/30 bg-primary/5 font-body-md text-[12px] text-primary">
                              {directCount} direct
                            </span>
                          )}
                          {memberGroups.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded border border-outline-variant bg-surface font-body-md text-[12px] text-on-surface-variant">
                              {memberGroups.length} group{memberGroups.length !== 1 ? "s" : ""}
                            </span>
                          )}
                          {inheritedCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded border border-outline-variant bg-surface font-body-md text-[12px] text-on-surface-variant">
                              {inheritedCount} inherited
                            </span>
                          )}
                          {directCount === 0 && memberGroups.length === 0 && (
                            <span className="text-on-surface-variant text-[12px] italic">None</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <UserPermissionsModal
                          teamId={team.id}
                          user={user}
                          groups={groupSummaries}
                          memberGroupIds={memberGroups.map((g) => g.id)}
                          userPermissions={userPerms}
                          boards={detail.boards}
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

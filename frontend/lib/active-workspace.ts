"use server";
import { cookies } from "next/headers";
import { getActiveTeamId } from "./active-team";

const ACTIVE_WORKSPACE_COOKIE = "active_workspace";

export async function setActiveWorkspaceAction(workspaceId: string) {
  const jar = await cookies();
  jar.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    path:     "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 30, // 30 days
  });
}

export async function getActiveWorkspaceId(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(ACTIVE_WORKSPACE_COOKIE)?.value;
}

// Resolves the workspace the user is currently acting in: the stored choice if
// it's still in the list, otherwise the first workspace.
export async function resolveActiveWorkspace<T extends { id: string }>(workspaces: T[]): Promise<T | undefined> {
  const stored = await getActiveWorkspaceId();
  return workspaces.find((w) => w.id === stored) ?? workspaces[0];
}

// Resolves the workspace_id/team_id pair the dashboard route should point to:
// the active workspace, and within it the active team (or its first team).
export async function resolveDashboardTarget(
  workspaces: { id: string }[],
  teams: { id: string; workspace: { id: string } | null }[],
): Promise<{ workspaceId: string; teamId: string } | null> {
  const workspace = await resolveActiveWorkspace(workspaces);
  if (!workspace) return null;

  const teamsInWorkspace = teams.filter((t) => t.workspace?.id === workspace.id);
  if (teamsInWorkspace.length === 0) return null;

  const storedTeamId = await getActiveTeamId();
  const team = teamsInWorkspace.find((t) => t.id === storedTeamId) ?? teamsInWorkspace[0];

  return { workspaceId: workspace.id, teamId: team.id };
}

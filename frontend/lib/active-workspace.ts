"use server";
import { cookies } from "next/headers";
import { getActiveTeamId, getDefaultTeamId } from "./active-team";

const ACTIVE_WORKSPACE_COOKIE = "active_workspace";
const DEFAULT_WORKSPACE_COOKIE = "default_workspace";

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

// The user's preferred workspace — used as the fallback when none is actively
// selected. Passing an empty id clears it.
export async function setDefaultWorkspaceAction(workspaceId: string) {
  const jar = await cookies();
  if (!workspaceId) {
    jar.delete(DEFAULT_WORKSPACE_COOKIE);
    return;
  }
  jar.set(DEFAULT_WORKSPACE_COOKIE, workspaceId, {
    path:     "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 365, // 1 year
  });
}

export async function getDefaultWorkspaceId(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(DEFAULT_WORKSPACE_COOKIE)?.value;
}

// Resolves the workspace the user is currently acting in: the actively selected
// one, otherwise their chosen default, otherwise the first workspace.
export async function resolveActiveWorkspace<T extends { id: string }>(workspaces: T[]): Promise<T | undefined> {
  const [active, def] = await Promise.all([getActiveWorkspaceId(), getDefaultWorkspaceId()]);
  return (
    workspaces.find((w) => w.id === active) ??
    workspaces.find((w) => w.id === def) ??
    workspaces[0]
  );
}

// Resolves the workspace_id/team_id pair the dashboard route should point to:
// the active (or default) workspace, and within it the active (or default) team.
export async function resolveDashboardTarget(
  workspaces: { id: string }[],
  teams: { id: string; workspace: { id: string } | null }[],
): Promise<{ workspaceId: string; teamId: string } | null> {
  const workspace = await resolveActiveWorkspace(workspaces);
  if (!workspace) return null;

  const teamsInWorkspace = teams.filter((t) => t.workspace?.id === workspace.id);
  if (teamsInWorkspace.length === 0) return null;

  const [storedTeamId, defaultTeamId] = await Promise.all([getActiveTeamId(), getDefaultTeamId()]);
  const team =
    teamsInWorkspace.find((t) => t.id === storedTeamId) ??
    teamsInWorkspace.find((t) => t.id === defaultTeamId) ??
    teamsInWorkspace[0];

  return { workspaceId: workspace.id, teamId: team.id };
}

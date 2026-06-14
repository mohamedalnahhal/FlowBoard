"use server";
import { cookies } from "next/headers";

const ACTIVE_TEAM_COOKIE = "active_team";
const DEFAULT_TEAM_COOKIE = "default_team";

export async function setActiveTeamAction(teamId: string) {
  const jar = await cookies();
  jar.set(ACTIVE_TEAM_COOKIE, teamId, {
    path:     "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 30, // 30 days
  });
}

export async function getActiveTeamId(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(ACTIVE_TEAM_COOKIE)?.value;
}

// The user's preferred team — used as the fallback when no team is actively
// selected (fresh session, cleared cookies, etc.). Passing an empty id clears it.
export async function setDefaultTeamAction(teamId: string) {
  const jar = await cookies();
  if (!teamId) {
    jar.delete(DEFAULT_TEAM_COOKIE);
    return;
  }
  jar.set(DEFAULT_TEAM_COOKIE, teamId, {
    path:     "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 365, // 1 year
  });
}

export async function getDefaultTeamId(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(DEFAULT_TEAM_COOKIE)?.value;
}

// Resolves the team the user is currently acting in: the actively selected one,
// otherwise their chosen default, otherwise the first team.
export async function resolveActiveTeam<T extends { id: string }>(teams: T[]): Promise<T | undefined> {
  const [active, def] = await Promise.all([getActiveTeamId(), getDefaultTeamId()]);
  return teams.find((t) => t.id === active) ?? teams.find((t) => t.id === def) ?? teams[0];
}

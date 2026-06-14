"use server";
import { cookies } from "next/headers";

const ACTIVE_TEAM_COOKIE = "active_team";

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

// Resolves the team the user is currently acting in: the stored choice if
// it's still in the list, otherwise the first team.
export async function resolveActiveTeam<T extends { id: string }>(teams: T[]): Promise<T | undefined> {
  const stored = await getActiveTeamId();
  return teams.find((t) => t.id === stored) ?? teams[0];
}

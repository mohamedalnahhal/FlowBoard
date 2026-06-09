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

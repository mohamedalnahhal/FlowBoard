"use server";
import { cookies } from "next/headers";

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

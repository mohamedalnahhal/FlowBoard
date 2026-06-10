import type { Request, Response } from 'express';
import type { PrismaClient } from '@prisma/client';
import { SYSTEM_ADMIN_ROLE, ROLES } from '../core/permissions/constants.js';

/**
 * Returns the authenticated user's id, or responds 401 and returns null.
 * Shared by routers that don't go through the permission middleware.
 */
export function requireAuth(req: Request, res: Response): string | null {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthenticated' });
    return null;
  }
  return req.user.id;
}

/** Fetches the user's global system role (User.role), or null if not found. */
export async function getUserRole(prisma: PrismaClient, userId: string): Promise<number | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role ?? null;
}

export function isSystemAdmin(role: number | null): boolean {
  return role === SYSTEM_ADMIN_ROLE;
}

/** Workspace owner / admin or system admin (role 0–2). */
export function isWorkspaceAdmin(role: number | null): boolean {
  return role !== null && role <= ROLES.SYSTEM.WORKSPACE_ADMIN;
}

/** True if the user belongs to any team inside the workspace. */
export async function isWorkspaceMember(prisma: PrismaClient, userId: string, workspaceId: string): Promise<boolean> {
  const membership = await prisma.userTeam.findFirst({
    where: { user_id: userId, team: { workspace_id: workspaceId } },
    select: { user_id: true },
  });
  return membership !== null;
}

/** True if the user is a direct member of the team. */
export async function isTeamMember(prisma: PrismaClient, userId: string, teamId: string): Promise<boolean> {
  const membership = await prisma.userTeam.findUnique({
    where: { user_id_team_id: { user_id: userId, team_id: teamId } },
    select: { user_id: true },
  });
  return membership !== null;
}

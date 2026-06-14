const DASHBOARD_PATH_RE = /^\/([^/]+)\/([^/]+)(\/dashboard(?:\/.*)?)$/;

export type DashboardPath = { workspaceId: string; teamId: string; rest: string };

// Parses a pathname like /{workspaceId}/{teamId}/dashboard[...] into its
// segments, or returns null if the pathname isn't workspace/team-scoped.
export function parseDashboardPath(pathname: string): DashboardPath | null {
  const match = pathname.match(DASHBOARD_PATH_RE);
  if (!match) return null;
  return { workspaceId: match[1], teamId: match[2], rest: match[3] };
}

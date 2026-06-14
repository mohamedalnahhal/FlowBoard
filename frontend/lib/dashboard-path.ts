// Sections that live under the workspace/team-scoped URL space
// (/{workspaceId}/{teamId}/<section>). These are real navigations that read
// the active workspace + team straight from the URL.
export const SCOPED_SECTIONS = ["dashboard", "boards", "calendar", "announcements", "permissions"] as const;
export type ScopedSection = (typeof SCOPED_SECTIONS)[number];

const SCOPED_PATH_RE = new RegExp(`^/([^/]+)/([^/]+)/(${SCOPED_SECTIONS.join("|")})(/.*)?$`);

export type ScopedPath = {
  workspaceId: string;
  teamId: string;
  section: ScopedSection;
  // The section and everything after it, e.g. "/dashboard" or "/permissions".
  // Lets a team switch rebuild the URL as `/{ws}/{team}${rest}`.
  rest: string;
};

// Parses a pathname like /{workspaceId}/{teamId}/<section>[...] into its
// segments, or returns null if the pathname isn't workspace/team-scoped.
export function parseScopedPath(pathname: string): ScopedPath | null {
  const match = pathname.match(SCOPED_PATH_RE);
  if (!match) return null;
  return {
    workspaceId: match[1],
    teamId:      match[2],
    section:     match[3] as ScopedSection,
    rest:        `/${match[3]}${match[4] ?? ""}`,
  };
}

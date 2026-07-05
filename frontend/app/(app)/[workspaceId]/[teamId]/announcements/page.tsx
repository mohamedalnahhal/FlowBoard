import { notFound } from "next/navigation";
import { api, ApiError, getCurrentUser } from "@/lib/api";
import { AnnouncementsClient } from "./AnnouncementsClient";

// Backend role constants (see backend/src/core/permissions/constants.ts).
// System admin (0), workspace owner (1), and workspace admin (2) may post
// announcements when they are also workspace members.
const WORKSPACE_ADMIN_ROLE = 2;

type Workspace = { id: string; name: string };
type Team = {
  id: string;
  name: string;
  workspace: Workspace | null;
  my_role: number;
};

type Author = { id: string; display_name: string; username: string };

type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  author: Author;
};

export default async function AnnouncementsPage({
  params,
}: {
  params: Promise<{ workspaceId: string; teamId: string }>;
}) {
  const { workspaceId, teamId } = await params;

  const [user, workspaces, teams] = await Promise.all([
    getCurrentUser(),
    api.get<Workspace[]>("/workspaces"),
    api.get<Team[]>("/teams/mine"),
  ]);

  const workspace = workspaces.find((w) => w.id === workspaceId);
  const activeTeam = teams.find((t) => t.id === teamId && t.workspace?.id === workspaceId);

  if (!workspace || !activeTeam) notFound();

  let response: { items: Announcement[]; total: number };
  try {
    response = await api.get<{ items: Announcement[]; total: number }>(
      `/workspaces/${workspaceId}/announcements?limit=20&offset=0`,
    );
  } catch (err) {
    // Treat forbidden/not-found as a 404 so we don't leak workspace existence.
    if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
      notFound();
    }
    throw err;
  }

  // activeTeam is from /teams/mine, so its presence already guarantees the user
  // is a workspace member. The backend requires workspace-admin-or-better to post.
  const canPost = user !== null && user.role <= WORKSPACE_ADMIN_ROLE;

  return (
    <AnnouncementsClient
      workspaceId={workspaceId}
      teamId={teamId}
      teamName={activeTeam.name}
      announcements={response.items}
      total={response.total}
      currentUserId={user?.id}
      canPost={canPost}
      currentUserRole={user?.role ?? 4}
    />
  );
}

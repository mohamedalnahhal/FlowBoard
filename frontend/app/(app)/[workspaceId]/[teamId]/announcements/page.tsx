import { notFound } from "next/navigation";
import { api, getCurrentUser } from "@/lib/api";
import { AnnouncementsClient } from "./AnnouncementsClient";

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
  searchParams,
}: {
  params: Promise<{ workspaceId: string; teamId: string }>;
  searchParams: Promise<{ offset?: string }>;
}) {
  const { workspaceId, teamId } = await params;
  const { offset: rawOffset } = await searchParams;
  const offset = Math.max(0, parseInt(rawOffset ?? "0", 10) || 0);

  const [user, workspaces, teams, response] = await Promise.all([
    getCurrentUser(),
    api.get<Workspace[]>("/workspaces"),
    api.get<Team[]>("/teams/mine"),
    api.get<{ items: Announcement[]; total: number }>(`/workspaces/${workspaceId}/announcements?limit=20&offset=${offset}`).catch(() => ({ items: [], total: 0 })),
  ]);

  const workspace = workspaces.find((w) => w.id === workspaceId);
  const activeTeam = teams.find((t) => t.id === teamId && t.workspace?.id === workspaceId);

  if (!workspace || !activeTeam) notFound();

  const canPost = user !== null && user.role <= 2;

  return (
    <AnnouncementsClient
      workspaceId={workspaceId}
      teamId={teamId}
      teamName={activeTeam.name}
      announcements={response.items}
      offset={offset}
      total={response.total}
      currentUserId={user?.id}
      canPost={canPost}
      currentUserRole={user?.role ?? 4}
    />
  );
}

import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { BoardsClient } from "./BoardsClient";

type Team = {
  id: string;
  name: string;
  workspace: { id: string } | null;
  boards?: { id: string; name: string; status: string }[];
};

export default async function BoardsPage({
  params,
}: {
  params: Promise<{ workspaceId: string; teamId: string }>;
}) {
  const { workspaceId, teamId } = await params;

  const teams = await api.get<Team[]>("/teams/mine").catch(() => [] as Team[]);

  // The team is taken straight from the URL — switching teams is a real
  // navigation that reliably reloads the list.
  const activeTeam = teams.find((t) => t.id === teamId && t.workspace?.id === workspaceId);
  if (!activeTeam) notFound();

  const boards = (activeTeam.boards ?? []).map((b) => ({
    ...b,
    teamName: activeTeam.name,
    teamId:   activeTeam.id,
  }));

  return <BoardsClient boards={boards} teams={[{ id: activeTeam.id, name: activeTeam.name }]} />;
}

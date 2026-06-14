import { api } from "@/lib/api";
import { resolveActiveTeam } from "@/lib/active-team";
import { BoardsClient } from "./BoardsClient";

type Team = {
  id: string;
  name: string;
  boards?: { id: string; name: string; status: string }[];
};

export default async function BoardsPage({ searchParams }: PageProps<"/boards">) {
  const sp = await searchParams;
  const requestedTeamId = sp.team?.toString();

  const teams = await api.get<Team[]>("/teams/mine").catch(() => [] as Team[]);

  // The team in the URL wins (so switching teams is a real navigation that
  // reliably reloads); otherwise fall back to the stored active team.
  const activeTeam =
    (requestedTeamId && teams.find((t) => t.id === requestedTeamId)) || (await resolveActiveTeam(teams));

  const boards = (activeTeam?.boards ?? []).map((b) => ({
    ...b,
    teamName: activeTeam!.name,
    teamId:   activeTeam!.id,
  }));

  return <BoardsClient boards={boards} teams={activeTeam ? [{ id: activeTeam.id, name: activeTeam.name }] : []} />;
}

import { api } from "@/lib/api";
import { resolveActiveTeam } from "@/lib/active-team";
import { BoardsClient } from "./BoardsClient";

type Team = {
  id: string;
  name: string;
  boards?: { id: string; name: string; status: string }[];
};

export default async function BoardsPage() {
  const teams = await api.get<Team[]>("/teams/mine").catch(() => [] as Team[]);

  const activeTeam = await resolveActiveTeam(teams);

  const boards = (activeTeam?.boards ?? []).map((b) => ({
    ...b,
    teamName: activeTeam!.name,
    teamId:   activeTeam!.id,
  }));

  return <BoardsClient boards={boards} teams={activeTeam ? [{ id: activeTeam.id, name: activeTeam.name }] : []} />;
}

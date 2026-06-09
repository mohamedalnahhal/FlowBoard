import { api } from "@/lib/api";
import { BoardsClient } from "./BoardsClient";

type BoardListed = {
  id: string;
  name: string;
  status: string;
  team: { id: string; name: string };
};

export default async function BoardsPage() {
  const [boards, myTeams] = await Promise.all([
    api.get<BoardListed[]>("/boards").catch(() => [] as BoardListed[]),
    api.get<{ id: string; name: string }[]>("/teams/mine").catch(() => [] as { id: string; name: string }[]),
  ]);

  const allBoards = boards.map((b) => ({
    ...b,
    teamName: b.team.name,
    teamId:   b.team.id,
  }));

  const teamMap = new Map<string, { id: string; name: string }>();
  for (const t of myTeams) teamMap.set(t.id, t);
  for (const b of boards) if (!teamMap.has(b.team.id)) teamMap.set(b.team.id, b.team);
  const teams = Array.from(teamMap.values());

  return <BoardsClient boards={allBoards} teams={teams} />;
}

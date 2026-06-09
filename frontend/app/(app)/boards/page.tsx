import { api } from "@/lib/api";
import { BoardsClient } from "./BoardsClient";

type BoardListed = {
  id: string;
  name: string;
  status: string;
  team: { id: string; name: string };
};

export default async function BoardsPage() {
  const boards = await api.get<BoardListed[]>("/boards").catch(() => [] as BoardListed[]);

  const allBoards = boards.map((b) => ({
    ...b,
    teamName: b.team.name,
    teamId:   b.team.id,
  }));

  const teamMap = new Map<string, { id: string; name: string }>();
  for (const b of boards) teamMap.set(b.team.id, b.team);
  const teams = Array.from(teamMap.values());

  return <BoardsClient boards={allBoards} teams={teams} />;
}

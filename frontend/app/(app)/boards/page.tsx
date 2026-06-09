import { api } from "@/lib/api";
import { BoardsClient } from "./BoardsClient";

type TeamWithBoards = {
  id: string;
  name: string;
  boards: { id: string; name: string; status: string }[];
};

export default async function BoardsPage() {
  const teams = await api.get<TeamWithBoards[]>("/teams/mine").catch(() => [] as TeamWithBoards[]);

  const allBoards = teams.flatMap((t) =>
    (t.boards ?? []).map((b) => ({ ...b, teamName: t.name, teamId: t.id })),
  );

  const teamList = teams.map((t) => ({ id: t.id, name: t.name }));

  return <BoardsClient boards={allBoards} teams={teamList} />;
}

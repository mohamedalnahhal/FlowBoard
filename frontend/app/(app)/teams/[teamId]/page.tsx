import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { TeamDetailClient } from "./TeamDetailClient";

type Person = { id: string; display_name: string; username: string; email?: string };
type Board = { id: string; name: string; status: string };
type TeamDetail = {
  id: string;
  name: string;
  workspace: { id: string; name: string } | null;
  boards: Board[];
  user_teams: { role: number; user: Person }[];
};

type UserOption = { id: string; display_name: string; username: string; email: string | null };
type UsersResponse = { data: UserOption[] };

export default async function TeamDetailPage({ params }: PageProps<"/teams/[teamId]">) {
  const { teamId } = await params;

  let team: TeamDetail;
  try {
    team = await api.get<TeamDetail>(`/teams/${teamId}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) notFound();
    throw err;
  }

  const { data: allUsers } = await api
    .get<UsersResponse>("/users?page_size=200")
    .catch(() => ({ data: [] as UserOption[] }));

  return <TeamDetailClient team={team} allUsers={allUsers} />;
}

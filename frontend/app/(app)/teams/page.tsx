import { api } from "@/lib/api";
import { TeamsClient } from "./TeamsClient";

type Person = { id: string; display_name: string; username: string };
type Team = {
  id: string;
  name: string;
  description: string | null;
  workspace: { id: string; name: string } | null;
  member_count: number;
  board_count: number;
  lead: Person | null;
  members: Person[];
  created_at: string;
};

export default async function TeamsPage({ searchParams }: PageProps<"/teams">) {
  const { q } = await searchParams;
  const query = (q ?? "").toString().trim().toLowerCase();

  const [teams, workspaces] = await Promise.all([
    api.get<Team[]>("/teams"),
    api.get<{ id: string; name: string }[]>("/workspaces").catch(() => []),
  ]);

  const filtered = query ? teams.filter((t) => t.name.toLowerCase().includes(query)) : teams;

  return (
    <TeamsClient
      teams={filtered}
      workspaceId={workspaces[0]?.id ?? ""}
      initialQuery={query}
    />
  );
}

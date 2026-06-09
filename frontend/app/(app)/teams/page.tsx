import { api } from "@/lib/api";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
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

  const activeWs = await resolveActiveWorkspace(workspaces);
  const inWorkspace = activeWs ? teams.filter((t) => t.workspace?.id === activeWs.id) : teams;
  const filtered = query ? inWorkspace.filter((t) => t.name.toLowerCase().includes(query)) : inWorkspace;

  return (
    <TeamsClient
      teams={filtered}
      workspaceId={activeWs?.id ?? ""}
      initialQuery={query}
    />
  );
}

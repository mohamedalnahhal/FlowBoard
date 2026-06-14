import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { resolveDashboardTarget } from "@/lib/active-workspace";

type Workspace = { id: string; name: string };
type Team = { id: string; workspace: Workspace | null };

// The root URL always redirects into the active workspace + active team's
// dashboard (or to /teams if the user has no workspace/team yet).
export default async function RootPage() {
  const [workspaces, teams] = await Promise.all([
    api.get<Workspace[]>("/workspaces").catch(() => [] as Workspace[]),
    api.get<Team[]>("/teams/mine").catch(() => [] as Team[]),
  ]);

  const target = await resolveDashboardTarget(workspaces, teams);

  redirect(target ? `/${target.workspaceId}/${target.teamId}/dashboard` : "/teams");
}

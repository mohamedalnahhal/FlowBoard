import { api, getCurrentUser } from "@/lib/api";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
import { WorkspaceSettingsClient } from "./WorkspaceSettingsClient";

type Workspace = { id: string; name: string; created_at: string };

export default async function WorkspaceSettingsPage() {
  const [user, workspaces] = await Promise.all([
    getCurrentUser(),
    api.get<Workspace[]>("/workspaces").catch(() => [] as Workspace[]),
  ]);

  const workspace = (await resolveActiveWorkspace(workspaces)) ?? null;

  return (
    <WorkspaceSettingsClient
      workspace={workspace}
      currentUserRole={user?.role ?? 99}
    />
  );
}

import { api, getCurrentUser } from "@/lib/api";
import { WorkspaceSettingsClient } from "./WorkspaceSettingsClient";

type Workspace = { id: string; name: string; created_at: string };

export default async function WorkspaceSettingsPage() {
  const [user, workspaces] = await Promise.all([
    getCurrentUser(),
    api.get<Workspace[]>("/workspaces").catch(() => [] as Workspace[]),
  ]);

  const workspace = workspaces[0] ?? null;

  return (
    <WorkspaceSettingsClient
      workspace={workspace}
      currentUserRole={user?.role ?? 99}
    />
  );
}

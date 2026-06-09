import { api, getCurrentUser } from "@/lib/api";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
import { WorkspacePermissionsClient } from "./WorkspacePermissionsClient";

type WorkspaceMember = {
  id: string;
  display_name: string;
  username: string;
  email: string | null;
  role: number;
};

export default async function WorkspacePermissionsPage() {
  const [user, workspaces] = await Promise.all([
    getCurrentUser(),
    api.get<{ id: string; name: string }[]>("/workspaces").catch(() => [] as { id: string; name: string }[]),
  ]);

  const workspace = await resolveActiveWorkspace(workspaces);
  const members = workspace
    ? await api
        .get<WorkspaceMember[]>(`/workspaces/${workspace.id}/permissions`)
        .catch(() => [] as WorkspaceMember[])
    : ([] as WorkspaceMember[]);

  return (
    <WorkspacePermissionsClient
      members={members}
      currentUserId={user?.id ?? null}
      currentUserRole={user?.role ?? 99}
    />
  );
}

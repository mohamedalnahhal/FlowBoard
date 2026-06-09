import { api, getCurrentUser } from "@/lib/api";
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

  const workspace = workspaces[0];
  const members = workspace
    ? await api
        .get<WorkspaceMember[]>(`/workspaces/${workspace.id}/permissions`)
        .catch(() => [] as WorkspaceMember[])
    : ([] as WorkspaceMember[]);

  return (
    <WorkspacePermissionsClient
      members={members}
      currentUserRole={user?.role ?? 99}
    />
  );
}

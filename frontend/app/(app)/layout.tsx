import { redirect } from "next/navigation";
import { api, getCurrentUser } from "@/lib/api";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopHeader } from "@/components/shell/TopHeader";

type Board = { id: string; name: string; status: string };
type Workspace = { id: string; name: string };
type Team = { id: string; name: string; workspace: Workspace | null; my_role: number; boards?: Board[] };
type Notification = { id: string; message: string; link: string | null; is_read: boolean; created_at: string };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [workspaces, teams, notifications] = await Promise.all([
    api.get<Workspace[]>("/workspaces").catch(() => [] as Workspace[]),
    api.get<Team[]>("/teams/mine").catch(() => [] as Team[]),
    api.get<Notification[]>("/dashboard/notifications").catch(() => [] as Notification[]),
  ]);

  const currentWorkspaceId = workspaces[0]?.id ?? "";

  return (
    <div className="flex min-h-screen">
      <Sidebar
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspaceId}
        teams={teams.map((t) => ({ id: t.id, name: t.name, boards: t.boards }))}
        user={{ id: user.id, display_name: user.display_name, username: user.username }}
      />
      <div className="flex-1 min-w-0 flex flex-col md:ml-sidebar-width min-h-screen">
        <TopHeader
          teams={teams.map((t) => ({ id: t.id, name: t.name }))}
          notifications={notifications}
        />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-container-max mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

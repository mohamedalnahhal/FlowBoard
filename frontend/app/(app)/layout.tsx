import { redirect } from "next/navigation";
import { api, getCurrentUser } from "@/lib/api";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopHeader } from "@/components/shell/TopHeader";

type Workspace = { id: string; name: string };
type Team = { id: string; name: string; workspace: Workspace | null; my_role: number };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [workspaces, teams, notifications] = await Promise.all([
    api.get<Workspace[]>("/workspaces"),
    api.get<Team[]>("/teams/mine"),
    api.get<{ is_read: boolean }[]>("/dashboard/notifications").catch(() => []),
  ]);

  const workspaceName = workspaces[0]?.name ?? "Workspace";
  const teamName = teams[0]?.name;
  const unreadNotifications = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceName={workspaceName} user={user} />
      <div className="flex-1 flex flex-col md:ml-sidebar-width min-h-screen">
        <TopHeader teamName={teamName} unreadNotifications={unreadNotifications} />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-container-max mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

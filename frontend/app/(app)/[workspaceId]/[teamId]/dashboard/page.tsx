import Link from "next/link";
import { notFound } from "next/navigation";
import { api, getCurrentUser } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { MiniCalendar } from "../../../MiniCalendar";

type Workspace = { id: string; name: string };
type Team = { id: string; name: string; workspace: Workspace | null; my_role: number };
type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author: { id: string; display_name: string; username: string };
};
type FavoriteBoard = { id: string; name: string; status: string; team: { id: string; name: string } | null };
type CalendarEvent = { id: string; title: string; starts_at: string; ends_at: string; color: string | null };

const BOARD_ICONS = ["dashboard", "web", "campaign", "rocket_launch", "design_services", "code_blocks"];
const BOARD_TINTS = [
  "bg-primary-fixed/50 text-primary",
  "bg-tertiary-fixed/50 text-tertiary",
  "bg-secondary-container/50 text-secondary",
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ workspaceId: string; teamId: string }>;
}) {
  const { workspaceId, teamId } = await params;

  const [user, workspaces, teams] = await Promise.all([
    getCurrentUser(),
    api.get<Workspace[]>("/workspaces"),
    api.get<Team[]>("/teams/mine"),
  ]);

  const workspace = workspaces.find((w) => w.id === workspaceId);
  const activeTeam = teams.find((t) => t.id === teamId && t.workspace?.id === workspaceId);

  if (!workspace || !activeTeam) notFound();

  const [announcements, favorites, events, myTasks] = await Promise.all([
    api.get<Announcement[]>(`/dashboard/announcements?workspace_id=${workspace.id}`).catch(() => []),
    api.get<FavoriteBoard[]>(`/dashboard/favorites?team_id=${activeTeam.id}`).catch(() => []),
    api.get<CalendarEvent[]>(`/dashboard/calendar-events?team_id=${activeTeam.id}`).catch(() => []),
    api.get<{ count: number }>(`/dashboard/my-tasks-count?team_id=${activeTeam.id}`).catch(() => ({ count: 0 })),
  ]);

  const firstName = user?.display_name.split(" ")[0] ?? "there";
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const upcoming = events
    .filter((e) => new Date(e.ends_at).getTime() >= now)
    .slice(0, 4);

  return (
    <>
      <div className="mb-6 py-4">
        <h1 className="font-display text-headline-lg text-on-surface mb-2">Good morning, {firstName}</h1>
        <p className="font-body-md text-on-surface-variant">{activeTeam.name}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main column */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card hoverable className="p-6 flex flex-col justify-between group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <Icon name="check_circle" className="text-primary text-xl" />
                  <h3 className="font-label-md text-label-md font-semibold">My Tasks</h3>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Icon name="task_alt" filled />
                </div>
              </div>
              <div>
                <p className="font-display text-display text-on-surface">{myTasks.count}</p>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">Tasks assigned to you</p>
              </div>
            </Card>

            <Card hoverable className="p-6 flex flex-col justify-between group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <Icon name="star" className="text-tertiary-container text-xl" />
                  <h3 className="font-label-md text-label-md font-semibold">Favorites</h3>
                </div>
                <div className="w-10 h-10 rounded-lg bg-tertiary-fixed flex items-center justify-center text-tertiary-container group-hover:bg-tertiary-container group-hover:text-white transition-colors">
                  <Icon name="star_border" />
                </div>
              </div>
              <div>
                <p className="font-display text-display text-on-surface">{favorites.length}</p>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">Favorite boards</p>
              </div>
            </Card>
          </div>

          {/* Announcements */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-outline-variant/40">
              <h2 className="font-title-lg text-title-lg text-on-surface">Announcements</h2>
            </div>
            <div className="divide-y divide-outline-variant/40">
              {announcements.length === 0 && (
                <p className="p-4 font-body-md text-body-md text-on-surface-variant">No announcements yet.</p>
              )}
              {announcements.slice(0, 3).map((a) => (
                <div key={a.id} className="p-4 flex items-start gap-4 hover:bg-surface-container-low/40 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary-fixed/50 flex items-center justify-center flex-shrink-0">
                    <Icon name="campaign" className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-label-sm text-label-sm text-on-surface truncate">{a.title}</h4>
                    <p className="font-body-md text-[13px] text-on-surface-variant mt-1">
                      {a.author.display_name} • {formatDate(a.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/announcements"
              className="p-3 border-t border-outline-variant/40 bg-surface-bright/50 flex justify-between items-center hover:bg-surface-container-low transition-colors"
            >
              <span className="font-label-md text-[13px] text-primary">View all announcements</span>
              <Icon name="chevron_right" className="text-primary text-sm" />
            </Link>
          </Card>

          {/* Boards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-title-lg text-title-lg text-on-surface">Favorite boards</h2>
            </div>
            {favorites.length === 0 ? (
              <Card className="p-6">
                <p className="font-body-md text-body-md text-on-surface-variant">
                  No favorites yet — star a board to pin it here.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.map((board, i) => (
                  <Link key={board.id} href={`/boards/${board.id}`}>
                    <Card hoverable className="p-4 flex items-center justify-between group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${BOARD_TINTS[i % BOARD_TINTS.length]}`}>
                          <Icon name={BOARD_ICONS[i % BOARD_ICONS.length]} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-label-sm text-[13px] text-on-surface font-semibold truncate group-hover:text-primary transition-colors">
                            {board.name}
                          </h4>
                          <p className="text-[11px] text-on-surface-variant truncate">{board.team?.name}</p>
                        </div>
                      </div>
                      <Icon name="chevron_right" className="text-outline text-sm flex-shrink-0" />
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
          <MiniCalendar events={events} />

          <Card className="p-5">
            <h3 className="font-label-md text-label-md font-semibold text-on-surface mb-4">Upcoming</h3>
            {upcoming.length === 0 ? (
              <p className="font-body-md text-[13px] text-on-surface-variant">Nothing scheduled.</p>
            ) : (
              <div className="space-y-4">
                {upcoming.map((event) => (
                  <div
                    key={event.id}
                    className="flex gap-3 relative before:content-[''] before:absolute before:left-[5px] before:top-4 before:bottom-[-16px] before:w-[2px] before:bg-outline-variant/30 last:before:hidden"
                  >
                    <div
                      className="w-3 h-3 rounded-full mt-1 relative z-10 border-2 border-surface-container-lowest"
                      style={{ backgroundColor: event.color ?? "#4648d4" }}
                    />
                    <div className="min-w-0">
                      <h4 className="font-label-sm text-[13px] text-on-surface truncate">{event.title}</h4>
                      <p className="text-[11px] text-on-surface-variant">{formatEventTime(event.starts_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link href="/calendar" className="inline-block mt-4 text-[12px] font-semibold text-primary hover:underline">
              View calendar
            </Link>
          </Card>

          <div className="flex flex-col gap-2">
            <Link href="/boards" className="inline-flex items-center gap-2 w-full justify-start px-4 py-2 rounded-md border border-outline-variant bg-surface-container-lowest text-on-surface font-semibold text-label-md hover:bg-surface-container-low transition-colors shadow-sm">
              <Icon name="add" className="text-outline" /> Create Board
            </Link>
            <Link href="/boards" className="inline-flex items-center gap-2 w-full justify-start px-4 py-2 rounded-md border border-outline-variant bg-surface-container-lowest text-on-surface font-semibold text-label-md hover:bg-surface-container-low transition-colors shadow-sm">
              <Icon name="add" className="text-outline" /> Create Task
            </Link>
            <Link href="/users" className="inline-flex items-center gap-2 w-full justify-start px-4 py-2 rounded-md border border-outline-variant bg-surface-container-lowest text-on-surface font-semibold text-label-md hover:bg-surface-container-low transition-colors shadow-sm">
              <Icon name="person_add" className="text-outline" /> Invite Members
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

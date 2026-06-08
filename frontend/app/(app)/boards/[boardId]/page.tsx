import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { AvatarStack } from "@/components/ui/Avatar";
import { KanbanBoard } from "./KanbanBoard";

type Person = { id: string; display_name: string; username: string };
type Label = { id: string; name: string; color: string };
type Task = {
  id: string;
  name: string;
  status: string;
  position: number;
  start_date: string | null;
  end_date: string | null;
  checklist: { checklist_items: { status: boolean }[] } | null;
  task_members: { user: Person }[];
  task_labels: { label: Label }[];
  creator: Person;
};
type List = { id: string; name: string; tasks: Task[] };
type Board = {
  id: string;
  name: string;
  status: string;
  team: { id: string; name: string; user_teams: { role: number; user: Person }[] };
  labels: Label[];
  lists: List[];
};

const VIEW_TABS = [
  { key: "board", label: "Board", icon: "dashboard" },
  { key: "timeline", label: "Timeline", icon: "timeline" },
  { key: "calendar", label: "Calendar", icon: "calendar_month" },
  { key: "files", label: "Files", icon: "description" },
];

export default async function BoardPage({ params }: PageProps<"/boards/[boardId]">) {
  const { boardId } = await params;

  let board: Board;
  try {
    board = await api.get<Board>(`/boards/${boardId}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) notFound();
    throw err;
  }

  const members = board.team.user_teams.map((ut) => ut.user);

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-160px)] min-h-[600px] min-w-0">
      <div className="flex flex-col gap-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="font-headline-lg text-headline-lg text-on-surface">{board.name}</h1>
            <span className="font-label-sm text-label-sm text-on-surface-variant px-2 py-0.5 rounded-full bg-surface-container-high">
              {board.team.name}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {members.length > 0 && <AvatarStack people={members} max={4} />}
            <button className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-secondary hover:bg-surface-container-low transition-colors font-label-md text-label-md">
              <Icon name="filter_list" className="text-[18px]" />
              Filter
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              title={tab.key === "board" ? undefined : "Coming soon"}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-label-md text-label-md transition-colors whitespace-nowrap ${
                tab.key === "board"
                  ? "bg-primary-fixed text-on-primary-fixed-variant"
                  : "text-on-surface-variant hover:bg-surface-container-low cursor-default opacity-60"
              }`}
            >
              <Icon name={tab.icon} className="text-[18px]" filled={tab.key === "board"} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <KanbanBoard teamId={board.team.id} boardId={board.id} lists={board.lists} />
    </div>
  );
}

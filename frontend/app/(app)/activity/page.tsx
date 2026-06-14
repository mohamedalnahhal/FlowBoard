import { api } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import Link from "next/link";

type Person = { id: string; display_name: string; username: string };
type ActivityItem = {
  id: string;
  activity: string | { from?: string; to?: string; user?: string; item?: string; fields?: string[] } | null;
  type: string;
  created_at: string | null;
  user: Person;
  task: {
    id: string;
    name: string;
    list: {
      board: {
        id: string;
        name: string;
        team: { id: string; name: string };
      };
    };
  };
};

type Team = { id: string; name: string };

const TYPE_ICON: Record<string, { icon: string; color: string }> = {
  TASK_CREATED:     { icon: "add_task",       color: "text-[#137333]" },
  TASK_UPDATED:     { icon: "edit",            color: "text-primary" },
  TASK_MOVED:       { icon: "drag_pan",        color: "text-tertiary" },
  TASK_ASSIGNED:    { icon: "person_add",      color: "text-secondary" },
  TASK_UNASSIGNED:  { icon: "person_remove",   color: "text-error" },
  COMMENT_ADDED:    { icon: "chat_bubble",     color: "text-[#137333]" },
  CHECKLIST_TOGGLED:{ icon: "check_box",       color: "text-tertiary" },
  CHECKLIST_ITEM_ADDED: { icon: "checklist",   color: "text-tertiary" },
  STATUS_CHANGED:   { icon: "published_with_changes", color: "text-secondary" },
  STATUS_CHANGE:    { icon: "published_with_changes", color: "text-secondary" },
  LABEL_ADDED:      { icon: "label",           color: "text-tertiary" },
  ATTACHMENT_ADDED: { icon: "attach_file",     color: "text-on-surface-variant" },
};

function getTypeStyle(type: string) {
  return TYPE_ICON[type?.toUpperCase()] ?? { icon: "history", color: "text-on-surface-variant" };
}

// `activity` is a JSON column: either a ready-made string or a structured
// detail like { from, to } for status changes. Normalize to display text.
// Joins a list of field names into prose: ["a"] → "a", ["a","b"] → "a and b",
// ["a","b","c"] → "a, b and c".
function joinFields(fields: string[]): string {
  if (fields.length <= 1) return fields[0] ?? "";
  return `${fields.slice(0, -1).join(", ")} and ${fields[fields.length - 1]}`;
}

function describeActivity(item: ActivityItem): string {
  const a = item.activity;
  if (typeof a === "string") return a;
  if (a && typeof a === "object") {
    const { from, to, user, item: itemName, fields } = a;
    switch (item.type?.toUpperCase()) {
      case "TASK_MOVED":
        if (from && to) return `moved this task from ${from} to ${to}`;
        if (to) return `moved this task to ${to}`;
        break;
      case "TASK_ASSIGNED":
        return user ? `assigned ${user}` : "assigned a member";
      case "TASK_UNASSIGNED":
        return user ? `unassigned ${user}` : "removed a member";
      case "CHECKLIST_ITEM_ADDED":
        return itemName ? `added checklist item "${itemName}"` : "added a checklist item";
      case "TASK_UPDATED":
        return fields?.length ? `edited the ${joinFields(fields)}` : "updated the task";
    }
    if (from && to) return `changed status from ${from} to ${to}`;
    if (to) return `set status to ${to}`;
  }
  return "updated the task";
}

function formatRelative(iso: string | null) {
  if (!iso) return "";
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";
  const diff = Date.now() - time;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByDate(items: ActivityItem[]): [string, ActivityItem[]][] {
  const groups = new Map<string, ActivityItem[]>();
  for (const item of items) {
    const d = item.created_at ? new Date(item.created_at) : null;
    const valid = d && !Number.isNaN(d.getTime());
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    let key: string;
    if (!valid) key = "Recent";
    else if (d!.toDateString() === today.toDateString()) key = "Today";
    else if (d!.toDateString() === yesterday.toDateString()) key = "Yesterday";
    else key = d!.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return Array.from(groups.entries());
}

export default async function ActivityPage({ searchParams }: PageProps<"/activity">) {
  const sp = await searchParams;
  const teamId = sp.team_id?.toString();

  const [activity, teams] = await Promise.all([
    api.get<ActivityItem[]>(`/dashboard/activity${teamId ? `?team_id=${teamId}` : ""}`).catch(() => [] as ActivityItem[]),
    api.get<Team[]>("/teams/mine").catch(() => [] as Team[]),
  ]);

  const grouped = groupByDate(activity);

  return (
    <div className="max-w-[768px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-display text-on-surface mb-1">Recent Activity</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Track changes across all your boards and tasks.
          </p>
        </div>

        {/* Team filter */}
        {teams.length > 1 && (
          <div className="flex items-center gap-2">
            <a
              href="/activity"
              className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm border transition-colors ${!teamId ? "bg-primary text-on-primary border-primary" : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"}`}
            >
              All Teams
            </a>
            {teams.map((team) => (
              <a
                key={team.id}
                href={`/activity?team_id=${team.id}`}
                className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm border transition-colors ${teamId === team.id ? "bg-primary text-on-primary border-primary" : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"}`}
              >
                {team.name}
              </a>
            ))}
          </div>
        )}
      </div>

      {activity.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-on-surface-variant">
          <Icon name="history" className="text-[48px]" />
          <p className="font-body-lg text-body-lg">No activity yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {grouped.map(([date, items]) => (
            <section key={date}>
              <h2 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-4 flex items-center gap-3">
                {date}
                <span className="flex-1 h-px bg-outline-variant/40" />
                <span className="font-label-sm text-[11px] normal-case tracking-normal">{items.length} event{items.length !== 1 ? "s" : ""}</span>
              </h2>
              <div className="flex flex-col gap-3">
                {items.map((item) => {
                  const { icon, color } = getTypeStyle(item.type);
                  return (
                    <div key={item.id} className="flex items-start gap-4 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl hover:border-primary/20 transition-colors group">
                      <div className={`w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 ${color}`}>
                        <Icon name={icon} className="text-[16px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Avatar person={item.user} size="xs" />
                          <span className="font-label-md text-label-md text-on-surface font-semibold">{item.user.display_name}</span>
                          <span className="font-body-md text-body-md text-on-surface-variant">{describeActivity(item)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Link
                            href={`/boards/${item.task.list.board.id}/tasks/${item.task.id}`}
                            className="font-label-sm text-label-sm text-primary hover:underline truncate max-w-xs"
                          >
                            {item.task.name}
                          </Link>
                          <span className="text-on-surface-variant text-[11px]">in</span>
                          <Link
                            href={`/boards/${item.task.list.board.id}`}
                            className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
                          >
                            {item.task.list.board.name}
                          </Link>
                          <span className="text-on-surface-variant text-[11px]">·</span>
                          <Link
                            href={`/teams/${item.task.list.board.team.id}`}
                            className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
                          >
                            {item.task.list.board.team.name}
                          </Link>
                        </div>
                      </div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0 mt-0.5">
                        {formatRelative(item.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

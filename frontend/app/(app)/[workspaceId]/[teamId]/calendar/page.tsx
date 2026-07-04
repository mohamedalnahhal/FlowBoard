import { notFound } from "next/navigation";
import { api, getCurrentUser } from "@/lib/api";
import { CalendarClient } from "./CalendarClient";

type Workspace = { id: string; name: string };
type Team = {
  id: string;
  name: string;
  workspace: Workspace | null;
  my_role: number;
};

type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  color: string | null;
};

type TaskDeadline = {
  id: string;
  name: string;
  end_date: string;
  status: string;
  board: { id: string; name: string };
};

function getMonthGridBounds(year: number, month: number) {
  const firstOfMonth = new Date(year, month - 1, 1);
  const start = new Date(year, month - 1, 1 - firstOfMonth.getDay());
  const lastOfMonth = new Date(year, month, 0);
  const end = new Date(year, month, 6 - lastOfMonth.getDay());
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function toISOSecond(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; teamId: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { workspaceId, teamId } = await params;
  const { year: rawYear, month: rawMonth } = await searchParams;

  const [user, workspaces, teams] = await Promise.all([
    getCurrentUser(),
    api.get<Workspace[]>("/workspaces"),
    api.get<Team[]>("/teams/mine"),
  ]);

  const workspace = workspaces.find((w) => w.id === workspaceId);
  const activeTeam = teams.find((t) => t.id === teamId && t.workspace?.id === workspaceId);

  if (!workspace || !activeTeam) notFound();

  const now = new Date();
  const year = parseInt(rawYear ?? String(now.getFullYear()), 10) || now.getFullYear();
  const month = Math.min(12, Math.max(1, parseInt(rawMonth ?? String(now.getMonth() + 1), 10) || now.getMonth() + 1));

  const { start, end } = getMonthGridBounds(year, month);
  const from = toISOSecond(start);
  const to = toISOSecond(end);

  const [events, tasks] = await Promise.all([
    api.get<CalendarEvent[]>(`/teams/${teamId}/calendar-events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).catch(() => []),
    api.get<TaskDeadline[]>(`/teams/${teamId}/calendar-events/task-deadlines?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).catch(() => []),
  ]);

  const canManage =
    user !== null &&
    (user.role === 0 || user.role <= 2 || activeTeam.my_role === 1);

  return (
    <CalendarClient
      workspaceId={workspaceId}
      teamId={teamId}
      teamName={activeTeam.name}
      events={events}
      tasks={tasks}
      canManage={canManage}
      initialYear={year}
      initialMonth={month}
    />
  );
}

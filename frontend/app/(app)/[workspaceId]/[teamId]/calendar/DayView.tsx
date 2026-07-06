"use client";

import { TimeGrid } from "./TimeGrid";
import type { CalendarEvent, TaskDeadline } from "./types";

export function DayView({
  year,
  month,
  day,
  events,
  tasks,
  onEventClick,
  onTaskClick,
  onEventMove,
  onTaskMove,
  onRangeCreate,
  canManage,
}: {
  year: number;
  month: number;
  day: number;
  events: CalendarEvent[];
  tasks: TaskDeadline[];
  onEventClick: (event: CalendarEvent) => void;
  onTaskClick: (task: TaskDeadline) => void;
  onEventMove?: (eventId: string, startsAt: string, endsAt: string) => void;
  onTaskMove?: (taskId: string, boardId: string, dueDate: string) => void;
  onRangeCreate?: (start: Date, end: Date) => void;
  canManage?: boolean;
}) {
  const date = new Date(year, month - 1, day);

  return (
    <div className="flex flex-col gap-4">
      <TimeGrid
        days={[date]}
        events={events}
        tasks={tasks}
        onEventClick={onEventClick}
        onTaskClick={onTaskClick}
        onEventMove={onEventMove}
        onTaskMove={onTaskMove}
        onRangeCreate={onRangeCreate}
        canManage={canManage}
      />
    </div>
  );
}

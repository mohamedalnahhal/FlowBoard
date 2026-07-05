"use client";

import { useMemo, useState } from "react";
import { format, isSameDay, startOfDay, endOfDay, eachDayOfInterval, addDays } from "date-fns";
import { CalendarEventItem, TaskDeadlineItem } from "./CalendarEventItem";
import { toDate, eventSpansDate, taskOnDate, formatTime } from "./utils";
import { eventDragPayload, taskDragPayload, readDragPayload, formatEventDrop, formatTaskDrop } from "./dnd";
import type { CalendarEvent, TaskDeadline } from "./types";

export function AgendaView({
  year,
  month,
  day,
  events,
  tasks,
  onEventClick,
  onTaskClick,
  onEventMove,
  onTaskMove,
  canManage = false,
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
  canManage?: boolean;
}) {
  const anchor = new Date(year, month - 1, day);
  const start = startOfDay(addDays(anchor, -3));
  const end = endOfDay(addDays(anchor, 10));
  const days = eachDayOfInterval({ start, end });
  const hasAny = days.some(
    (day) => events.some((e) => eventSpansDate(e, day)) || tasks.some((t) => taskOnDate(t, day)),
  );

  return (
    <div className="flex flex-col gap-4 bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 md:p-6">
      <h2 className="font-headline-md text-headline-md text-on-surface">{format(anchor, "MMMM d, yyyy")} — Agenda</h2>
      {!hasAny && (
        <p className="text-sm text-on-surface-variant py-8 text-center">No events or deadlines in this range.</p>
      )}
      {days.map((day) => (
        <AgendaDay
          key={day.toISOString()}
          day={day}
          events={events.filter((e) => eventSpansDate(e, day))}
          tasks={tasks.filter((t) => taskOnDate(t, day))}
          onEventClick={onEventClick}
          onTaskClick={onTaskClick}
          onEventMove={onEventMove}
          onTaskMove={onTaskMove}
          canManage={canManage}
        />
      ))}
    </div>
  );
}

function AgendaDay({
  day,
  events,
  tasks,
  onEventClick,
  onTaskClick,
  onEventMove,
  onTaskMove,
  canManage,
}: {
  day: Date;
  events: CalendarEvent[];
  tasks: TaskDeadline[];
  onEventClick: (event: CalendarEvent) => void;
  onTaskClick: (task: TaskDeadline) => void;
  onEventMove?: (eventId: string, startsAt: string, endsAt: string) => void;
  onTaskMove?: (taskId: string, boardId: string, dueDate: string) => void;
  canManage: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const items = useMemo(() => {
    const eventItems = events.map((e) => ({
      type: "event" as const,
      data: e,
      sortKey: toDate(e.starts_at).getTime(),
    }));
    const taskItems = tasks.map((t) => ({
      type: "task" as const,
      data: t,
      sortKey: toDate(t.end_date).getTime(),
    }));
    return [...eventItems, ...taskItems].sort((a, b) => a.sortKey - b.sortKey);
  }, [events, tasks]);

  if (items.length === 0 && !dragOver) return null;

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const payload = readDragPayload(e.dataTransfer);
    if (!payload) return;

    if (payload.type === "event") {
      const { startsAt, endsAt } = formatEventDrop(payload, day);
      onEventMove?.(payload.eventId, startsAt, endsAt);
    } else {
      onTaskMove?.(payload.taskId, payload.boardId, formatTaskDrop(payload, day));
    }
  }

  return (
    <div
      onDragOver={(e) => {
        if (!canManage) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`border-b border-outline-variant/30 last:border-b-0 pb-4 last:pb-0 rounded-lg p-2 -mx-2 transition-colors ${
        dragOver ? "bg-primary-fixed/30 ring-2 ring-inset ring-primary" : ""
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center ${
            isSameDay(day, new Date()) ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface"
          }`}
        >
          <span className="text-[10px] uppercase font-label-sm">{format(day, "EEE")}</span>
          <span className="text-sm font-bold leading-none">{format(day, "d")}</span>
        </div>
        <span className="font-title-lg text-title-lg text-on-surface">{format(day, "MMMM d, yyyy")}</span>
      </div>
      <div className="flex flex-col gap-2 pl-[52px]">
        {items.map((item) =>
          item.type === "event" ? (
            <div key={item.data.id} className="flex items-start gap-3">
              <div className="w-16 shrink-0 text-[11px] text-on-surface-variant pt-1.5">
                {item.data.all_day ? "All day" : formatTime(item.data.starts_at)}
              </div>
              <CalendarEventItem
                event={item.data}
                draggable={canManage && !item.data.parent_event_id}
                onDragStart={(e) => {
                  setDraggingId(item.data.id);
                  e.dataTransfer.setData("application/x-taskboard-calendar-event", JSON.stringify(eventDragPayload(item.data)));
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => setDraggingId(null)}
                className={`flex-1 ${draggingId === item.data.id ? "opacity-50" : ""}`}
                onClick={() => onEventClick(item.data)}
              />
            </div>
          ) : (
            <div key={item.data.id} className="flex items-start gap-3">
              <div className="w-16 shrink-0 text-[11px] text-on-surface-variant pt-1.5">Deadline</div>
              <TaskDeadlineItem
                name={item.data.name}
                draggable={canManage}
                onDragStart={(e) => {
                  setDraggingId(item.data.id);
                  e.dataTransfer.setData("application/x-taskboard-calendar-task", JSON.stringify(taskDragPayload(item.data)));
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => setDraggingId(null)}
                className={`flex-1 ${draggingId === item.data.id ? "opacity-50" : ""}`}
                onClick={() => onTaskClick(item.data)}
              />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

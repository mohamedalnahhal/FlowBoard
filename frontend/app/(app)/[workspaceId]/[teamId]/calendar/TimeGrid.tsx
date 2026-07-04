"use client";

import { useMemo, useState } from "react";
import { format, startOfDay, addHours, eachHourOfInterval, isSameDay } from "date-fns";
import { CalendarEventItem, TaskDeadlineItem } from "./CalendarEventItem";
import { layoutDayEvents } from "./overlap";
import { toDate, eventSpansDate } from "./utils";
import { eventDragPayload, taskDragPayload, readDragPayload, formatEventDrop, formatTaskDrop } from "./dnd";
import type { CalendarEvent, TaskDeadline } from "./types";

const SLOT_HEIGHT = 48; // px per hour
const MINUTES_PER_SLOT = 60;

export function TimeGrid({
  days,
  events,
  tasks,
  onEventClick,
  onTaskClick,
  onEventMove,
  onTaskMove,
  canManage = false,
}: {
  days: Date[];
  events: CalendarEvent[];
  tasks: TaskDeadline[];
  onEventClick: (event: CalendarEvent) => void;
  onTaskClick: (task: TaskDeadline) => void;
  onEventMove?: (eventId: string, startsAt: string, endsAt: string) => void;
  onTaskMove?: (taskId: string, boardId: string, dueDate: string) => void;
  canManage?: boolean;
}) {
  const hours = useMemo(
    () => eachHourOfInterval({ start: startOfDay(new Date()), end: addHours(startOfDay(new Date()), 23) }),
    [],
  );
  const [dragOverSlot, setDragOverSlot] = useState<{ day: string; hour: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function handleDragOver(e: React.DragEvent, dayKey: string, hour: number) {
    if (!canManage) return;
    e.preventDefault();
    setDragOverSlot({ day: dayKey, hour });
  }

  function handleDrop(e: React.DragEvent, day: Date, hour: number) {
    if (!canManage) return;
    e.preventDefault();
    setDragOverSlot(null);
    const payload = readDragPayload(e.dataTransfer);
    if (!payload) return;

    if (payload.type === "event") {
      const { startsAt, endsAt } = formatEventDrop(payload, day, hour);
      onEventMove?.(payload.eventId, startsAt, endsAt);
    } else {
      onTaskMove?.(payload.taskId, payload.boardId, formatTaskDrop(day));
    }
  }

  return (
    <div className="flex flex-col h-[600px] overflow-auto border border-outline-variant/60 rounded-xl bg-surface-container-lowest">
      {/* Header row */}
      <div
        className="sticky top-0 z-10 grid bg-surface-container-lowest border-b border-outline-variant/40"
        style={{ gridTemplateColumns: `60px repeat(${days.length}, minmax(0, 1fr))` }}
      >
        <div className="border-r border-outline-variant/30" />
        {days.map((day) => (
          <div key={day.toISOString()} className="p-2 text-center border-r border-outline-variant/30 last:border-r-0">
            <div
              className={`text-sm font-body-md ${isSameDay(day, new Date()) ? "text-primary font-bold" : "text-on-surface-variant"}`}
            >
              {format(day, "EEE")}
            </div>
            <div className={`text-lg font-title-lg ${isSameDay(day, new Date()) ? "text-primary" : "text-on-surface"}`}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* All-day row */}
      <div
        className="grid border-b border-outline-variant/40 bg-surface-container-low/50"
        style={{ gridTemplateColumns: `60px repeat(${days.length}, minmax(0, 1fr))` }}
      >
        <div className="border-r border-outline-variant/30 flex items-center justify-center">
          <span className="text-[10px] text-on-surface-variant font-label-sm">All day</span>
        </div>
        {days.map((day) => {
          const allDayEvents = events.filter((e) => e.all_day && eventSpansDate(e, day));
          const dayKey = day.toISOString();
          return (
            <div
              key={dayKey}
              onDragOver={(e) => handleDragOver(e, dayKey, 0)}
              onDragLeave={() => setDragOverSlot((prev) => (prev?.day === dayKey ? null : prev))}
              onDrop={(e) => handleDrop(e, day, 0)}
              className={`border-r border-outline-variant/30 last:border-r-0 p-1 flex flex-col gap-0.5 min-h-[40px] transition-colors ${
                dragOverSlot?.day === dayKey && dragOverSlot.hour === 0 ? "bg-primary-fixed/30 ring-2 ring-inset ring-primary" : ""
              }`}
            >
              {allDayEvents.map((event) => (
                <CalendarEventItem
                  key={event.id}
                  event={event}
                  draggable={canManage}
                  onDragStart={(e) => {
                    setDraggingId(event.id);
                    e.dataTransfer.setData("application/x-taskboard-calendar-event", JSON.stringify(eventDragPayload(event)));
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => setDraggingId(null)}
                  className={draggingId === event.id ? "opacity-50" : ""}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                  compact
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Time slots */}
      <div className="relative grid" style={{ gridTemplateColumns: `60px repeat(${days.length}, minmax(0, 1fr))` }}>
        {/* Hour labels */}
        <div className="relative border-r border-outline-variant/30">
          {hours.map((hour, i) => (
            <div
              key={hour.toISOString()}
              className="absolute right-2 text-[11px] text-on-surface-variant -translate-y-1/2"
              style={{ top: i * SLOT_HEIGHT }}
            >
              {format(hour, "h a")}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => (
          <DayColumn
            key={day.toISOString()}
            day={day}
            hours={hours}
            events={events.filter((e) => !e.all_day && eventSpansDate(e, day))}
            tasks={tasks.filter((t) => isSameDay(toDate(t.end_date), day))}
            onEventClick={onEventClick}
            onTaskClick={onTaskClick}
            onEventMove={onEventMove}
            onTaskMove={onTaskMove}
            canManage={canManage}
            dragOverSlot={dragOverSlot}
            setDragOverSlot={setDragOverSlot}
            draggingId={draggingId}
            setDraggingId={setDraggingId}
          />
        ))}
      </div>
    </div>
  );
}

function DayColumn({
  day,
  hours,
  events,
  tasks,
  onEventClick,
  onTaskClick,
  onEventMove,
  onTaskMove,
  canManage,
  dragOverSlot,
  setDragOverSlot,
  draggingId,
  setDraggingId,
}: {
  day: Date;
  hours: Date[];
  events: CalendarEvent[];
  tasks: TaskDeadline[];
  onEventClick: (event: CalendarEvent) => void;
  onTaskClick: (task: TaskDeadline) => void;
  onEventMove?: (eventId: string, startsAt: string, endsAt: string) => void;
  onTaskMove?: (taskId: string, boardId: string, dueDate: string) => void;
  canManage: boolean;
  dragOverSlot: { day: string; hour: number } | null;
  setDragOverSlot: React.Dispatch<React.SetStateAction<{ day: string; hour: number } | null>>;
  draggingId: string | null;
  setDraggingId: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const positioned = useMemo(
    () => layoutDayEvents(events, { slotHeight: SLOT_HEIGHT / MINUTES_PER_SLOT }),
    [events],
  );

  const dayKey = day.toISOString();
  const hasContent = events.length > 0 || tasks.length > 0;

  function handleDragOver(e: React.DragEvent, hour: number) {
    if (!canManage) return;
    e.preventDefault();
    setDragOverSlot({ day: dayKey, hour });
  }

  function handleDrop(e: React.DragEvent, hour: number) {
    if (!canManage) return;
    e.preventDefault();
    setDragOverSlot(null);
    const payload = readDragPayload(e.dataTransfer);
    if (!payload) return;

    if (payload.type === "event") {
      const { startsAt, endsAt } = formatEventDrop(payload, day, hour);
      onEventMove?.(payload.eventId, startsAt, endsAt);
    } else {
      onTaskMove?.(payload.taskId, payload.boardId, formatTaskDrop(day));
    }
  }

  return (
    <div className="relative border-r border-outline-variant/30 last:border-r-0" style={{ minHeight: 24 * SLOT_HEIGHT }}>
      {/* Hour grid lines / drop zones */}
      {hours.map((hour, i) => {
        const isDragOver = dragOverSlot?.day === dayKey && dragOverSlot.hour === i;
        return (
          <div
            key={hour.toISOString()}
            onDragOver={(e) => handleDragOver(e, i)}
            onDragLeave={() => setDragOverSlot((prev) => (prev?.day === dayKey ? null : prev))}
            onDrop={(e) => handleDrop(e, i)}
            className={`absolute left-0 right-0 border-b border-outline-variant/20 transition-colors ${
              isDragOver ? "bg-primary-fixed/30" : ""
            }`}
            style={{ top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
          />
        );
      })}

      {/* Empty state */}
      {!hasContent && (
        <div className="absolute inset-0 flex items-center justify-center text-[11px] text-on-surface-variant/60 pointer-events-none">
          No events
        </div>
      )}

      {/* Positioned events */}
      {positioned.map(({ event, top, height, left, width }) => (
        <div
          key={event.id}
          className="absolute px-0.5"
          style={{
            top,
            height,
            left: `${left * 100}%`,
            width: `${width * 100}%`,
          }}
        >
          <CalendarEventItem
            event={event}
            draggable={canManage}
            onDragStart={(e) => {
              setDraggingId(event.id);
              e.dataTransfer.setData("application/x-taskboard-calendar-event", JSON.stringify(eventDragPayload(event)));
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => setDraggingId(null)}
            className={`h-full w-full text-[10px] leading-tight ${draggingId === event.id ? "opacity-50" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick(event);
            }}
          />
        </div>
      ))}

      {/* Task deadlines (placed at bottom of column) */}
      {tasks.length > 0 && (
        <div className="absolute bottom-1 left-1 right-1 flex flex-col gap-1">
          {tasks.map((task) => (
            <TaskDeadlineItem
              key={task.id}
              name={task.name}
              draggable={canManage}
              onDragStart={(e) => {
                setDraggingId(task.id);
                e.dataTransfer.setData("application/x-taskboard-calendar-task", JSON.stringify(taskDragPayload(task)));
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => setDraggingId(null)}
              className={draggingId === task.id ? "opacity-50" : ""}
              onClick={(e) => {
                e.stopPropagation();
                onTaskClick(task);
              }}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}

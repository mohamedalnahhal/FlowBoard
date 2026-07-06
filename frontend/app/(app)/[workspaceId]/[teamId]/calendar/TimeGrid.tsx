"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, startOfDay, addHours, eachHourOfInterval, isSameDay } from "date-fns";
import { CalendarEventItem, TaskDeadlineItem } from "./CalendarEventItem";
import { layoutDayEvents } from "./overlap";
import { toDate, eventSpansDate } from "./utils";
import { eventDragPayload, taskDragPayload, readDragPayload, formatEventDrop, formatTaskDrop } from "./dnd";
import type { CalendarEvent, TaskDeadline } from "./types";

const SLOT_HEIGHT = 48; // px per hour
const MINUTES_PER_SLOT = 60;
const PX_PER_MIN = SLOT_HEIGHT / 60;
const SNAP_MIN = 15; // click-drag creation snaps to 15-minute increments
const CLICK_DURATION_MIN = 60; // a plain click (no drag) creates a 1-hour event

function minutesSinceMidnight(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function formatMinutes(min: number) {
  const d = new Date();
  d.setHours(Math.floor(min / 60), min % 60, 0, 0);
  return format(d, "h:mm a");
}

// Ticking clock for the current-time indicator; re-renders every minute.
function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function TimeGrid({
  days,
  events,
  tasks,
  onEventClick,
  onTaskClick,
  onEventMove,
  onTaskMove,
  onRangeCreate,
  canManage = false,
}: {
  days: Date[];
  events: CalendarEvent[];
  tasks: TaskDeadline[];
  onEventClick: (event: CalendarEvent, anchor?: DOMRect) => void;
  onTaskClick: (task: TaskDeadline) => void;
  onEventMove?: (eventId: string, startsAt: string, endsAt: string) => void;
  onTaskMove?: (taskId: string, boardId: string, dueDate: string) => void;
  onRangeCreate?: (start: Date, end: Date) => void;
  canManage?: boolean;
}) {
  const hours = useMemo(
    () => eachHourOfInterval({ start: startOfDay(new Date()), end: addHours(startOfDay(new Date()), 23) }),
    [],
  );
  const now = useNow();
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ day: string; hour: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // On first render, scroll so the current time sits ~1/3 down the viewport,
  // landing on business hours like Google Calendar instead of at midnight.
  useEffect(() => {
    const container = scrollRef.current;
    const grid = gridRef.current;
    if (!container || !grid) return;
    const gridTop = grid.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
    container.scrollTop = Math.max(0, gridTop + minutesSinceMidnight(new Date()) * PX_PER_MIN - container.clientHeight / 3);
  }, []);

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
      onTaskMove?.(payload.taskId, payload.boardId, formatTaskDrop(payload, day));
    }
  }

  return (
    <div ref={scrollRef} className="flex flex-col h-[600px] overflow-auto border border-outline-variant/60 rounded-xl bg-surface-container-lowest">
      {/* Header row */}
      <div
        className="sticky top-0 z-30 grid bg-surface-container-lowest border-b border-outline-variant/40"
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
                  draggable={canManage && !event.parent_event_id}
                  onDragStart={(e) => {
                    setDraggingId(event.id);
                    e.dataTransfer.setData("application/x-taskboard-calendar-event", JSON.stringify(eventDragPayload(event)));
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => setDraggingId(null)}
                  className={draggingId === event.id ? "opacity-50" : ""}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event, e.currentTarget.getBoundingClientRect());
                  }}
                  compact
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Time slots */}
      <div ref={gridRef} className="relative grid" style={{ gridTemplateColumns: `60px repeat(${days.length}, minmax(0, 1fr))` }}>
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
            now={now}
            events={events.filter((e) => !e.all_day && eventSpansDate(e, day))}
            tasks={tasks.filter((t) => isSameDay(toDate(t.end_date), day))}
            onEventClick={onEventClick}
            onTaskClick={onTaskClick}
            onEventMove={onEventMove}
            onTaskMove={onTaskMove}
            onRangeCreate={onRangeCreate}
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
  now,
  events,
  tasks,
  onEventClick,
  onTaskClick,
  onEventMove,
  onTaskMove,
  onRangeCreate,
  canManage,
  dragOverSlot,
  setDragOverSlot,
  draggingId,
  setDraggingId,
}: {
  day: Date;
  hours: Date[];
  now: Date;
  events: CalendarEvent[];
  tasks: TaskDeadline[];
  onEventClick: (event: CalendarEvent, anchor?: DOMRect) => void;
  onTaskClick: (task: TaskDeadline) => void;
  onEventMove?: (eventId: string, startsAt: string, endsAt: string) => void;
  onTaskMove?: (taskId: string, boardId: string, dueDate: string) => void;
  onRangeCreate?: (start: Date, end: Date) => void;
  canManage: boolean;
  dragOverSlot: { day: string; hour: number } | null;
  setDragOverSlot: React.Dispatch<React.SetStateAction<{ day: string; hour: number } | null>>;
  draggingId: string | null;
  setDraggingId: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const positioned = useMemo(
    () => layoutDayEvents(events, day, { slotHeight: SLOT_HEIGHT / MINUTES_PER_SLOT }),
    [events, day],
  );

  const dayKey = day.toISOString();
  const hasContent = events.length > 0 || tasks.length > 0;
  const canCreate = canManage && !!onRangeCreate;

  // Click-drag-to-create selection state. `sel` drives the ghost block; the
  // refs hold the live values the window mouseup handler reads without stale
  // closures.
  const colRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<number | null>(null);
  const selRef = useRef<{ startMin: number; endMin: number } | null>(null);
  const movedRef = useRef(false);
  const [sel, setSelState] = useState<{ startMin: number; endMin: number } | null>(null);
  const [selecting, setSelecting] = useState(false);

  const setSel = (next: { startMin: number; endMin: number } | null) => {
    selRef.current = next;
    setSelState(next);
  };

  function yToMinutes(clientY: number) {
    const el = colRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const raw = (clientY - rect.top) / PX_PER_MIN;
    const snapped = Math.round(raw / SNAP_MIN) * SNAP_MIN;
    return Math.max(0, Math.min(24 * 60, snapped));
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (!canCreate || e.button !== 0) return;
    // Ignore mousedowns that start on an existing event/task — let them handle
    // their own click/drag instead of starting a new-event selection.
    if ((e.target as HTMLElement).closest("[data-cal-item]")) return;
    e.preventDefault();
    const start = yToMinutes(e.clientY);
    anchorRef.current = start;
    movedRef.current = false;
    setSel({ startMin: start, endMin: Math.min(24 * 60, start + SNAP_MIN) });
    setSelecting(true);
  }

  useEffect(() => {
    if (!selecting) return;
    function onMove(e: MouseEvent) {
      const anchor = anchorRef.current;
      if (anchor == null) return;
      movedRef.current = true;
      const cur = yToMinutes(e.clientY);
      const startMin = Math.min(anchor, cur);
      let endMin = Math.max(anchor, cur);
      if (endMin - startMin < SNAP_MIN) endMin = Math.min(24 * 60, startMin + SNAP_MIN);
      setSel({ startMin, endMin });
    }
    function onUp() {
      const final = selRef.current;
      const moved = movedRef.current;
      setSelecting(false);
      setSel(null);
      anchorRef.current = null;
      movedRef.current = false;
      if (!final || !onRangeCreate) return;
      const startMin = final.startMin;
      const durationMin = moved ? final.endMin - final.startMin : CLICK_DURATION_MIN;
      if (durationMin < SNAP_MIN) return;
      const midnight = new Date(day);
      midnight.setHours(0, 0, 0, 0);
      const startD = new Date(midnight.getTime() + startMin * 60000);
      const endD = new Date(midnight.getTime() + (startMin + durationMin) * 60000);
      onRangeCreate(startD, endD);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [selecting, day, onRangeCreate]);

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
      onTaskMove?.(payload.taskId, payload.boardId, formatTaskDrop(payload, day));
    }
  }

  const showNow = isSameDay(day, now);
  const nowTop = minutesSinceMidnight(now) * PX_PER_MIN;

  return (
    <div
      ref={colRef}
      onMouseDown={handleMouseDown}
      className={`relative border-r border-outline-variant/30 last:border-r-0 ${canCreate ? "cursor-cell select-none" : ""}`}
      style={{ minHeight: 24 * SLOT_HEIGHT }}
    >
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

      {/* Click-drag selection ghost */}
      {sel && (
        <div
          className="absolute left-0.5 right-0.5 z-10 rounded-md bg-primary/25 border border-primary pointer-events-none overflow-hidden"
          style={{
            top: sel.startMin * PX_PER_MIN,
            height: Math.max(SNAP_MIN * PX_PER_MIN, (sel.endMin - sel.startMin) * PX_PER_MIN),
          }}
        >
          <span className="block px-1 pt-0.5 text-[10px] font-medium text-primary leading-tight">
            {formatMinutes(sel.startMin)} – {formatMinutes(sel.endMin)}
          </span>
        </div>
      )}

      {/* Positioned events */}
      {positioned.map(({ event, top, height, left, width }) => (
        <div
          key={event.id}
          data-cal-item
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
            draggable={canManage && !event.parent_event_id}
            onDragStart={(e) => {
              setDraggingId(event.id);
              e.dataTransfer.setData("application/x-taskboard-calendar-event", JSON.stringify(eventDragPayload(event)));
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => setDraggingId(null)}
            className={`h-full w-full text-[10px] leading-tight ${draggingId === event.id ? "opacity-50" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick(event, e.currentTarget.getBoundingClientRect());
            }}
          />
        </div>
      ))}

      {/* Task deadlines (placed at bottom of column) */}
      {tasks.length > 0 && (
        <div data-cal-item className="absolute bottom-1 left-1 right-1 flex flex-col gap-1">
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

      {/* Current-time indicator */}
      {showNow && (
        <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: nowTop }}>
          <div className="relative flex items-center">
            <span className="absolute -left-1 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-error" />
            <span className="h-px w-full bg-error" />
          </div>
        </div>
      )}
    </div>
  );
}

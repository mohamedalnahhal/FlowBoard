"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { CalendarEventItem, TaskDeadlineItem } from "./CalendarEventItem";
import { getMonthCells, eventSpansDate, taskOnDate, WEEKDAY_LABELS, toDate } from "./utils";
import { eventDragPayload, taskDragPayload, readDragPayload, formatEventDrop, formatTaskDrop } from "./dnd";
import type { CalendarEvent, TaskDeadline, CalendarItem } from "./types";

const MAX_VISIBLE = 3;

export function MonthView({
  year,
  month,
  events,
  tasks,
  canManage,
  onCreate,
  onEventClick,
  onTaskClick,
  onEventMove,
  onTaskMove,
}: {
  year: number;
  month: number;
  events: CalendarEvent[];
  tasks: TaskDeadline[];
  canManage: boolean;
  onCreate: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onTaskClick: (task: TaskDeadline) => void;
  onEventMove?: (eventId: string, startsAt: string, endsAt: string) => void;
  onTaskMove?: (taskId: string, boardId: string, dueDate: string) => void;
}) {
  const cells = getMonthCells(year, month);
  const [popoverDate, setPopoverDate] = useState<Date | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function handleDragOver(e: React.DragEvent, key: string) {
    if (!canManage) return;
    e.preventDefault();
    setDragOverCell(key);
  }

  function handleDrop(e: React.DragEvent, date: Date) {
    if (!canManage) return;
    e.preventDefault();
    setDragOverCell(null);
    const payload = readDragPayload(e.dataTransfer);
    if (!payload) return;

    if (payload.type === "event") {
      const { startsAt, endsAt } = formatEventDrop(payload, date);
      onEventMove?.(payload.eventId, startsAt, endsAt);
    } else {
      onTaskMove?.(payload.taskId, payload.boardId, formatTaskDrop(payload, date));
    }
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-sm overflow-hidden">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-outline-variant/40" role="row">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="p-3 text-center font-label-md text-label-md text-on-surface-variant" role="columnheader">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 auto-rows-fr" role="grid">
        {cells.map((cell, i) => {
          const key = `${year}-${month}-${i}`;
          const dayEvents = events
            .filter((e) => eventSpansDate(e, cell.date))
            .sort((a, b) => toDate(a.starts_at).getTime() - toDate(b.starts_at).getTime());
          const dayTasks = tasks.filter((t) => taskOnDate(t, cell.date));
          const items: CalendarItem[] = [
            ...dayEvents.map((e) => ({ type: "event" as const, data: e })),
            ...dayTasks.map((t) => ({ type: "task" as const, data: t })),
          ];
          const visible = items.slice(0, MAX_VISIBLE);
          const overflow = items.length - visible.length;
          const isDragOver = dragOverCell === key;

          return (
            <div
              key={i}
              onClick={() => canManage && onCreate(cell.date)}
              onDragOver={(e) => handleDragOver(e, key)}
              onDragLeave={() => setDragOverCell((prev) => (prev === key ? null : prev))}
              onDrop={(e) => handleDrop(e, cell.date)}
              className={`min-h-[120px] p-2 border-b border-r border-outline-variant/30 flex flex-col gap-1 transition-colors ${
                cell.currentMonth ? "bg-surface-container-lowest" : "bg-surface-container-low/40"
              } ${canManage ? "cursor-pointer hover:bg-surface-container-low" : ""} ${
                cell.isToday ? "bg-primary-fixed/20" : ""
              } ${isDragOver ? "ring-2 ring-inset ring-primary bg-primary-fixed/30" : ""}`}
              role="gridcell"
              aria-label={cell.date.toDateString()}
            >
              <div className="flex justify-between items-center">
                <span
                  className={`text-sm font-body-md w-7 h-7 flex items-center justify-center rounded-full ${
                    cell.isToday
                      ? "bg-primary text-on-primary font-bold"
                      : cell.currentMonth
                        ? "text-on-surface"
                        : "text-outline-variant"
                  }`}
                >
                  {cell.date.getDate()}
                </span>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                {visible.map((item) =>
                  item.type === "event" ? (
                    <CalendarEventItem
                      key={`evt-${item.data.id}`}
                      event={item.data}
                      draggable={canManage && !item.data.parent_event_id}
                      onDragStart={(e) => {
                        setDraggingId(item.data.id);
                        e.dataTransfer.setData("application/x-taskboard-calendar-event", JSON.stringify(eventDragPayload(item.data)));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      className={draggingId === item.data.id ? "opacity-50" : ""}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(item.data);
                      }}
                      compact
                    />
                  ) : (
                    <TaskDeadlineItem
                      key={`task-${item.data.id}`}
                      name={item.data.name}
                      draggable={canManage}
                      onDragStart={(e) => {
                        setDraggingId(item.data.id);
                        e.dataTransfer.setData("application/x-taskboard-calendar-task", JSON.stringify(taskDragPayload(item.data)));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      className={draggingId === item.data.id ? "opacity-50" : ""}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskClick(item.data);
                      }}
                      compact
                    />
                  ),
                )}
                {overflow > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPopoverDate(cell.date);
                    }}
                    className="text-[11px] text-left text-on-surface-variant px-1 hover:text-on-surface"
                  >
                    +{overflow} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {popoverDate && (
        <DayPopover
          date={popoverDate}
          events={events.filter((e) => eventSpansDate(e, popoverDate))}
          tasks={tasks.filter((t) => taskOnDate(t, popoverDate))}
          onClose={() => setPopoverDate(null)}
          onEventClick={onEventClick}
          onTaskClick={onTaskClick}
          canManage={canManage}
          onEventMove={onEventMove}
          onTaskMove={onTaskMove}
        />
      )}
    </div>
  );
}

function DayPopover({
  date,
  events,
  tasks,
  onClose,
  onEventClick,
  onTaskClick,
  canManage,
  onEventMove,
  onTaskMove,
}: {
  date: Date;
  events: CalendarEvent[];
  tasks: TaskDeadline[];
  onClose: () => void;
  onEventClick: (event: CalendarEvent) => void;
  onTaskClick: (task: TaskDeadline) => void;
  canManage: boolean;
  onEventMove?: (eventId: string, startsAt: string, endsAt: string) => void;
  onTaskMove?: (taskId: string, boardId: string, dueDate: string) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const payload = readDragPayload(e.dataTransfer);
    if (!payload) return;

    if (payload.type === "event") {
      const { startsAt, endsAt } = formatEventDrop(payload, date);
      onEventMove?.(payload.eventId, startsAt, endsAt);
    } else {
      onTaskMove?.(payload.taskId, payload.boardId, formatTaskDrop(payload, date));
    }
  }

  const items: CalendarItem[] = [
    ...events
      .sort((a, b) => toDate(a.starts_at).getTime() - toDate(b.starts_at).getTime())
      .map((e) => ({ type: "event" as const, data: e })),
    ...tasks.map((t) => ({ type: "task" as const, data: t })),
  ];

  return (
    <Modal open onClose={onClose} title={date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} width="sm">
      <div
        onDragOver={(e) => {
          if (!canManage) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col gap-2 max-h-[60vh] overflow-auto rounded-lg p-2 -m-2 transition-colors ${dragOver ? "bg-primary-fixed/30 ring-2 ring-inset ring-primary" : ""}`}
      >
        {items.length === 0 && <p className="text-sm text-on-surface-variant py-4 text-center">No events or deadlines.</p>}
        {items.map((item) =>
          item.type === "event" ? (
            <CalendarEventItem
              key={item.data.id}
              event={item.data}
              draggable={canManage && !item.data.parent_event_id}
              onDragStart={(e) => {
                setDraggingId(item.data.id);
                e.dataTransfer.setData("application/x-taskboard-calendar-event", JSON.stringify(eventDragPayload(item.data)));
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => setDraggingId(null)}
              className={draggingId === item.data.id ? "opacity-50" : ""}
              onClick={() => {
                onEventClick(item.data);
                onClose();
              }}
            />
          ) : (
            <button
              key={item.data.id}
              type="button"
              draggable={canManage}
              onDragStart={(e) => {
                setDraggingId(item.data.id);
                e.dataTransfer.setData("application/x-taskboard-calendar-task", JSON.stringify(taskDragPayload(item.data)));
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => setDraggingId(null)}
              onClick={() => {
                onTaskClick(item.data);
                onClose();
              }}
              className={`flex items-center gap-2 px-2 py-1.5 rounded border border-dashed border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low text-left w-full ${
                canManage ? "cursor-grab active:cursor-grabbing" : ""
              } ${draggingId === item.data.id ? "opacity-50" : ""}`}
            >
              <Icon name="task_alt" className="text-sm text-on-surface-variant" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">{item.data.name}</span>
                <span className="text-[10px] text-on-surface-variant">{item.data.board.name}</span>
              </div>
            </button>
          ),
        )}
      </div>
    </Modal>
  );
}

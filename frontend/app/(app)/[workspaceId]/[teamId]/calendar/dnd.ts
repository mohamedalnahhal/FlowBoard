import { formatISO, parseISO, setHours, setMinutes, startOfDay } from "date-fns";
import type { CalendarEvent, TaskDeadline } from "./types";

export const DND_TYPE_EVENT = "application/x-taskboard-calendar-event";
export const DND_TYPE_TASK = "application/x-taskboard-calendar-task";

export type DragPayload =
  | { type: "event"; eventId: string; durationMinutes: number; sourceAllDay: boolean; sourceHour: number; sourceMinute: number }
  | { type: "task"; taskId: string; boardId: string; sourceHour: number; sourceMinute: number };

export function eventDragPayload(event: CalendarEvent): DragPayload {
  const start = parseISO(event.starts_at);
  const end = parseISO(event.ends_at);
  const durationMinutes = Math.max(0, (end.getTime() - start.getTime()) / 60000);
  return {
    type: "event",
    eventId: event.id,
    durationMinutes,
    sourceAllDay: event.all_day,
    sourceHour: start.getHours(),
    sourceMinute: start.getMinutes(),
  };
}

export function taskDragPayload(task: TaskDeadline): DragPayload {
  const due = parseISO(task.end_date);
  return {
    type: "task",
    taskId: task.id,
    boardId: task.board.id,
    sourceHour: due.getHours(),
    sourceMinute: due.getMinutes(),
  };
}

export function readDragPayload(dataTransfer: DataTransfer): DragPayload | null {
  const eventData = dataTransfer.getData(DND_TYPE_EVENT);
  if (eventData) {
    try {
      const parsed = JSON.parse(eventData);
      if (parsed.type === "event" && parsed.eventId) return parsed as DragPayload;
    } catch {
      // ignore
    }
  }
  const taskData = dataTransfer.getData(DND_TYPE_TASK);
  if (taskData) {
    try {
      const parsed = JSON.parse(taskData);
      if (parsed.type === "task" && parsed.taskId && parsed.boardId) return parsed as DragPayload;
    } catch {
      // ignore
    }
  }
  return null;
}

export function formatEventDrop(
  payload: Extract<DragPayload, { type: "event" }>,
  targetDate: Date,
  targetHour?: number,
): { startsAt: string; endsAt: string } {
  let start: Date;
  if (targetHour !== undefined) {
    start = setMinutes(setHours(startOfDay(targetDate), targetHour), 0);
  } else {
    // Dropping on a day cell: preserve the original time-of-day.
    start = setMinutes(setHours(startOfDay(targetDate), payload.sourceHour), payload.sourceMinute);
  }
  const end = new Date(start.getTime() + payload.durationMinutes * 60000);
  return { startsAt: formatISO(start), endsAt: formatISO(end) };
}

export function formatTaskDrop(
  payload: Extract<DragPayload, { type: "task" }>,
  targetDate: Date,
): string {
  // Preserve the task's original time-of-day; only the date changes.
  const due = setMinutes(setHours(startOfDay(targetDate), payload.sourceHour), payload.sourceMinute);
  return formatISO(due);
}

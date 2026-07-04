"use client";

import { formatTime } from "./utils";
import type { CalendarEvent } from "./types";

export function CalendarEventItem({
  event,
  onClick,
  compact = false,
  className = "",
  draggable = false,
  onDragStart,
  onDragEnd,
}: {
  event: CalendarEvent;
  onClick?: (e: React.MouseEvent) => void;
  compact?: boolean;
  className?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}) {
  const backgroundColor = event.color ?? "#4648d4";
  const isAllDay = event.all_day;

  return (
    <button
      type="button"
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`text-left truncate rounded border border-transparent hover:brightness-95 transition-all ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      } ${compact ? "px-2 py-1 text-[11px] font-medium" : "px-2 py-1.5 text-xs font-medium"} ${className}`}
      style={{ backgroundColor, color: "#fff" }}
      title={event.title}
    >
      {!isAllDay && !compact && <span className="mr-1 opacity-90">{formatTime(event.starts_at)}</span>}
      {isAllDay && !compact && <span className="mr-1 opacity-90">All day</span>}
      <span>{event.title}</span>
    </button>
  );
}

export function TaskDeadlineItem({
  name,
  onClick,
  compact = false,
  className = "",
  draggable = false,
  onDragStart,
  onDragEnd,
}: {
  name: string;
  onClick?: (e: React.MouseEvent) => void;
  compact?: boolean;
  className?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`text-left truncate rounded border border-dashed border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low transition-all ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      } ${compact ? "px-2 py-1 text-[11px] font-medium" : "px-2 py-1.5 text-xs font-medium"} ${className}`}
      title={name}
    >
      {name}
    </button>
  );
}

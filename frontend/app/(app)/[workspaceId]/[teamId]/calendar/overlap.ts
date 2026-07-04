import { toDate } from "./utils";
import type { CalendarEvent } from "./types";

export type PositionedEvent = {
  event: CalendarEvent;
  top: number;
  height: number;
  left: number;
  width: number;
};

function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Lay out events in a single-day column so that overlapping events
 * share horizontal space. Returns relative values (top/height in px-like
 * minutes, left/width as fractions 0–1).
 */
export function layoutDayEvents(
  events: CalendarEvent[],
  options: { dayStartMin?: number; dayEndMin?: number; slotHeight?: number } = {},
): PositionedEvent[] {
  const { dayStartMin = 0, dayEndMin = 24 * 60, slotHeight = 1 } = options;

  const positioned: PositionedEvent[] = [];
  if (events.length === 0) return positioned;

  // Sort by start time, then by duration (longer first).
  const sorted = [...events].sort((a, b) => {
    const aStart = minutesSinceMidnight(toDate(a.starts_at));
    const bStart = minutesSinceMidnight(toDate(b.starts_at));
    if (aStart !== bStart) return aStart - bStart;
    const bEnd = minutesSinceMidnight(toDate(b.ends_at));
    const aEnd = minutesSinceMidnight(toDate(a.ends_at));
    return bEnd - aEnd;
  });

  // Build conflict clusters: groups of events that visually overlap.
  const clusters: CalendarEvent[][] = [];
  let currentCluster: CalendarEvent[] = [];
  let clusterEnd = -1;

  for (const event of sorted) {
    const start = minutesSinceMidnight(toDate(event.starts_at));
    const eventEnd = Math.min(dayEndMin, Math.max(dayStartMin, minutesSinceMidnight(toDate(event.ends_at))));
    if (currentCluster.length === 0 || start < clusterEnd) {
      currentCluster.push(event);
      clusterEnd = Math.max(clusterEnd, eventEnd);
    } else {
      clusters.push(currentCluster);
      currentCluster = [event];
      clusterEnd = eventEnd;
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  for (const cluster of clusters) {
    // Within a cluster, compute how many columns are needed and assign each
    // event to the earliest column that doesn't conflict with prior events in
    // the same column.
    const columns: CalendarEvent[][] = [];
    const colIndex = new Map<string, number>();

    for (const event of cluster) {
      const start = minutesSinceMidnight(toDate(event.starts_at));
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const last = col[col.length - 1];
        const lastEnd = minutesSinceMidnight(toDate(last.ends_at));
        if (start >= lastEnd) {
          col.push(event);
          colIndex.set(event.id, i);
          placed = true;
          break;
        }
      }
      if (!placed) {
        colIndex.set(event.id, columns.length);
        columns.push([event]);
      }
    }

    const columnCount = columns.length;
    for (const event of cluster) {
      const start = minutesSinceMidnight(toDate(event.starts_at));
      const end = minutesSinceMidnight(toDate(event.ends_at));
      const top = Math.max(0, start - dayStartMin) * slotHeight;
      const height = Math.max(20, (Math.min(dayEndMin, end) - Math.max(dayStartMin, start)) * slotHeight);
      const idx = colIndex.get(event.id) ?? 0;
      positioned.push({
        event,
        top,
        height,
        left: idx / columnCount,
        width: 1 / columnCount,
      });
    }
  }

  return positioned;
}

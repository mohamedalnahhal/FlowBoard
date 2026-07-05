import { toDate } from "./utils";
import type { CalendarEvent } from "./types";

export type PositionedEvent = {
  event: CalendarEvent;
  top: number;
  height: number;
  left: number;
  width: number;
};

const MINUTES_PER_DAY = 24 * 60;

/**
 * Lay out events in a single-day column so that overlapping events
 * share horizontal space. Returns relative values (top/height in px-like
 * minutes, left/width as fractions 0–1).
 *
 * Event start/end minutes are measured relative to the column's `day` and
 * clamped to [0, 1440], so an event spanning midnight renders correctly in
 * each day column (e.g. 22:00→02:00 shows as 22:00→24:00 on the first day
 * and 00:00→02:00 on the next).
 */
export function layoutDayEvents(
  events: CalendarEvent[],
  day: Date,
  options: { slotHeight?: number } = {},
): PositionedEvent[] {
  const { slotHeight = 1 } = options;

  const positioned: PositionedEvent[] = [];
  if (events.length === 0) return positioned;

  const dayMidnight = new Date(day);
  dayMidnight.setHours(0, 0, 0, 0);
  const dayStartMs = dayMidnight.getTime();

  const clamp = (v: number) => Math.max(0, Math.min(MINUTES_PER_DAY, v));
  const startMin = (e: CalendarEvent) => clamp((toDate(e.starts_at).getTime() - dayStartMs) / 60000);
  const endMin = (e: CalendarEvent) => clamp((toDate(e.ends_at).getTime() - dayStartMs) / 60000);

  // Sort by start time, then by duration (longer first).
  const sorted = [...events].sort((a, b) => {
    const aStart = startMin(a);
    const bStart = startMin(b);
    if (aStart !== bStart) return aStart - bStart;
    return endMin(b) - endMin(a);
  });

  // Build conflict clusters: groups of events that visually overlap.
  const clusters: CalendarEvent[][] = [];
  let currentCluster: CalendarEvent[] = [];
  let clusterEnd = -1;

  for (const event of sorted) {
    const start = startMin(event);
    const eventEnd = endMin(event);
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
      const start = startMin(event);
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const last = col[col.length - 1];
        if (start >= endMin(last)) {
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
      const start = startMin(event);
      const end = endMin(event);
      const top = start * slotHeight;
      const height = Math.max(20, (end - start) * slotHeight);
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

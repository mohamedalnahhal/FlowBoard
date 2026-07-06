"use client";

import { useState } from "react";
import { isSameDay, isSameMonth } from "date-fns";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { getMonthCells, toDate, WEEKDAY_LABELS_SHORT } from "./utils";
import type { CalendarEvent } from "./types";

// A controlled, navigable mini-month for the calendar's left rail (Google
// Calendar style): clicking a day jumps the main grid, the active date is
// highlighted, and the month can be browsed independently. This is distinct
// from the dashboard's static MiniCalendar widget — it drives navigation.
export function CalendarSidebar({
  anchorDate,
  events,
  onSelectDate,
  onCreate,
}: {
  anchorDate: Date;
  events: CalendarEvent[];
  onSelectDate: (date: Date) => void;
  onCreate?: () => void;
}) {
  const [cursor, setCursor] = useState(() => new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1));

  // Follow the main calendar when it navigates into a different month, so the
  // mini-month stays in sync with what the grid shows.
  const anchorKey = `${anchorDate.getFullYear()}-${anchorDate.getMonth()}`;
  const [prevAnchorKey, setPrevAnchorKey] = useState(anchorKey);
  if (anchorKey !== prevAnchorKey) {
    setPrevAnchorKey(anchorKey);
    setCursor(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1));
  }

  const year = cursor.getFullYear();
  const month = cursor.getMonth() + 1;
  const cells = getMonthCells(year, month);

  const eventDays = new Set(
    events.filter((e) => isSameMonth(toDate(e.starts_at), cursor)).map((e) => toDate(e.starts_at).getDate()),
  );

  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-4">
      {onCreate && (
        <Button type="button" icon={<Icon name="add" />} onClick={onCreate} className="w-fit">
          Create
        </Button>
      )}

      <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-label-md text-label-md font-semibold text-on-surface">{monthLabel}</span>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setCursor(new Date(year, month - 2, 1))}
              className="p-1 rounded hover:bg-surface-container-low text-on-surface-variant focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              aria-label="Previous month"
            >
              <Icon name="chevron_left" className="text-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => setCursor(new Date(year, month, 1))}
              className="p-1 rounded hover:bg-surface-container-low text-on-surface-variant focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              aria-label="Next month"
            >
              <Icon name="chevron_right" className="text-[18px]" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
          {WEEKDAY_LABELS_SHORT.map((d, i) => (
            <div key={i} className="text-[10px] font-semibold text-outline">
              {d[0]}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5 text-center">
          {cells.map(({ date, currentMonth, isToday }) => {
            const selected = isSameDay(date, anchorDate);
            const hasEvent = currentMonth && eventDays.has(date.getDate());
            return (
              <button
                key={date.toISOString()}
                type="button"
                onClick={() => onSelectDate(date)}
                aria-label={date.toDateString()}
                aria-current={isToday ? "date" : undefined}
                className={`relative aspect-square flex items-center justify-center rounded-full text-[11px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                  isToday
                    ? "bg-primary text-on-primary font-bold"
                    : selected
                      ? "bg-primary-fixed text-on-primary-fixed-variant font-semibold"
                      : currentMonth
                        ? "text-on-surface hover:bg-surface-container-low"
                        : "text-outline-variant hover:bg-surface-container-low"
                }`}
              >
                {date.getDate()}
                {hasEvent && !isToday && !selected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-tertiary" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

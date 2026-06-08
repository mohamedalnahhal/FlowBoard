"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";

type CalendarEvent = { id: string; starts_at: string };

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function MiniCalendar({ events }: { events: CalendarEvent[] }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const eventDays = new Set(
    events
      .filter((e) => {
        const d = new Date(e.starts_at);
        return d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth();
      })
      .map((e) => new Date(e.starts_at).getDate()),
  );

  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const daysInPrevMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 0).getDate();

  const cells: { day: number; current: boolean; isToday: boolean; hasEvent: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, current: false, isToday: false, hasEvent: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday =
      d === today.getDate() && cursor.getMonth() === today.getMonth() && cursor.getFullYear() === today.getFullYear();
    cells.push({ day: d, current: true, isToday, hasEvent: eventDays.has(d) });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextDay++, current: false, isToday: false, hasEvent: false });
  }

  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <Card className="p-5">
      <h3 className="font-label-md text-label-md font-semibold text-on-surface mb-4">Calendar</h3>
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="p-1 rounded hover:bg-surface-container-low text-on-surface-variant"
          aria-label="Previous month"
        >
          <Icon name="chevron_left" className="text-sm" />
        </button>
        <span className="font-label-sm text-sm text-on-surface font-semibold">{monthLabel}</span>
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="p-1 rounded hover:bg-surface-container-low text-on-surface-variant"
          aria-label="Next month"
        >
          <Icon name="chevron_right" className="text-sm" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-[10px] font-semibold text-outline">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[12px] font-body-md text-on-surface">
        {cells.map((cell, i) => (
          <div
            key={i}
            className={`p-1.5 rounded cursor-pointer relative ${
              !cell.current
                ? "text-outline-variant"
                : cell.isToday
                  ? "bg-primary text-white font-bold shadow-sm"
                  : "hover:bg-surface-container-low"
            }`}
          >
            {cell.day}
            {cell.hasEvent && cell.current && !cell.isToday && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-tertiary" />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

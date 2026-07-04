"use client";

import Link from "next/link";
import type { CalendarView } from "./types";

const VIEWS: { key: CalendarView; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "day", label: "Day" },
  { key: "agenda", label: "Agenda" },
];

export function ViewSwitcher({
  workspaceId,
  teamId,
  year,
  month,
  day,
  active,
}: {
  workspaceId: string;
  teamId: string;
  year: number;
  month: number;
  day: number;
  active: CalendarView;
}) {
  return (
    <div className="flex items-center gap-1 bg-surface-container-lowest border border-outline-variant rounded-lg p-1">
      {VIEWS.map((view) => {
        const isActive = view.key === active;
        const href = `/${workspaceId}/${teamId}/calendar?view=${view.key}&year=${year}&month=${month}&day=${day}`;
        return (
          <Link
            key={view.key}
            href={href}
            className={`px-3 py-1.5 rounded-md font-label-md text-label-md transition-colors ${
              isActive
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {view.label}
          </Link>
        );
      })}
    </div>
  );
}

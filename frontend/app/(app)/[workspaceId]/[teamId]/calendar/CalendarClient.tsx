"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { ViewSwitcher } from "./ViewSwitcher";
import { CalendarSidebar } from "./CalendarSidebar";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import { AgendaView } from "./AgendaView";
import { EventFormModal } from "./EventFormModal";
import { EventDetailModal } from "./EventDetailModal";
import { moveCalendarEventAction } from "@/lib/calendar-actions";
import { updateTaskDueDateAction } from "@/lib/task-actions";
import {
  formatMonthYear,
  navigateMonth,
  navigateWeek,
  navigateDay,
} from "./utils";
import type { CalendarEvent, TaskDeadline, CalendarView } from "./types";

const VALID_VIEWS: CalendarView[] = ["month", "week", "day", "agenda"];

export function CalendarClient({
  workspaceId,
  teamId,
  teamName,
  events,
  tasks,
  canManage,
  initialYear,
  initialMonth,
  initialDay,
  initialView,
}: {
  workspaceId: string;
  teamId: string;
  teamName: string;
  events: CalendarEvent[];
  tasks: TaskDeadline[];
  canManage: boolean;
  initialYear: number;
  initialMonth: number;
  initialDay: number;
  initialView: CalendarView;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [moveError, setMoveError] = useState<string | null>(null);

  // Derive the current position from the URL rather than local state, so that
  // browser back/forward (which re-runs the server component and refetches
  // events/tasks) keeps the rendered grid in sync with those props. The
  // initial* props are the SSR fallback for the first render with no query.
  const rawView = searchParams.get("view");
  const view: CalendarView = VALID_VIEWS.includes(rawView as CalendarView) ? (rawView as CalendarView) : initialView;
  const year = parseInt(searchParams.get("year") ?? "", 10) || initialYear;
  const month = parseInt(searchParams.get("month") ?? "", 10) || initialMonth;
  const day = parseInt(searchParams.get("day") ?? "", 10) || initialDay;

  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [createRange, setCreateRange] = useState<{ start: Date; end: Date } | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  function navigate(nextYear: number, nextMonth: number, nextDay: number, nextView: CalendarView = view) {
    router.push(`/${workspaceId}/${teamId}/calendar?view=${nextView}&year=${nextYear}&month=${nextMonth}&day=${nextDay}`);
  }

  function goToday() {
    const d = new Date();
    navigate(d.getFullYear(), d.getMonth() + 1, d.getDate(), view);
  }

  // Picking a day in the mini-month jumps the main grid to that date, keeping
  // the current view.
  function handleSelectDate(date: Date) {
    navigate(date.getFullYear(), date.getMonth() + 1, date.getDate(), view);
  }

  function goPrevious() {
    if (view === "month") {
      const next = navigateMonth(year, month, -1);
      navigate(next.year, next.month, day);
    } else if (view === "week") {
      const next = navigateWeek(year, month, day, -1);
      navigate(next.year, next.month, next.day);
    } else {
      const next = navigateDay(year, month, day, -1);
      navigate(next.year, next.month, next.day);
    }
  }

  function goNext() {
    if (view === "month") {
      const next = navigateMonth(year, month, 1);
      navigate(next.year, next.month, day);
    } else if (view === "week") {
      const next = navigateWeek(year, month, day, 1);
      navigate(next.year, next.month, next.day);
    } else {
      const next = navigateDay(year, month, day, 1);
      navigate(next.year, next.month, next.day);
    }
  }

  async function handleEventMove(eventId: string, startsAt: string, endsAt: string) {
    setMoveError(null);
    const result = await moveCalendarEventAction(teamId, eventId, startsAt, endsAt);
    if (result?.error) {
      setMoveError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleTaskMove(taskId: string, boardId: string, dueDate: string) {
    setMoveError(null);
    const result = await updateTaskDueDateAction(teamId, boardId, taskId, dueDate);
    if (result?.error) {
      setMoveError(result.error);
      return;
    }
    router.refresh();
  }

  function openCreate(date: Date) {
    if (!canManage) return;
    setCreateRange(null);
    setCreateDate(date);
    setCreateOpen(true);
  }

  // Opened by click-dragging a time range on the week/day grid: pre-fills the
  // event with the exact dragged start/end instead of the default 9–10am.
  function openRangeCreate(start: Date, end: Date) {
    if (!canManage) return;
    setCreateDate(null);
    setCreateRange({ start, end });
    setCreateOpen(true);
  }

  function closeCreate() {
    setCreateOpen(false);
    setCreateDate(null);
    setCreateRange(null);
  }

  function openDetail(event: CalendarEvent) {
    setSelectedEvent(event);
    setDetailOpen(true);
  }

  function closeDetail() {
    setDetailOpen(false);
    setSelectedEvent(null);
  }

  function startEdit() {
    setDetailOpen(false);
    setEditOpen(true);
  }

  const anchorDate = new Date(year, month - 1, day);
  const titleLabel =
    view === "month"
      ? formatMonthYear(year, month)
      : view === "week"
        ? (() => {
            const start = startOfWeek(anchorDate, { weekStartsOn: 0 });
            const end = endOfWeek(anchorDate, { weekStartsOn: 0 });
            return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
          })()
        : format(anchorDate, "MMMM d, yyyy");

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-3">
            <Icon name="calendar_today" />
            Calendar
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">{teamName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-surface-container-lowest border border-outline-variant rounded-lg">
            <button
              type="button"
              onClick={goPrevious}
              className="p-2 hover:bg-surface-container-low text-on-surface-variant rounded-l-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              aria-label="Previous"
            >
              <Icon name="chevron_left" />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="px-3 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              Today
            </button>
            <button
              type="button"
              onClick={goNext}
              className="p-2 hover:bg-surface-container-low text-on-surface-variant rounded-r-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              aria-label="Next"
            >
              <Icon name="chevron_right" />
            </button>
          </div>
          <span className="font-title-lg text-title-lg text-on-surface min-w-[140px] lg:min-w-[180px]">{titleLabel}</span>
          <ViewSwitcher
            workspaceId={workspaceId}
            teamId={teamId}
            year={year}
            month={month}
            day={day}
            active={view}
          />
          {canManage && (
            <Button type="button" icon={<Icon name="add" />} onClick={() => openCreate(new Date(year, month - 1, day))}>
              New Event
            </Button>
          )}
        </div>
      </div>

      {moveError && (
        <div className="flex items-center gap-2 p-3 bg-error-container/20 rounded-lg text-error font-body-md text-[13px]">
          <Icon name="error" className="text-[16px] shrink-0" />
          {moveError}
        </div>
      )}

      {/* Sidebar (mini-month) + view content */}
      <div className="flex gap-6 items-start">
        <aside className="hidden lg:block w-64 shrink-0">
          <CalendarSidebar
            anchorDate={anchorDate}
            events={events}
            onSelectDate={handleSelectDate}
            onCreate={canManage ? () => openCreate(anchorDate) : undefined}
          />
        </aside>
        <div className="flex-1 min-w-0">
      {view === "month" && (
        <MonthView
          year={year}
          month={month}
          events={events}
          tasks={tasks}
          canManage={canManage}
          onCreate={openCreate}
          onEventClick={openDetail}
          onTaskClick={(task) => router.push(`/boards/${task.board.id}`)}
          onEventMove={canManage ? handleEventMove : undefined}
          onTaskMove={canManage ? handleTaskMove : undefined}
        />
      )}
      {view === "week" && (
        <WeekView
          year={year}
          month={month}
          day={day}
          events={events}
          tasks={tasks}
          onEventClick={openDetail}
          onTaskClick={(task) => router.push(`/boards/${task.board.id}`)}
          onEventMove={canManage ? handleEventMove : undefined}
          onTaskMove={canManage ? handleTaskMove : undefined}
          onRangeCreate={canManage ? openRangeCreate : undefined}
          canManage={canManage}
        />
      )}
      {view === "day" && (
        <DayView
          year={year}
          month={month}
          day={day}
          events={events}
          tasks={tasks}
          onEventClick={openDetail}
          onTaskClick={(task) => router.push(`/boards/${task.board.id}`)}
          onEventMove={canManage ? handleEventMove : undefined}
          onTaskMove={canManage ? handleTaskMove : undefined}
          onRangeCreate={canManage ? openRangeCreate : undefined}
          canManage={canManage}
        />
      )}
      {view === "agenda" && (
        <AgendaView
          year={year}
          month={month}
          day={day}
          events={events}
          tasks={tasks}
          onEventClick={openDetail}
          onTaskClick={(task) => router.push(`/boards/${task.board.id}`)}
          onEventMove={canManage ? handleEventMove : undefined}
          onTaskMove={canManage ? handleTaskMove : undefined}
          canManage={canManage}
        />
      )}
        </div>
      </div>

      {createOpen && (createDate || createRange) && (
        <EventFormModal
          mode="create"
          teamId={teamId}
          initialDate={createDate ?? undefined}
          initialRange={createRange ?? undefined}
          onClose={closeCreate}
        />
      )}

      {detailOpen && selectedEvent && (
        <EventDetailModal
          teamId={teamId}
          event={selectedEvent}
          canManage={canManage}
          onClose={closeDetail}
          onEdit={startEdit}
          onDeleted={() => {
            setDetailOpen(false);
            setSelectedEvent(null);
            router.refresh();
          }}
        />
      )}

      {editOpen && selectedEvent && (
        <EventFormModal
          mode="edit"
          teamId={teamId}
          event={selectedEvent}
          onClose={() => {
            setEditOpen(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
}

"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextField, Textarea } from "@/components/ui/Field";
import {
  createCalendarEventAction,
  updateCalendarEventAction,
  deleteCalendarEventAction,
} from "@/lib/calendar-actions";

type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  color: string | null;
};

type TaskDeadline = {
  id: string;
  name: string;
  end_date: string;
  status: string;
  board: { id: string; name: string };
};

type CalendarItem =
  | { type: "event"; data: CalendarEvent }
  | { type: "task"; data: TaskDeadline };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PALETTE = ["#4648d4", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2"];
const MAX_VISIBLE = 3;

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toDatetimeLocal(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getMonthCells(year: number, month: number) {
  const today = new Date();
  const firstDay = new Date(year, month - 1, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: { date: Date; currentMonth: boolean; isToday: boolean }[] = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, -i), currentMonth: false, isToday: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const isToday =
      d === today.getDate() && month - 1 === today.getMonth() && year === today.getFullYear();
    cells.push({ date, currentMonth: true, isToday });
  }
  let next = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ date: new Date(year, month, next++), currentMonth: false, isToday: false });
  }
  return cells;
}

function eventSpansDate(event: CalendarEvent, key: string) {
  const start = dateKey(new Date(event.starts_at));
  const end = dateKey(new Date(event.ends_at));
  return key >= start && key <= end;
}

function taskOnDate(task: TaskDeadline, key: string) {
  return dateKey(new Date(task.end_date)) === key;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function CalendarClient({
  workspaceId,
  teamId,
  teamName,
  events,
  tasks,
  canManage,
  initialYear,
  initialMonth,
}: {
  workspaceId: string;
  teamId: string;
  teamName: string;
  events: CalendarEvent[];
  tasks: TaskDeadline[];
  canManage: boolean;
  initialYear: number;
  initialMonth: number;
}) {
  const router = useRouter();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);

  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const cells = useMemo(() => getMonthCells(year, month), [year, month]);
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  function navigate(y: number, m: number) {
    router.push(`/${workspaceId}/${teamId}/calendar?year=${y}&month=${m}`);
  }

  function prevMonth() {
    const d = new Date(year, month - 2, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
    navigate(d.getFullYear(), d.getMonth() + 1);
  }

  function nextMonth() {
    const d = new Date(year, month, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
    navigate(d.getFullYear(), d.getMonth() + 1);
  }

  function goToday() {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
    navigate(d.getFullYear(), d.getMonth() + 1);
  }

  function openCreate(date: Date) {
    if (!canManage) return;
    setCreateDate(date);
    setCreateOpen(true);
  }

  function openDetail(event: CalendarEvent) {
    setSelectedEvent(event);
    setDetailOpen(true);
    setDeleteConfirm(false);
  }

  function closeDetail() {
    setDetailOpen(false);
    setSelectedEvent(null);
    setDeleteConfirm(false);
  }

  function startEdit() {
    setDetailOpen(false);
    setEditOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-3">
            <Icon name="calendar_today" />
            Calendar
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">{teamName}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-surface-container-lowest border border-outline-variant rounded-lg">
            <button
              type="button"
              onClick={prevMonth}
              className="p-2 hover:bg-surface-container-low text-on-surface-variant rounded-l-lg"
              aria-label="Previous month"
            >
              <Icon name="chevron_left" />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="px-3 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-low"
            >
              Today
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-2 hover:bg-surface-container-low text-on-surface-variant rounded-r-lg"
              aria-label="Next month"
            >
              <Icon name="chevron_right" />
            </button>
          </div>
          <span className="font-title-lg text-title-lg text-on-surface min-w-[180px]">{monthLabel}</span>
          {canManage && (
            <Button type="button" icon={<Icon name="add" />} onClick={() => openCreate(new Date(year, month - 1, 1))}>
              New Event
            </Button>
          )}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-outline-variant/40">
          {WEEKDAYS.map((d) => (
            <div key={d} className="p-3 text-center font-label-md text-label-md text-on-surface-variant">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr">
          {cells.map((cell, i) => {
            const key = dateKey(cell.date);
            const dayEvents = events.filter((e) => eventSpansDate(e, key)).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
            const dayTasks = tasks.filter((t) => taskOnDate(t, key));
            const items: CalendarItem[] = [...dayEvents.map((e) => ({ type: "event" as const, data: e })), ...dayTasks.map((t) => ({ type: "task" as const, data: t }))];
            const visible = items.slice(0, MAX_VISIBLE);
            const overflow = items.length - visible.length;

            return (
              <div
                key={i}
                onClick={() => openCreate(cell.date)}
                className={`min-h-[120px] p-2 border-b border-r border-outline-variant/30 flex flex-col gap-1 transition-colors ${
                  cell.currentMonth ? "bg-surface-container-lowest" : "bg-surface-container-low/40"
                } ${canManage ? "cursor-pointer hover:bg-surface-container-low" : ""} ${
                  cell.isToday ? "bg-primary-fixed/20" : ""
                }`}
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
                      <button
                        key={`evt-${item.data.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(item.data);
                        }}
                        className="text-left px-2 py-1 rounded text-[11px] font-medium truncate border border-transparent hover:brightness-95 transition-all"
                        style={{ backgroundColor: item.data.color ?? "#4648d4", color: "#fff" }}
                      >
                        {item.data.title}
                      </button>
                    ) : (
                      <Link
                        key={`task-${item.data.id}`}
                        href={`/boards/${item.data.board.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium truncate border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low"
                      >
                        <Icon name="task_alt" className="text-[12px] text-on-surface-variant" />
                        {item.data.name}
                      </Link>
                    ),
                  )}
                  {overflow > 0 && (
                    <span className="text-[11px] text-on-surface-variant px-1">+{overflow} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {createOpen && createDate && (
        <EventFormModal
          mode="create"
          teamId={teamId}
          initialDate={createDate}
          onClose={() => setCreateOpen(false)}
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
          deleteConfirm={deleteConfirm}
          setDeleteConfirm={setDeleteConfirm}
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

function EventFormModal({
  mode,
  teamId,
  event,
  initialDate,
  onClose,
}: {
  mode: "create" | "edit";
  teamId: string;
  event?: CalendarEvent;
  initialDate?: Date;
  onClose: () => void;
}) {
  const router = useRouter();
  const isAllDayDefault = event?.all_day ?? false;
  const [allDay, setAllDay] = useState(isAllDayDefault);
  const [color, setColor] = useState(event?.color ?? PALETTE[0]);
  const [state, formAction, pending] = useActionState(
    mode === "create"
      ? createCalendarEventAction.bind(null, teamId)
      : updateCalendarEventAction.bind(null, teamId, event!.id),
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const wasPendingRef = useRef(false);

  const startDefault = useMemo(() => {
    if (event) return allDay ? toDateInput(new Date(event.starts_at)) : toDatetimeLocal(new Date(event.starts_at));
    if (initialDate) return allDay ? toDateInput(initialDate) : toDatetimeLocal(new Date(initialDate.setHours(9, 0, 0, 0)));
    return "";
  }, [event, initialDate, allDay]);

  const endDefault = useMemo(() => {
    if (event) return allDay ? toDateInput(new Date(event.ends_at)) : toDatetimeLocal(new Date(event.ends_at));
    if (initialDate) {
      const end = new Date(initialDate);
      end.setHours(allDay ? 23 : 10, allDay ? 59 : 0, 0, 0);
      return allDay ? toDateInput(end) : toDatetimeLocal(end);
    }
    return "";
  }, [event, initialDate, allDay]);

  useEffect(() => {
    if (pending) {
      wasPendingRef.current = true;
      return;
    }
    if (wasPendingRef.current && !state?.error) {
      wasPendingRef.current = false;
      onClose();
      router.refresh();
    }
  }, [pending, state, onClose, router]);

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === "create" ? "New Event" : "Edit Event"}
      width="md"
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button form="event-form" type="submit" disabled={pending}>
            {pending ? (mode === "create" ? "Creating…" : "Saving…") : mode === "create" ? "Create Event" : "Save Changes"}
          </Button>
        </>
      }
    >
      <form id="event-form" ref={formRef} action={formAction} className="flex flex-col gap-5">
        <TextField label="Title" name="title" required defaultValue={event?.title} autoFocus />
        <Textarea label="Description" name="description" defaultValue={event?.description} />

        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input
            type="checkbox"
            name="all_day"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <span className="font-label-md text-label-md text-on-surface-variant">All day</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {allDay ? (
            <>
              <TextField label="Start date" name="starts_at" type="date" required defaultValue={startDefault} />
              <TextField label="End date" name="ends_at" type="date" required defaultValue={endDefault} />
            </>
          ) : (
            <>
              <TextField label="Start" name="starts_at" type="datetime-local" required defaultValue={startDefault} />
              <TextField label="End" name="ends_at" type="datetime-local" required defaultValue={endDefault} />
            </>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-label-md text-label-md text-on-surface-variant">Color</span>
          <div className="flex items-center gap-3 flex-wrap">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? "border-on-surface scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
          <input type="hidden" name="color" value={color} />
        </div>

        {state?.error && (
          <div className="flex items-center gap-2 p-3 bg-error-container/20 rounded-lg text-error font-body-md text-[13px]">
            <Icon name="error" className="text-[16px] shrink-0" />
            {state.error}
          </div>
        )}
      </form>
    </Modal>
  );
}

function EventDetailModal({
  teamId,
  event,
  canManage,
  onClose,
  onEdit,
  onDeleted,
  deleteConfirm,
  setDeleteConfirm,
}: {
  teamId: string;
  event: CalendarEvent;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
  deleteConfirm: boolean;
  setDeleteConfirm: (v: boolean) => void;
}) {
  type DeleteState = { error?: string } | undefined;
  const [deleteState, setDeleteState] = useState<DeleteState>(undefined);

  async function handleDelete() {
    const result = await deleteCalendarEventAction(teamId, event.id);
    if (result?.error) {
      setDeleteState(result);
      return;
    }
    onDeleted();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={event.title}
      width="sm"
      footer={
        canManage ? (
          <>
            <Button variant="ghost" type="button" onClick={onClose}>
              Close
            </Button>
            {!deleteConfirm ? (
              <>
                <Button variant="secondary" type="button" onClick={onEdit}>
                  Edit
                </Button>
                <Button variant="danger" type="button" onClick={() => setDeleteConfirm(true)}>
                  Delete
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" type="button" onClick={() => setDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="danger" type="button" onClick={handleDelete}>
                  Confirm delete
                </Button>
              </>
            )}
          </>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span
            className="w-4 h-4 rounded-full border border-outline-variant"
            style={{ backgroundColor: event.color ?? "#4648d4" }}
          />
          <span className="font-label-md text-label-md text-on-surface-variant">
            {event.all_day ? "All day" : `${formatTime(event.starts_at)} – ${formatTime(event.ends_at)}`}
          </span>
        </div>
        <div className="text-sm text-on-surface-variant">
          {formatDate(event.starts_at)}
          {dateKey(new Date(event.starts_at)) !== dateKey(new Date(event.ends_at)) && ` – ${formatDate(event.ends_at)}`}
        </div>
        {event.description && (
          <p className="font-body-md text-body-md text-on-surface whitespace-pre-wrap">{event.description}</p>
        )}
        {deleteState?.error && (
          <div className="flex items-center gap-2 p-3 bg-error-container/20 rounded-lg text-error font-body-md text-[13px]">
            <Icon name="error" className="text-[16px] shrink-0" />
            {deleteState.error}
          </div>
        )}
      </div>
    </Modal>
  );
}

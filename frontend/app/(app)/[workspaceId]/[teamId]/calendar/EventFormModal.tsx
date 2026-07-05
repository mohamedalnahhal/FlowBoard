"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextField, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { createCalendarEventAction, updateCalendarEventAction } from "@/lib/calendar-actions";
import { useActionState } from "react";
import { PALETTE } from "./utils";
import type { CalendarEvent } from "./types";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toDatetimeLocal(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Convert a form value (user-local wall clock from a date / datetime-local
// input) into an absolute ISO instant, so the backend stores the same instant
// regardless of its own timezone. This matches the drag-and-drop path, which
// already sends offset-qualified ISO. Returns "" for empty/invalid input so
// the server action's required-field validation still fires.
function toAbsoluteISO(value: string, allDay: boolean, isEnd: boolean): string {
  if (!value) return "";
  const local = allDay ? `${value.slice(0, 10)}T${isEnd ? "23:59" : "00:00"}` : value;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function EventFormModal({
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
  const boundAction =
    mode === "create"
      ? createCalendarEventAction.bind(null, teamId)
      : updateCalendarEventAction.bind(null, teamId, event!.id);
  const [state, formAction, pending] = useActionState(boundAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPendingRef = useRef(false);

  const startDefault = useMemo(() => {
    if (event) return allDay ? toDateInput(new Date(event.starts_at)) : toDatetimeLocal(new Date(event.starts_at));
    if (initialDate) {
      if (allDay) return toDateInput(initialDate);
      const start = new Date(initialDate);
      start.setHours(9, 0, 0, 0);
      return toDatetimeLocal(start);
    }
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

  // Controlled so the raw input value never submits directly; the hidden
  // fields below carry the absolute-ISO conversion. When the all-day toggle
  // flips, the input format switches (date ↔ datetime-local), so reset the
  // values to the recomputed defaults using React's adjust-state-during-render
  // pattern rather than an effect.
  const [startVal, setStartVal] = useState(startDefault);
  const [endVal, setEndVal] = useState(endDefault);
  const [prevAllDay, setPrevAllDay] = useState(allDay);
  if (prevAllDay !== allDay) {
    setPrevAllDay(allDay);
    setStartVal(startDefault);
    setEndVal(endDefault);
  }

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
          <TextField
            label={allDay ? "Start date" : "Start"}
            type={allDay ? "date" : "datetime-local"}
            required
            value={startVal}
            onChange={(e) => setStartVal(e.target.value)}
          />
          <TextField
            label={allDay ? "End date" : "End"}
            type={allDay ? "date" : "datetime-local"}
            required
            value={endVal}
            onChange={(e) => setEndVal(e.target.value)}
          />
        </div>
        <input type="hidden" name="starts_at" value={toAbsoluteISO(startVal, allDay, false)} />
        <input type="hidden" name="ends_at" value={toAbsoluteISO(endVal, allDay, true)} />

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

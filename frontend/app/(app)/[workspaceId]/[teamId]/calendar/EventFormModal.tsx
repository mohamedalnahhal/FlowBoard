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

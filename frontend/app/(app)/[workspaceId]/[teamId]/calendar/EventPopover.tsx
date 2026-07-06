"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { deleteCalendarEventAction } from "@/lib/calendar-actions";
import { dateKey, formatDate, formatTime } from "./utils";
import type { CalendarEvent } from "./types";

const POPOVER_WIDTH = 320; // matches w-80
const MARGIN = 8;

// Lightweight, click-anchored event card (Google Calendar style) shown instead
// of a full modal. `anchor` is the clicked element's viewport rect; the card is
// placed beside it and clamped/flipped to stay on screen. Edit opens the full
// editor; delete happens inline with a confirm step.
export function EventPopover({
  teamId,
  event,
  canManage,
  anchor,
  onClose,
  onEdit,
  onDeleted,
}: {
  teamId: string;
  event: CalendarEvent;
  canManage: boolean;
  anchor: DOMRect | null;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // A generated occurrence of a recurring series has a composite id
  // (`parentId:date`); editing/deleting a single occurrence isn't supported
  // yet, so surface it read-only.
  const isOccurrence = !!event.parent_event_id;
  const canModify = canManage && !isOccurrence;

  // Position beside the anchor once the card has a measured size.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!anchor) {
      setPos({ left: Math.max(MARGIN, (vw - width) / 2), top: Math.max(MARGIN, (vh - height) / 3) });
      return;
    }
    let left = anchor.right + MARGIN;
    if (left + width > vw - MARGIN) left = anchor.left - width - MARGIN; // flip to the left
    left = Math.max(MARGIN, Math.min(left, vw - width - MARGIN));
    const top = Math.max(MARGIN, Math.min(anchor.top, vh - height - MARGIN));
    setPos({ left, top });
  }, [anchor]);

  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteCalendarEventAction(teamId, event.id);
    if (result?.error) {
      setDeleteError(result.error);
      setDeleting(false);
      return;
    }
    onDeleted();
  }

  return (
    <>
      {/* Click-outside backdrop */}
      <button type="button" aria-label="Close" className="fixed inset-0 z-[100] cursor-default" onClick={onClose} />

      <div
        ref={ref}
        role="dialog"
        aria-label={event.title}
        style={{
          position: "fixed",
          width: POPOVER_WIDTH,
          left: pos?.left ?? -9999,
          top: pos?.top ?? -9999,
          visibility: pos ? "visible" : "hidden",
        }}
        className="z-[110] bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl p-4 flex flex-col gap-3"
      >
        {/* Header */}
        <div className="flex items-start gap-2">
          <span
            className="mt-1.5 w-3.5 h-3.5 rounded-full border border-outline-variant shrink-0"
            style={{ backgroundColor: event.color ?? "#4648d4" }}
          />
          <h3 className="flex-1 font-title-md text-title-md text-on-surface leading-snug break-words">{event.title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 -mt-1 -mr-1 p-1 rounded-full text-on-surface-variant hover:bg-surface-container-low"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>

        {/* When */}
        <div className="flex flex-col gap-0.5 pl-6">
          <span className="font-label-md text-label-md text-on-surface">
            {event.all_day ? "All day" : `${formatTime(event.starts_at)} – ${formatTime(event.ends_at)}`}
          </span>
          <span className="text-[13px] text-on-surface-variant">
            {formatDate(event.starts_at)}
            {dateKey(new Date(event.starts_at)) !== dateKey(new Date(event.ends_at)) && ` – ${formatDate(event.ends_at)}`}
          </span>
        </div>

        {event.description && (
          <p className="pl-6 font-body-md text-body-md text-on-surface whitespace-pre-wrap break-words max-h-40 overflow-auto">
            {event.description}
          </p>
        )}

        {isOccurrence && (
          <div className="flex items-center gap-2 p-2.5 bg-surface-container-low rounded-lg text-on-surface-variant text-[12px]">
            <Icon name="repeat" className="text-[16px] shrink-0" />
            Part of a recurring series. Editing single occurrences isn&apos;t available yet.
          </div>
        )}

        {deleteError && (
          <div className="flex items-center gap-2 p-2.5 bg-error-container/20 rounded-lg text-error text-[12px]">
            <Icon name="error" className="text-[16px] shrink-0" />
            {deleteError}
          </div>
        )}

        {/* Actions */}
        {canModify && (
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-outline-variant/40">
            {!deleteConfirm ? (
              <>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-label-md text-error hover:bg-error-container/20 transition-colors"
                >
                  <Icon name="delete" className="text-[18px]" />
                  Delete
                </button>
                <button
                  type="button"
                  onClick={onEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-label-md text-on-surface border border-outline-variant hover:bg-surface-container-low transition-colors"
                >
                  <Icon name="edit" className="text-[18px]" />
                  Edit
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(false)}
                  className="px-3 py-1.5 rounded-md text-label-md text-on-surface-variant hover:bg-surface-container-low transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 rounded-md text-label-md bg-error text-on-error hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Confirm delete"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

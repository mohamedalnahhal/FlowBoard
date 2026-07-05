"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { deleteCalendarEventAction } from "@/lib/calendar-actions";
import { dateKey, formatDate, formatTime } from "./utils";
import type { CalendarEvent } from "./types";

export function EventDetailModal({
  teamId,
  event,
  canManage,
  onClose,
  onEdit,
  onDeleted,
}: {
  teamId: string;
  event: CalendarEvent;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  type DeleteState = { error?: string } | undefined;
  const [deleteState, setDeleteState] = useState<DeleteState>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // A generated occurrence of a recurring series has a composite id
  // (`parentId:date`); editing/deleting a single occurrence isn't supported
  // yet, so we surface it read-only rather than send the composite id to the
  // API (which would 404).
  const isOccurrence = !!event.parent_event_id;
  const canModify = canManage && !isOccurrence;

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
        canModify ? (
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
        {isOccurrence && (
          <div className="flex items-center gap-2 p-3 bg-surface-container-low rounded-lg text-on-surface-variant font-body-md text-[13px]">
            <Icon name="repeat" className="text-[16px] shrink-0" />
            Part of a recurring series. Editing individual occurrences isn&apos;t available yet.
          </div>
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

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextField, Textarea } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { createAnnouncementAction, updateAnnouncementAction, deleteAnnouncementAction } from "@/lib/announcement-actions";

type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  author: { id: string; display_name: string; username: string };
};

const PAGE_SIZE = 20;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isEdited(a: Announcement) {
  return new Date(a.updated_at).getTime() - new Date(a.created_at).getTime() > 60_000;
}

export function AnnouncementsClient({
  workspaceId,
  teamId,
  teamName,
  announcements,
  offset,
  total,
  currentUserId,
  canPost,
  currentUserRole,
}: {
  workspaceId: string;
  teamId: string;
  teamName: string;
  announcements: Announcement[];
  offset: number;
  total: number;
  currentUserId?: string;
  canPost: boolean;
  currentUserRole: number;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editAnnouncement, setEditAnnouncement] = useState<Announcement | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const hasMore = offset + announcements.length < total;
  const nextOffset = offset + PAGE_SIZE;

  function canEdit(a: Announcement) {
    return currentUserRole <= 2 || a.author.id === currentUserId;
  }

  return (
    <div className="max-w-[860px] flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-3">
            <Icon name="campaign" />
            Announcements
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">{teamName}</p>
        </div>
        {canPost && (
          <Button type="button" icon={<Icon name="add" />} onClick={() => setCreateOpen(true)}>
            New announcement
          </Button>
        )}
      </div>

      {/* Feed */}
      {announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-on-surface-variant">
          <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center">
            <Icon name="campaign" className="text-[40px]" />
          </div>
          <p className="font-body-lg text-body-lg">No announcements yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {announcements.map((a) => (
            <Card key={a.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar person={a.author} size="md" />
                  <div>
                    <p className="font-label-md text-label-md text-on-surface font-semibold">{a.author.display_name}</p>
                    <p className="font-body-md text-[12px] text-on-surface-variant">
                      {formatDate(a.created_at)}
                      {isEdited(a) && <span className="ml-2 text-outline">(edited)</span>}
                    </p>
                  </div>
                </div>
                {canEdit(a) && (
                  <div className="flex items-center gap-2">
                    {deleteConfirmId === a.id ? (
                      <>
                        <Button variant="ghost" size="sm" type="button" onClick={() => setDeleteConfirmId(null)}>
                          Cancel
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          type="button"
                          onClick={async () => {
                            const result = await deleteAnnouncementAction(workspaceId, a.id);
                            if (result?.error) return;
                            setDeleteConfirmId(null);
                            router.refresh();
                          }}
                        >
                          Confirm
                        </Button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditAnnouncement(a)}
                          className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors"
                          aria-label="Edit announcement"
                        >
                          <Icon name="edit" className="text-[18px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(a.id)}
                          className="p-1.5 rounded-md text-on-surface-variant hover:bg-error-container/30 hover:text-error transition-colors"
                          aria-label="Delete announcement"
                        >
                          <Icon name="delete" className="text-[18px]" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-title-md text-title-md text-on-surface mb-1">{a.title}</h3>
                <p className="font-body-md text-body-md text-on-surface whitespace-pre-wrap">{a.body}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Link
            href={`/${workspaceId}/${teamId}/announcements?offset=${nextOffset}`}
            className="inline-flex items-center justify-center font-semibold rounded-md transition-colors duration-150 px-4 py-2 text-label-md gap-2 bg-surface-container-lowest text-on-surface border border-outline-variant hover:bg-surface-container-low"
          >
            Load more
          </Link>
        </div>
      )}

      {createOpen && (
        <AnnouncementFormModal
          mode="create"
          workspaceId={workspaceId}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            router.refresh();
          }}
        />
      )}

      {editAnnouncement && (
        <AnnouncementFormModal
          mode="edit"
          workspaceId={workspaceId}
          announcement={editAnnouncement}
          onClose={() => setEditAnnouncement(null)}
          onSuccess={() => {
            setEditAnnouncement(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function AnnouncementFormModal({
  mode,
  workspaceId,
  announcement,
  onClose,
  onSuccess,
}: {
  mode: "create" | "edit";
  workspaceId: string;
  announcement?: Announcement;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "create"
      ? createAnnouncementAction.bind(null, workspaceId)
      : updateAnnouncementAction.bind(null, workspaceId, announcement!.id),
    undefined,
  );
  const wasPendingRef = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPendingRef.current = true;
      return;
    }
    if (wasPendingRef.current && !state?.error) {
      wasPendingRef.current = false;
      onSuccess();
    }
  }, [pending, state, onSuccess]);

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === "create" ? "New Announcement" : "Edit Announcement"}
      width="md"
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button form="announcement-form" type="submit" disabled={pending}>
            {pending ? (mode === "create" ? "Posting…" : "Saving…") : mode === "create" ? "Post" : "Save Changes"}
          </Button>
        </>
      }
    >
      <form id="announcement-form" action={formAction} className="flex flex-col gap-5">
        <TextField label="Title" name="title" required defaultValue={announcement?.title} autoFocus />
        <Textarea label="Body" name="body" required defaultValue={announcement?.body} className="min-h-[180px]" />

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

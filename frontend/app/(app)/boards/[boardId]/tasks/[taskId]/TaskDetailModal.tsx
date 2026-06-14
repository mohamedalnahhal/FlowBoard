"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  addChecklistItemAction,
  addCommentAction,
  applyTaskLabelAction,
  removeTaskLabelAction,
  addTaskMemberAction,
  removeTaskMemberAction,
  replyToCommentAction,
  toggleChecklistItemAction,
  toggleCommentReactionAction,
  updateTaskDescriptionAction,
  updateTaskDueDateAction,
} from "@/lib/task-actions";

const REACTION_EMOJIS = ["👍", "❤️", "😄", "🎉", "🚀", "👀"];

type Person = { id: string; display_name: string; username: string };
type Label = { id: string; name: string; color: string };
type ChecklistItem = { id: string; name: string; status: boolean };
type Reaction = { emoji: string; user_id: string };
type Comment = {
  id: string;
  content: string;
  is_edited: boolean;
  created_at: string;
  user: Person;
  replies?: Comment[];
  reactions?: Reaction[];
};
type HistoryEntry = {
  id: string;
  type: string;
  activity: { from?: string; to?: string; user?: string; item?: string; fields?: string[] };
  user: Person;
  created_at: string;
};
type TaskDetail = {
  id: string;
  name: string;
  description: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  list: { id: string; name: string; board_id: string; board: { id: string; name: string; team_id: string } };
  creator: Person;
  task_members: { user: Person; role: number }[];
  task_labels: { label: Label }[];
  task_attachments: { attachment: { id: string; type: string; name: string; url: string } }[];
  checklist: { id: string; checklist_items: ChecklistItem[] } | null;
  task_comments: Comment[];
  task_history: HistoryEntry[];
};

function formatDateTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatDueDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// yyyy-MM-dd for <input type="date">.
function toDateInputValue(iso: string | null) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : "";
}

function attachmentVisual(type: string) {
  if (type.startsWith("image/")) return { icon: "image", className: "bg-secondary-container text-on-secondary-container" };
  if (type === "application/pdf") return { icon: "picture_as_pdf", className: "bg-error-container text-on-error-container" };
  return { icon: "description", className: "bg-surface-container-high text-on-surface-variant" };
}

function joinFields(fields: string[]): string {
  if (fields.length <= 1) return fields[0] ?? "";
  return `${fields.slice(0, -1).join(", ")} and ${fields[fields.length - 1]}`;
}

// Maps a history entry to its icon + the descriptive phrase (everything after
// the user's name).
function activityDisplay(entry: HistoryEntry): { icon: string; detail: ReactNode } {
  const { from, to, user, item, fields } = entry.activity;
  switch (entry.type) {
    case "task_moved":
      return {
        icon: "drag_pan",
        detail: (
          <>
            moved this task from <span className="font-medium text-on-surface-variant">{String(from)}</span> to{" "}
            <span className="font-medium underline">{String(to)}</span>
          </>
        ),
      };
    case "status_change":
      return {
        icon: "sync",
        detail: (
          <>
            changed status from <span className="font-medium text-on-surface-variant">{String(from)}</span> to{" "}
            <span className="font-medium underline">{String(to)}</span>
          </>
        ),
      };
    case "task_assigned":
      return { icon: "person_add", detail: <>assigned <span className="font-medium">{user ?? "a member"}</span></> };
    case "task_unassigned":
      return { icon: "person_remove", detail: <>unassigned <span className="font-medium">{user ?? "a member"}</span></> };
    case "checklist_item_added":
      return { icon: "checklist", detail: <>added checklist item <span className="font-medium">&ldquo;{item}&rdquo;</span></> };
    case "task_updated":
      return { icon: "edit", detail: <>edited the {fields?.length ? joinFields(fields) : "task"}</> };
    default:
      return { icon: "bolt", detail: entry.type.replaceAll("_", " ") };
  }
}

function ActivityEntry({ entry }: { entry: HistoryEntry }) {
  const { icon, detail } = activityDisplay(entry);
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
        <Icon name={icon} className="text-[16px] text-on-surface-variant" />
      </div>
      <p className="font-body-md text-body-md text-on-surface">
        <span className="font-semibold">{entry.user.display_name}</span> {detail}
      </p>
    </div>
  );
}

type CommentEntryProps = {
  comment: Comment;
  boardId: string;
  taskId: string;
  currentUserId: string | null;
  canReply: boolean;
};

function CommentEntry({ comment, boardId, taskId, currentUserId, canReply }: CommentEntryProps) {
  const router = useRouter();
  const replies = comment.replies ?? [];
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Aggregate reactions by emoji (only those actually used), flagging the ones
  // the current user added so their chips can be highlighted.
  const reactions = comment.reactions ?? [];
  const grouped = REACTION_EMOJIS
    .map((emoji) => {
      const users = reactions.filter((r) => r.emoji === emoji);
      return { emoji, count: users.length, mine: !!currentUserId && users.some((r) => r.user_id === currentUserId) };
    })
    .filter((g) => g.count > 0);

  function react(emoji: string) {
    setPickerOpen(false);
    startTransition(async () => {
      await toggleCommentReactionAction(boardId, taskId, comment.id, emoji);
      router.refresh();
    });
  }

  function submitReply(e: React.FormEvent) {
    e.preventDefault();
    const text = replyText.trim();
    if (!text) return;
    startTransition(async () => {
      const res = await replyToCommentAction(boardId, taskId, comment.id, text);
      if (!res?.error) {
        setReplyText("");
        setReplying(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex gap-3">
      <Avatar person={comment.user} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold font-label-md text-label-md text-on-surface">{comment.user.display_name}</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {formatDateTime(comment.created_at)}
            {comment.is_edited ? " · edited" : ""}
          </span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-3 rounded-lg rounded-tl-none font-body-md text-body-md text-on-surface shadow-sm whitespace-pre-wrap break-words">
          {comment.content}
        </div>

        {grouped.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {grouped.map((g) => (
              <button
                key={g.emoji}
                type="button"
                onClick={() => react(g.emoji)}
                disabled={isPending}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[12px] transition-colors disabled:opacity-50 ${g.mine ? "border-primary bg-primary-fixed/30 text-primary" : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"}`}
                title={g.mine ? "Remove reaction" : "React"}
              >
                <span className="leading-none">{g.emoji}</span>
                <span className="font-medium">{g.count}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-4 mt-2">
          {canReply && (
            <button
              type="button"
              onClick={() => setReplying((v) => !v)}
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary hover:underline transition-colors"
            >
              Reply
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary flex items-center gap-1 transition-colors"
            >
              <Icon name="mood" className="text-[14px]" /> React
            </button>
            {pickerOpen && (
              <>
                <button type="button" className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} aria-label="Close" />
                <div className="absolute left-0 top-full mt-1 z-20 flex gap-0.5 p-1.5 bg-surface-container-lowest border border-outline-variant rounded-full shadow-lg">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => react(emoji)}
                      className="w-7 h-7 rounded-full hover:bg-surface-container-high transition-colors text-[16px] leading-none"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {replying && (
          <form onSubmit={submitReply} className="mt-2 flex flex-col gap-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              autoFocus
              rows={2}
              placeholder={`Reply to ${comment.user.display_name}…`}
              className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" type="button" onClick={() => { setReplying(false); setReplyText(""); }}>
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={isPending || !replyText.trim()}>
                {isPending ? "Posting…" : "Reply"}
              </Button>
            </div>
          </form>
        )}

        {replies.length > 0 && (
          <div className="mt-3 ml-4 space-y-3 border-l border-outline-variant pl-4">
            {replies.map((reply) => (
              <CommentEntry
                key={reply.id}
                comment={reply}
                boardId={boardId}
                taskId={taskId}
                currentUserId={currentUserId}
                canReply={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type TeamMember = { id: string; display_name: string; username: string };

export function TaskDetailModal({
  boardId,
  task,
  currentUserId,
  teamMembers = [],
  boardLabels = [],
}: {
  boardId: string;
  task: TaskDetail;
  currentUserId: string | null;
  teamMembers?: TeamMember[];
  boardLabels?: Label[];
}) {
  const router = useRouter();
  const close = () => router.push(`/boards/${boardId}`);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checklistItems = task.checklist?.checklist_items ?? [];
  const checklistDone = checklistItems.filter((i) => i.status).length;
  const checklistPercent = checklistItems.length > 0 ? Math.round((checklistDone / checklistItems.length) * 100) : 0;

  const [syncedChecklist, setSyncedChecklist] = useState(task.checklist);
  const [items, setItems] = useState(checklistItems);
  if (task.checklist !== syncedChecklist) {
    setSyncedChecklist(task.checklist);
    setItems(checklistItems);
  }
  const [toggleError, setToggleError] = useState<string | null>(null);

  function handleToggle(item: ChecklistItem) {
    const nextStatus = !item.status;
    const previous = items;
    setToggleError(null);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: nextStatus } : i)));
    toggleChecklistItemAction(boardId, task.id, item.id, nextStatus).catch(() => {
      setItems(previous);
      setToggleError("You don't have permission to update this checklist.");
    });
  }
  useEffect(() => {
    if (!toggleError) return;
    const timer = setTimeout(() => setToggleError(null), 4000);
    return () => clearTimeout(timer);
  }, [toggleError]);

  const itemsDone = items.filter((i) => i.status).length;
  const itemsPercent = items.length > 0 ? Math.round((itemsDone / items.length) * 100) : checklistPercent;

  // Description editing
  const [editingDesc, setEditingDesc] = useState(false);
  const [descText, setDescText] = useState(task.description);
  const [descSaving, setDescSaving] = useState(false);
  const [descError, setDescError] = useState<string | null>(null);
  const [, startRefreshTransition] = useTransition();

  async function saveDesc() {
    const trimmed = descText.trim();
    if (trimmed === task.description) { setEditingDesc(false); return; }
    setDescSaving(true);
    setDescError(null);
    const result = await updateTaskDescriptionAction(task.list.board.team_id, boardId, task.id, trimmed);
    setDescSaving(false);
    if (result?.error) {
      setDescError(result.error);
    } else {
      setEditingDesc(false);
      startRefreshTransition(() => router.refresh());
    }
  }

  // Due date editing — the backend enforces task:edit, so users without
  // permission get a 403 surfaced as an error (same pattern as the description).
  const [editingDue, setEditingDue] = useState(false);
  const [dueValue, setDueValue] = useState("");
  const [dueSaving, setDueSaving] = useState(false);
  const [dueError, setDueError] = useState<string | null>(null);

  function openDueEditor() {
    setDueValue(toDateInputValue(task.end_date));
    setDueError(null);
    setEditingDue(true);
  }

  async function saveDue(nextValue: string | null) {
    setDueSaving(true);
    setDueError(null);
    const result = await updateTaskDueDateAction(task.list.board.team_id, boardId, task.id, nextValue);
    setDueSaving(false);
    if (result?.error) {
      setDueError(result.error);
    } else {
      setEditingDue(false);
      startRefreshTransition(() => router.refresh());
    }
  }

  // Labels — apply/remove board labels on this task. The backend enforces
  // label:apply, so users without permission get the error surfaced.
  const appliedLabelIds = new Set(task.task_labels.map((tl) => tl.label.id));
  const [labelMenuOpen, setLabelMenuOpen] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [labelPending, startLabelTransition] = useTransition();

  function toggleLabel(labelId: string) {
    const applied = appliedLabelIds.has(labelId);
    setLabelError(null);
    startLabelTransition(async () => {
      const result = applied
        ? await removeTaskLabelAction(task.list.board.team_id, boardId, task.id, labelId)
        : await applyTaskLabelAction(task.list.board.team_id, boardId, task.id, labelId);
      if (result?.error) setLabelError(result.error);
      else router.refresh();
    });
  }

  // Member assignment
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignRole, setAssignRole] = useState(1);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const assignedIds = new Set(task.task_members.map((m) => m.user.id));
  const unassignedMembers = teamMembers.filter((m) => !assignedIds.has(m.id));

  async function handleAssign(userId: string) {
    setAssigningUserId(userId);
    setAssignError(null);
    const result = await addTaskMemberAction(boardId, task.id, userId, assignRole);
    setAssigningUserId(null);
    if (result?.error) {
      setAssignError(result.error);
    } else {
      setAssignOpen(false);
      startRefreshTransition(() => router.refresh());
    }
  }

  async function handleUnassign(userId: string) {
    setAssigningUserId(userId);
    setAssignError(null);
    const result = await removeTaskMemberAction(boardId, task.id, userId);
    setAssigningUserId(null);
    if (result?.error) setAssignError(result.error);
    else startRefreshTransition(() => router.refresh());
  }

  const commentAction = addCommentAction.bind(null, boardId, task.id);
  const [commentState, commentFormAction, commentPending] = useActionState(commentAction, undefined);
  const commentFormRef = useRef<HTMLFormElement>(null);
  const wasCommentSubmittingRef = useRef(false);
  useEffect(() => {
    if (commentPending) { wasCommentSubmittingRef.current = true; return; }
    if (wasCommentSubmittingRef.current && !commentState?.error) {
      wasCommentSubmittingRef.current = false;
      commentFormRef.current?.reset();
      startRefreshTransition(() => router.refresh());
    }
  }, [commentPending, commentState, router, startRefreshTransition]);

  const [addingItem, setAddingItem] = useState(false);
  const checklistAction = addChecklistItemAction.bind(null, boardId, task.id);
  const [checklistState, checklistFormAction, checklistPending] = useActionState(checklistAction, undefined);
  const checklistFormRef = useRef<HTMLFormElement>(null);
  const [, startChecklistTransition] = useTransition();
  const wasChecklistSubmittingRef = useRef(false);
  useEffect(() => {
    if (checklistPending) { wasChecklistSubmittingRef.current = true; return; }
    if (wasChecklistSubmittingRef.current && !checklistState?.error && addingItem) {
      wasChecklistSubmittingRef.current = false;
      checklistFormRef.current?.reset();
      startChecklistTransition(() => setAddingItem(false));
      startRefreshTransition(() => router.refresh());
    }
  }, [checklistPending, checklistState, addingItem, router, startChecklistTransition, startRefreshTransition]);

  const dueDate = formatDueDate(task.end_date);
  const activityFeed = [
    ...task.task_history.map((h) => ({ kind: "history" as const, key: `h-${h.id}`, entry: h })),
    ...task.task_comments.map((c) => ({ kind: "comment" as const, key: `c-${c.id}`, entry: c })),
  ].sort((a, b) => new Date(a.entry.created_at).getTime() - new Date(b.entry.created_at).getTime());

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button type="button" aria-label="Close task details" className="absolute inset-0 bg-on-background/40 backdrop-blur-sm" onClick={close} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={task.name}
        className="relative bg-surface-container-lowest rounded-xl shadow-2xl w-full max-w-[1000px] max-h-[90vh] flex flex-col overflow-hidden border border-outline-variant"
      >
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-surface-variant bg-surface-bright shrink-0">
          <div className="flex gap-4 items-start min-w-0">
            <Icon name="task_alt" className="text-primary text-[28px] mt-1" />
            <div className="min-w-0">
              <div className="flex gap-2 mb-2 flex-wrap items-center">
                {task.task_labels.map(({ label }) => (
                  <span
                    key={label.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full font-label-sm text-label-sm uppercase tracking-wider"
                    style={{ backgroundColor: `${label.color}26`, color: label.color }}
                  >
                    {label.name}
                    <button
                      type="button"
                      onClick={() => toggleLabel(label.id)}
                      disabled={labelPending}
                      className="opacity-60 hover:opacity-100 transition-opacity disabled:opacity-40"
                      title="Remove label"
                      aria-label={`Remove label ${label.name}`}
                    >
                      <Icon name="close" className="text-[12px]" />
                    </button>
                  </span>
                ))}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setLabelMenuOpen((v) => !v)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-dashed border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors font-label-sm text-label-sm"
                  >
                    <Icon name="add" className="text-[14px]" /> Label
                  </button>
                  {labelMenuOpen && (
                    <>
                      <button type="button" className="fixed inset-0 z-10" onClick={() => setLabelMenuOpen(false)} aria-label="Close" />
                      <div className="absolute left-0 top-full mt-1 z-20 w-60 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg overflow-hidden">
                        <p className="px-3 py-2 font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/50">
                          Labels
                        </p>
                        {boardLabels.length === 0 ? (
                          <p className="px-3 py-3 font-body-md text-[12px] text-on-surface-variant">
                            No labels on this board yet. Create them from the board&rsquo;s “Labels” menu.
                          </p>
                        ) : (
                          <div className="max-h-60 overflow-y-auto py-1">
                            {boardLabels.map((label) => {
                              const applied = appliedLabelIds.has(label.id);
                              return (
                                <button
                                  key={label.id}
                                  type="button"
                                  onClick={() => toggleLabel(label.id)}
                                  disabled={labelPending}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-container-low transition-colors text-left disabled:opacity-50"
                                >
                                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                                  <span className="flex-1 truncate font-label-md text-label-md text-on-surface">{label.name}</span>
                                  {applied && <Icon name="check" className="text-primary text-[16px] shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
              {labelError && <p className="font-body-md text-[12px] text-error mb-2">{labelError}</p>}
              <h2 className="font-headline-lg text-headline-lg text-on-surface truncate">{task.name}</h2>
              <div className="font-label-md text-label-md text-on-surface-variant mt-1 flex items-center gap-2 flex-wrap">
                <span>
                  in list{" "}
                  <Link href={`/boards/${boardId}`} className="underline text-on-surface">
                    {task.list.name}
                  </Link>
                </span>
                {currentUserId && task.task_members.some((m) => m.user.id === currentUserId) && (
                  <>
                    <span className="text-outline-variant">•</span>
                    <span className="flex items-center gap-1 text-primary">
                      <Icon name="visibility" className="text-[16px]" /> Watching
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" title="Coming soon" className="p-2 text-on-surface-variant rounded-lg cursor-default opacity-60">
              <Icon name="more_horiz" />
            </button>
            <button type="button" onClick={close} className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors" aria-label="Close">
              <Icon name="close" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row bg-surface">
          {/* Left column */}
          <div className="flex-1 p-6 lg:border-r border-surface-variant space-y-8 bg-surface-container-lowest min-w-0">
            {/* Meta */}
            <div className="flex flex-wrap gap-8">
              <div>
                <h4 className="font-label-sm text-label-sm text-on-surface-variant mb-2 uppercase tracking-wide">Assigned By</h4>
                <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/50">
                  <Avatar person={task.creator} size="xs" />
                  <span className="font-label-md text-label-md text-on-surface">{task.creator.display_name}</span>
                </div>
              </div>
              <div>
                <h4 className="font-label-sm text-label-sm text-on-surface-variant mb-2 uppercase tracking-wide">Assigned To</h4>
                <div className="flex flex-wrap gap-2">
                  {task.task_members.map(({ user, role }) => (
                    <div
                      key={user.id}
                      className={`flex items-center gap-1.5 bg-surface-container-low px-2 py-1 rounded-lg border border-outline-variant/50 group transition-opacity ${assigningUserId === user.id ? "opacity-50" : ""}`}
                    >
                      <Avatar person={user} size="xs" />
                      <span className="font-label-sm text-label-sm text-on-surface">{user.display_name}</span>
                      <span className="font-label-sm text-[10px] text-on-surface-variant">
                        {role === 1 ? "Assignee" : role === 2 ? "Collaborator" : role === 3 ? "Reviewer" : "Member"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUnassign(user.id)}
                        disabled={assigningUserId === user.id}
                        className="ml-0.5 text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
                        title="Remove"
                      >
                        <Icon name="close" className="text-[12px]" />
                      </button>
                    </div>
                  ))}
                  {task.task_members.length === 0 && !assignOpen && (
                    <span className="font-label-md text-label-md text-on-surface-variant">Unassigned</span>
                  )}
                  {/* Assign popover */}
                  {assignOpen ? (
                    <div className="w-full mt-1 p-3 bg-surface-container-low border border-outline-variant rounded-xl shadow-md flex flex-col gap-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Assign member</span>
                        <button type="button" onClick={() => setAssignOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                          <Icon name="close" className="text-[16px]" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <label className="font-label-sm text-label-sm text-on-surface-variant shrink-0">Role:</label>
                        <select
                          value={assignRole}
                          onChange={(e) => setAssignRole(Number(e.target.value))}
                          className="flex-1 px-2 py-1 border border-outline-variant rounded-md font-body-md text-[13px] text-on-surface bg-surface-container-lowest focus:outline-none focus:border-primary transition-all"
                        >
                          <option value={1}>Assignee</option>
                          <option value={2}>Collaborator</option>
                          <option value={3}>Reviewer</option>
                        </select>
                      </div>
                      {unassignedMembers.length === 0 ? (
                        <p className="font-body-md text-[12px] text-on-surface-variant text-center py-2">All team members already assigned.</p>
                      ) : (
                        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                          {unassignedMembers.map((member) => (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => handleAssign(member.id)}
                              disabled={assigningUserId === member.id}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-container-high transition-colors text-left disabled:opacity-50"
                            >
                              <Avatar person={member} size="xs" />
                              <div>
                                <span className="font-label-md text-label-md text-on-surface block">{member.display_name}</span>
                                <span className="font-label-sm text-[11px] text-on-surface-variant">@{member.username}</span>
                              </div>
                              {assigningUserId === member.id && <Icon name="hourglass_empty" className="text-[14px] ml-auto text-on-surface-variant" />}
                            </button>
                          ))}
                        </div>
                      )}
                      {assignError && <p className="font-body-md text-[11px] text-error">{assignError}</p>}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAssignOpen(true)}
                      className="w-8 h-8 rounded-full bg-surface-container-low border border-outline-variant border-dashed flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:border-primary hover:text-primary transition-colors"
                      title="Assign member"
                    >
                      <Icon name="add" className="text-[18px]" />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-label-sm text-label-sm text-on-surface-variant mb-2 uppercase tracking-wide">Due Date</h4>
                {editingDue ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="date"
                      value={dueValue}
                      autoFocus
                      onChange={(e) => setDueValue(e.target.value)}
                      className="w-full px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    {dueError && <p className="font-body-md text-[12px] text-error">{dueError}</p>}
                    <div className="flex items-center gap-2">
                      <Button size="sm" type="button" onClick={() => saveDue(dueValue || null)} disabled={dueSaving || !dueValue}>
                        {dueSaving ? "Saving…" : "Save"}
                      </Button>
                      <Button size="sm" variant="ghost" type="button" onClick={() => setEditingDue(false)} disabled={dueSaving}>
                        Cancel
                      </Button>
                      {task.end_date && (
                        <button
                          type="button"
                          onClick={() => saveDue(null)}
                          disabled={dueSaving}
                          className="ml-auto font-label-sm text-label-sm text-error hover:underline disabled:opacity-50"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                ) : dueDate ? (
                  <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/50">
                    <Icon name="calendar_month" className="text-[18px] text-on-surface-variant" />
                    <span className="font-label-md text-label-md text-on-surface">{dueDate}</span>
                    <button
                      type="button"
                      onClick={openDueEditor}
                      className="ml-auto text-on-surface-variant hover:text-primary transition-colors"
                      title="Edit due date"
                      aria-label="Edit due date"
                    >
                      <Icon name="edit" className="text-[16px]" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={openDueEditor}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors font-label-md text-label-md"
                  >
                    <Icon name="event" className="text-[18px]" /> Add due date
                  </button>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Icon name="subject" className="text-on-surface-variant text-[20px]" />
                <h3 className="font-title-lg text-title-lg font-semibold text-on-surface">Description</h3>
                {!editingDesc && (
                  <button
                    type="button"
                    onClick={() => { setDescText(task.description); setDescError(null); setEditingDesc(true); }}
                    className="ml-auto px-3 py-1 bg-surface-container-low rounded-md font-label-sm text-label-sm text-on-surface border border-outline-variant hover:bg-surface-container-high transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
              <div className="pl-7">
                {editingDesc ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={descText}
                      onChange={(e) => setDescText(e.target.value)}
                      autoFocus
                      rows={4}
                      placeholder="Add a description…"
                      className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg font-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
                    />
                    {descError && <p className="font-body-md text-[12px] text-error">{descError}</p>}
                    <div className="flex items-center gap-2">
                      <Button type="button" size="sm" onClick={saveDesc} disabled={descSaving}>
                        {descSaving ? "Saving…" : "Save"}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditingDesc(false)} disabled={descSaving}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                    {task.description || "No description provided."}
                  </p>
                )}
              </div>
            </div>

            {/* Attachments */}
            {task.task_attachments.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="attach_file" className="text-on-surface-variant text-[20px]" />
                  <h3 className="font-title-lg text-title-lg font-semibold text-on-surface">Attachments</h3>
                  <button
                    type="button"
                    title="Coming soon"
                    className="ml-auto px-3 py-1 bg-surface-container-low rounded-md font-label-sm text-label-sm text-on-surface border border-outline-variant flex items-center gap-1 cursor-default opacity-60"
                  >
                    <Icon name="add" className="text-[16px]" /> Add
                  </button>
                </div>
                <div className="pl-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {task.task_attachments.map(({ attachment }) => {
                    const visual = attachmentVisual(attachment.type);
                    return (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 p-3 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors group min-w-0"
                      >
                        <div className={`w-12 h-12 rounded flex items-center justify-center shrink-0 ${visual.className}`}>
                          <Icon name={visual.icon} />
                        </div>
                        <div className="overflow-hidden min-w-0">
                          <p className="font-label-md text-label-md text-on-surface truncate group-hover:underline">{attachment.name}</p>
                          <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{attachment.type}</p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Checklist */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Icon name="checklist" className="text-on-surface-variant text-[20px]" />
                <h3 className="font-title-lg text-title-lg font-semibold text-on-surface">Checklist</h3>
              </div>
              <div className="pl-7">
                {items.length > 0 && (
                  <div className="flex items-center gap-3 mb-4">
                    <span className="font-label-sm text-label-sm text-on-surface-variant w-8">{itemsPercent}%</span>
                    <ProgressBar value={itemsDone} max={items.length} className="flex-1" />
                  </div>
                )}
                {toggleError && <p className="font-body-md text-[12px] text-error mb-2">{toggleError}</p>}
                <div className="space-y-1">
                  {items.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-start gap-3 p-2 hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={item.status}
                        onChange={() => handleToggle(item)}
                        className="mt-0.5 rounded border-outline-variant text-primary focus:ring-primary"
                      />
                      <span
                        className={`font-body-md text-body-md ${item.status ? "line-through text-on-surface-variant" : "text-on-surface"}`}
                      >
                        {item.name}
                      </span>
                    </label>
                  ))}
                </div>

                {addingItem ? (
                  <form
                    ref={checklistFormRef}
                    action={checklistFormAction}
                    className="flex flex-col gap-2 mt-2 ml-7"
                  >
                    <input
                      name="name"
                      autoFocus
                      placeholder="Item name…"
                      className="w-full px-2.5 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    {checklistState?.error && <p className="font-body-md text-[12px] text-error">{checklistState.error}</p>}
                    <div className="flex items-center gap-2">
                      <Button type="submit" size="sm" disabled={checklistPending}>
                        {checklistPending ? "Adding…" : "Add"}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setAddingItem(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingItem(true)}
                    className="mt-2 ml-7 font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
                  >
                    Add an item
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right column — Activity & Comments */}
          <div className="w-full lg:w-[380px] bg-surface flex flex-col shrink-0">
            <div className="p-6 border-b border-surface-variant flex items-center gap-2 sticky top-0 bg-surface/95 backdrop-blur z-10">
              <Icon name="format_list_bulleted" className="text-on-surface-variant text-[20px]" />
              <h3 className="font-title-lg text-title-lg font-semibold text-on-surface">Activity</h3>
            </div>
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {activityFeed.length === 0 && (
                <p className="font-body-md text-body-md text-on-surface-variant">No activity yet.</p>
              )}
              {activityFeed.map((item) =>
                item.kind === "history" ? (
                  <ActivityEntry key={item.key} entry={item.entry} />
                ) : (
                  <CommentEntry
                    key={item.key}
                    comment={item.entry}
                    boardId={boardId}
                    taskId={task.id}
                    currentUserId={currentUserId}
                    canReply
                  />
                ),
              )}
            </div>
            <form
              ref={commentFormRef}
              action={commentFormAction}
              className="p-6 border-t border-surface-variant bg-surface-container-lowest sticky bottom-0"
            >
              <div className="flex flex-col gap-2">
                <textarea
                  name="content"
                  placeholder="Write a comment…"
                  rows={2}
                  className="w-full bg-surface border border-outline-variant rounded-lg p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none min-h-[80px]"
                />
                {commentState?.error && <p className="font-body-md text-[12px] text-error">{commentState.error}</p>}
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={commentPending}>
                    {commentPending ? "Posting…" : "Save"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { updateTeamAction, addTeamMemberAction, removeTeamMemberAction } from "@/lib/team-actions";
import { createBoardAction, deleteBoardAction } from "@/lib/board-actions";

type Person = { id: string; display_name: string; username: string; email?: string };
type Board = { id: string; name: string; status: string };
type TeamDetail = {
  id: string;
  name: string;
  workspace: { id: string; name: string } | null;
  boards: Board[];
  user_teams: { role: number; user: Person }[];
};

type UserOption = { id: string; display_name: string; username: string; email?: string | null };

const ROLE_LABELS: Record<number, string> = { 0: "Admin", 1: "Lead", 2: "Member", 3: "Viewer" };
const ROLE_TONES: Record<number, "primary" | "secondary" | "neutral"> = { 0: "primary", 1: "primary", 2: "secondary", 3: "neutral" };

function EditTeamNameModal({ team, onClose }: { team: TeamDetail; onClose: () => void }) {
  const router = useRouter();
  const boundAction = updateTeamAction.bind(null, team.id);
  const [state, formAction, pending] = useActionState(boundAction, undefined);

  if (state?.success) {
    return (
      <Modal open onClose={onClose} title="Rename Team" width="sm"
        footer={<Button onClick={() => { onClose(); router.refresh(); }}>Done</Button>}
      >
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-14 h-14 rounded-full bg-[#e6f4ea] flex items-center justify-center">
            <Icon name="check_circle" className="text-[32px] text-[#137333]" />
          </div>
          <p className="font-title-md text-title-md text-on-surface text-center">{state.success}</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title="Rename Team" width="sm"
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button form="rename-team-form" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <form id="rename-team-form" action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface-variant">Team Name</span>
          <input
            name="name"
            required
            defaultValue={team.name}
            autoFocus
            className="px-3 py-2 border border-outline-variant rounded-md font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </label>
        {state?.error && (
          <p className="flex items-center gap-2 text-error font-body-md text-[13px]">
            <Icon name="error" className="text-[16px]" />{state.error}
          </p>
        )}
      </form>
    </Modal>
  );
}

function AddMemberModal({
  team,
  onClose,
  allUsers,
}: {
  team: TeamDetail;
  onClose: () => void;
  allUsers: UserOption[];
}) {
  const router = useRouter();
  const boundAction = addTeamMemberAction.bind(null, team.id);
  const [state, formAction, pending] = useActionState(boundAction, undefined);
  const [search, setSearch] = useState("");

  const existingIds = new Set(team.user_teams.map((ut) => ut.user.id));
  const filtered = allUsers.filter(
    (u) =>
      !existingIds.has(u.id) &&
      (u.display_name.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        (u.email ?? "").toLowerCase().includes(search.toLowerCase())),
  );

  if (state?.success) {
    return (
      <Modal open onClose={onClose} title="Add Member" width="sm"
        footer={<Button onClick={() => { onClose(); router.refresh(); }}>Done</Button>}
      >
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-14 h-14 rounded-full bg-[#e6f4ea] flex items-center justify-center">
            <Icon name="check_circle" className="text-[32px] text-[#137333]" />
          </div>
          <p className="font-title-md text-title-md text-on-surface text-center">{state.success}</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title="Add Member" width="sm"
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button form="add-member-form" type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add Member"}
          </Button>
        </>
      }
    >
      <form id="add-member-form" action={formAction} className="flex flex-col gap-4">
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]" />
          <input
            type="search"
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-outline-variant rounded-md font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <div className="max-h-52 overflow-y-auto flex flex-col gap-1">
          {filtered.length === 0 ? (
            <p className="text-center font-body-md text-on-surface-variant py-4">
              {allUsers.length === 0 ? "No users available." : "No matching users."}
            </p>
          ) : (
            filtered.map((u) => (
              <label key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-container-low cursor-pointer has-[:checked]:bg-primary-container/30 transition-colors">
                <input type="radio" name="user_id" value={u.id} required className="accent-primary w-4 h-4 shrink-0" />
                <Avatar person={u} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-label-md text-label-md text-on-surface font-semibold truncate">{u.display_name}</p>
                  <p className="font-body-md text-on-surface-variant text-[12px]">@{u.username}</p>
                </div>
              </label>
            ))
          )}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md text-on-surface-variant">Role</span>
          <select name="role" defaultValue="3"
            className="px-3 py-2 border border-outline-variant rounded-md font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
            <option value="3">Member</option>
            <option value="2">Leader</option>
            <option value="1">Owner</option>
            <option value="0">Admin</option>
          </select>
        </label>

        {state?.error && (
          <p className="flex items-center gap-2 text-error font-body-md text-[13px]">
            <Icon name="error" className="text-[16px]" />{state.error}
          </p>
        )}
      </form>
    </Modal>
  );
}

export function TeamDetailClient({
  team,
  allUsers,
}: {
  team: TeamDetail;
  allUsers: UserOption[];
}) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Board management
  const [addingBoard, setAddingBoard] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
  const boundCreateBoard = createBoardAction.bind(null, team.id);
  const [boardState, boardFormAction, boardPending] = useActionState(boundCreateBoard, undefined);
  const boardFormRef = useRef<HTMLFormElement>(null);
  const boardWasSubmittingRef = useRef(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (boardPending) { boardWasSubmittingRef.current = true; return; }
    if (boardWasSubmittingRef.current && !boardState?.error && addingBoard) {
      boardWasSubmittingRef.current = false;
      boardFormRef.current?.reset();
      setAddingBoard(false);
      router.refresh();
    }
  }, [boardPending, boardState, addingBoard]);

  function handleDeleteBoard(boardId: string, boardName: string) {
    if (!window.confirm(`Delete board "${boardName}"? This cannot be undone.`)) return;
    setDeletingBoardId(boardId);
    setBoardError(null);
    startTransition(async () => {
      const result = await deleteBoardAction(team.id, boardId);
      setDeletingBoardId(null);
      if (result?.error) setBoardError(result.error);
      else router.refresh();
    });
  }

  function handleRemove(userId: string) {
    setRemovingId(userId);
    setRemoveError(null);
    startTransition(async () => {
      const result = await removeTeamMemberAction(team.id, userId);
      setRemovingId(null);
      if (result?.error) setRemoveError(result.error);
      else router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-col gap-8 max-w-[896px]">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Link href="/teams" className="text-on-surface-variant hover:text-on-surface transition-colors mt-1">
            <Icon name="arrow_back" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-headline-lg text-headline-lg text-on-surface">{team.name}</h1>
              <button
                type="button"
                onClick={() => setRenameOpen(true)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-md hover:bg-surface-container-high transition-colors"
                title="Rename team"
              >
                <Icon name="edit" className="text-[18px]" />
              </button>
            </div>
            {team.workspace && (
              <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">{team.workspace.name}</p>
            )}
          </div>
        </div>

        {removeError && (
          <div className="flex items-center gap-2 p-3 bg-error-container rounded-lg text-on-error-container font-body-md text-[13px]">
            <Icon name="error" className="text-[16px] shrink-0" /> {removeError}
            <button type="button" onClick={() => setRemoveError(null)} className="ml-auto">
              <Icon name="close" className="text-[16px]" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Boards */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-title-lg text-title-lg text-on-surface flex items-center gap-2">
                <Icon name="dashboard" className="text-[20px] text-on-surface-variant" />
                Boards
                <Badge tone="neutral">{team.boards.length}</Badge>
              </h2>
              <Button
                size="sm"
                variant="secondary"
                icon={<Icon name="add" className="text-[16px]" />}
                onClick={() => { setAddingBoard(true); setBoardError(null); }}
              >
                Add
              </Button>
            </div>
            {boardError && (
              <div className="flex items-center gap-2 mb-3 p-2 bg-error-container/20 rounded-lg text-error font-body-md text-[13px]">
                <Icon name="error" className="text-[16px] shrink-0" /> {boardError}
                <button type="button" onClick={() => setBoardError(null)} className="ml-auto">
                  <Icon name="close" className="text-[14px]" />
                </button>
              </div>
            )}
            {addingBoard && (
              <form
                ref={boardFormRef}
                action={boardFormAction}
                className="flex flex-col gap-2 mb-4 p-3 bg-surface-container-low border border-outline-variant rounded-lg"
              >
                <input
                  name="name"
                  autoFocus
                  required
                  placeholder="Board name…"
                  className="w-full px-3 py-2 border border-outline-variant rounded-md font-body-md text-on-surface bg-surface-container-lowest placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                {boardState?.error && <p className="font-body-md text-[12px] text-error">{boardState.error}</p>}
                <div className="flex items-center gap-2">
                  <Button type="submit" size="sm" disabled={boardPending}>
                    {boardPending ? "Creating…" : "Create"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setAddingBoard(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
            {team.boards.length === 0 && !addingBoard ? (
              <p className="font-body-md text-body-md text-on-surface-variant">No boards yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {team.boards.map((board) => (
                  <div
                    key={board.id}
                    className={`flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl transition-all group ${deletingBoardId === board.id ? "opacity-50" : ""}`}
                  >
                    <Link href={`/boards/${board.id}`} className="flex items-center gap-3 flex-1 min-w-0 hover:text-primary transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center shrink-0">
                        <Icon name="dashboard" className="text-on-primary-fixed-variant text-[18px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-label-md text-label-md text-on-surface font-semibold truncate group-hover:text-primary transition-colors">
                          {board.name}
                        </p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant capitalize">
                          {board.status.toLowerCase().replace("_", " ")}
                        </p>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDeleteBoard(board.id, board.name)}
                      disabled={deletingBoardId === board.id || isPending}
                      className="text-on-surface-variant hover:text-error p-1.5 rounded-md hover:bg-error-container/30 transition-colors disabled:opacity-40 shrink-0"
                      title="Delete board"
                    >
                      <Icon name="delete" className="text-[16px]" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Members */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-title-lg text-title-lg text-on-surface flex items-center gap-2">
                <Icon name="group" className="text-[20px] text-on-surface-variant" />
                Members
                <Badge tone="neutral">{team.user_teams.length}</Badge>
              </h2>
              <Button
                size="sm"
                variant="secondary"
                icon={<Icon name="person_add" className="text-[16px]" />}
                onClick={() => setAddMemberOpen(true)}
              >
                Add
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {team.user_teams.map(({ role, user }) => (
                <div
                  key={user.id}
                  className={`flex items-center gap-3 p-3 bg-surface-container-lowest border border-outline-variant rounded-lg transition-opacity ${removingId === user.id ? "opacity-50" : ""}`}
                >
                  <Avatar person={user} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-label-md text-label-md text-on-surface font-semibold truncate">
                      {user.display_name}
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">@{user.username}</p>
                  </div>
                  <Badge tone={ROLE_TONES[role] ?? "neutral"}>
                    {ROLE_LABELS[role] ?? "Member"}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => handleRemove(user.id)}
                    disabled={removingId === user.id || isPending}
                    className="text-on-surface-variant hover:text-error p-1.5 rounded-md hover:bg-error-container/30 transition-colors disabled:opacity-40"
                    title="Remove member"
                  >
                    <Icon name="person_remove" className="text-[16px]" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {renameOpen && <EditTeamNameModal team={team} onClose={() => setRenameOpen(false)} />}
      {addMemberOpen && (
        <AddMemberModal
          team={team}
          onClose={() => setAddMemberOpen(false)}
          allUsers={allUsers}
        />
      )}
    </>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { createBoardFromTeamAction } from "@/lib/board-actions";

type Board = { id: string; name: string; status: string; teamName: string; teamId: string };

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  ARCHIVED: "Archived",
  ON_HOLD: "On Hold",
};

const STATUS_DOTS: Record<string, string> = {
  ACTIVE: "bg-[#137333]",
  ARCHIVED: "bg-on-surface-variant",
  ON_HOLD: "bg-[#b45309]",
};

export function BoardsClient({ boards, teams }: { boards: Board[]; teams: { id: string; name: string }[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [createState, createFormAction, createPending] = useActionState(createBoardFromTeamAction, undefined);
  const createFormRef = useRef<HTMLFormElement>(null);
  const wasCreatingRef = useRef(false);

  useEffect(() => {
    if (createPending) { wasCreatingRef.current = true; return; }
    if (wasCreatingRef.current && !createState?.error && createOpen) {
      wasCreatingRef.current = false;
      createFormRef.current?.reset();
      setCreateOpen(false);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createPending, createState, createOpen]);

  const filtered = boards.filter((b) => {
    const matchesSearch =
      !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.teamName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    const matchesTeam = teamFilter === "all" || b.teamId === teamFilter;
    return matchesSearch && matchesStatus && matchesTeam;
  });

  const groupedByTeam = teams
    .map((team) => ({
      ...team,
      boards: filtered.filter((b) => b.teamId === team.id),
    }))
    .filter((t) => t.boards.length > 0);

  const showingAll = teamFilter === "all";

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Boards</h1>
        <div className="flex items-center gap-3">
          <div className="font-body-md text-on-surface-variant text-[13px]">
            {filtered.length} board{filtered.length !== 1 ? "s" : ""}
          </div>
          {teams.length > 0 && (
            <Button
              type="button"
              icon={<Icon name="add" className="text-[18px]" />}
              onClick={() => setCreateOpen(true)}
            >
              Create Board
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-[448px]">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search boards…"
            className="w-full pl-10 pr-4 py-2 rounded-full border border-outline-variant bg-surface-container-lowest text-label-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        >
          <option value="all">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
          <option value="ON_HOLD">On Hold</option>
        </select>
        {teams.length > 1 && (
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          >
            <option value="all">All Teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
        {(search || statusFilter !== "all" || teamFilter !== "all") && (
          <button
            type="button"
            onClick={() => { setSearch(""); setStatusFilter("all"); setTeamFilter("all"); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low text-label-md transition-colors"
          >
            <Icon name="close" className="text-[16px]" />
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-on-surface-variant">
          <Icon name="dashboard" className="text-[48px]" />
          <p className="font-body-lg text-body-lg">
            {boards.length === 0 ? "No boards yet." : "No boards match your filters."}
          </p>
        </div>
      ) : showingAll ? (
        groupedByTeam.map((team) => (
          <section key={team.id}>
            <h2 className="font-title-lg text-title-lg text-on-surface-variant mb-4 flex items-center gap-2">
              <Icon name="group" className="text-[20px]" />
              {team.name}
              <span className="font-label-sm text-[11px] bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full">
                {team.boards.length}
              </span>
            </h2>
            <BoardGrid boards={team.boards} />
          </section>
        ))
      ) : (
        <BoardGrid boards={filtered} />
      )}

      {/* Create Board Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Board"
        width="sm"
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button form="create-board-form" type="submit" disabled={createPending}>
              {createPending ? "Creating…" : "Create Board"}
            </Button>
          </>
        }
      >
        <form id="create-board-form" ref={createFormRef} action={createFormAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface-variant">Team</span>
            <select
              name="team_id"
              required
              defaultValue=""
              className="px-3 py-2 border border-outline-variant rounded-md font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="" disabled>Select a team…</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface-variant">Board name</span>
            <input
              name="name"
              required
              autoFocus
              placeholder="e.g. Sprint Planning"
              className="px-3 py-2 border border-outline-variant rounded-md font-body-md text-on-surface bg-surface-container-lowest placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </label>
          {createState?.error && (
            <p className="font-body-md text-[12px] text-error">{createState.error}</p>
          )}
        </form>
      </Modal>
    </div>
  );
}

function BoardGrid({ boards }: { boards: Board[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {boards.map((board) => (
        <Link
          key={board.id}
          href={`/boards/${board.id}`}
          className="flex items-center gap-3 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl hover:shadow-md hover:border-primary/30 transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center shrink-0 group-hover:bg-primary-fixed-dim transition-colors">
            <Icon name="dashboard" className="text-on-primary-fixed-variant text-[20px]" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-label-md text-label-md text-on-surface font-semibold truncate group-hover:text-primary transition-colors">
              {board.name}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOTS[board.status] ?? "bg-on-surface-variant"}`} />
              <span className="font-label-sm text-label-sm text-on-surface-variant text-[11px]">
                {STATUS_LABELS[board.status] ?? board.status}
              </span>
            </div>
          </div>
          <Icon name="chevron_right" className="text-on-surface-variant shrink-0 group-hover:text-primary transition-colors" />
        </Link>
      ))}
    </div>
  );
}

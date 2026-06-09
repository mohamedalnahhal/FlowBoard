"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AvatarStack } from "@/components/ui/Avatar";
import { createTeamAction } from "@/lib/team-actions";

type Person = { id: string; display_name: string; username: string };
type Team = {
  id: string;
  name: string;
  description: string | null;
  workspace: { id: string; name: string } | null;
  member_count: number;
  board_count: number;
  lead: Person | null;
  members: Person[];
};

const TEAM_ICONS = ["design_services", "code_blocks", "campaign", "rocket_launch", "groups", "dynamic_form"];
const TEAM_TINTS = [
  "bg-primary-fixed text-on-primary-fixed-variant",
  "bg-tertiary-container/30 text-tertiary",
  "bg-surface-container-highest text-on-surface",
];

function TeamCardMenu({ teamId, onClose }: { teamId: string; onClose: () => void }) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg py-1"
    >
      <button
        type="button"
        onClick={() => { router.push(`/teams/${teamId}`); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-left font-body-md text-on-surface hover:bg-surface-container-low transition-colors"
      >
        <Icon name="visibility" className="text-[16px] text-on-surface-variant" />
        View Team
      </button>
      <button
        type="button"
        onClick={() => { router.push(`/teams/${teamId}`); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-left font-body-md text-on-surface hover:bg-surface-container-low transition-colors"
      >
        <Icon name="group" className="text-[16px] text-on-surface-variant" />
        Manage Members
      </button>
    </div>
  );
}

export function TeamsClient({
  teams,
  workspaceId,
  initialQuery = "",
}: {
  teams: Team[];
  workspaceId: string;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [createOpen, setCreateOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState(createTeamAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [, startTransition] = useTransition();
  const wasSubmittingRef = useRef(false);

  useEffect(() => {
    if (pending) { wasSubmittingRef.current = true; return; }
    if (wasSubmittingRef.current && !state?.error && createOpen) {
      wasSubmittingRef.current = false;
      formRef.current?.reset();
      startTransition(() => setCreateOpen(false));
    }
  }, [pending, state, createOpen, startTransition]);

  const filtered = query
    ? teams.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
    : teams;

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-display text-on-surface mb-1">Teams</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Manage your organization&apos;s groups and functional units.
          </p>
        </div>
        <Button type="button" icon={<Icon name="add" className="text-[20px]" />} onClick={() => setCreateOpen(true)}>
          Create Team
        </Button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1 max-w-screen-md">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter teams..."
            className="w-full pl-10 pr-4 py-2 rounded-full border border-outline-variant bg-surface-container-lowest text-label-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Team cards */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-body-md text-body-md text-on-surface-variant">No teams match your filter.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((team, i) => (
            <Card key={team.id} hoverable className="p-4 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${TEAM_TINTS[i % TEAM_TINTS.length]}`}>
                    <Icon name={TEAM_ICONS[i % TEAM_ICONS.length]} filled />
                  </div>
                  <div>
                    <h3 className="font-title-lg text-title-lg text-on-surface">{team.name}</h3>
                    <Badge tone="secondary" className="mt-1">
                      {team.member_count} {team.member_count === 1 ? "Member" : "Members"}
                    </Badge>
                  </div>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenMenuId(openMenuId === team.id ? null : team.id)}
                    className="text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded-md hover:bg-surface-container-high"
                    aria-label="Team options"
                  >
                    <Icon name="more_vert" />
                  </button>
                  {openMenuId === team.id && (
                    <TeamCardMenu teamId={team.id} onClose={() => setOpenMenuId(null)} />
                  )}
                </div>
              </div>

              <p className="font-body-md text-body-md text-on-surface-variant min-h-[40px]">
                {team.description ?? "No available description"}
              </p>

              <div className="pt-3 border-t border-outline-variant flex justify-between items-center mt-auto">
                <div className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Lead</span>
                  <span className="font-label-md text-label-md text-on-surface">
                    {team.lead?.display_name ?? "Unassigned"}
                  </span>
                </div>
                <AvatarStack people={team.members} max={3} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-on-background/40 backdrop-blur-sm"
            onClick={() => setCreateOpen(false)}
            aria-label="Close"
          />
          <div className="relative bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant w-full max-w-[448px]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/50">
              <h2 className="font-title-lg text-title-lg text-on-surface">Create Team</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="text-on-surface-variant hover:bg-surface-container-high rounded-full p-1.5 transition-colors"
              >
                <Icon name="close" />
              </button>
            </div>
            <form ref={formRef} action={formAction} className="px-6 py-5 flex flex-col gap-4">
              <input type="hidden" name="workspace_id" value={workspaceId} />
              <label className="flex flex-col gap-1.5">
                <span className="font-label-md text-label-md text-on-surface-variant">Team name</span>
                <input
                  name="name"
                  autoFocus
                  placeholder="e.g. Design Team"
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-md font-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </label>
              {state?.error && <p className="font-body-md text-[12px] text-error">{state.error}</p>}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Creating…" : "Create Team"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

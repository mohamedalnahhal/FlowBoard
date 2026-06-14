"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { AvatarStack } from "@/components/ui/Avatar";
import { createGroupAction, deleteGroupAction } from "@/lib/group-actions";
import { groupLabel } from "./action-labels";

type Person = { id: string; display_name: string; username: string; email: string | null };
type Group = {
  id: string;
  name?: string | null;
  all_members: boolean;
  user_groups: { user: Person }[];
};

export function GroupsTab({ teamId, groups }: { teamId: string; groups: Group[] }) {
  const router = useRouter();
  const [addingGroup, setAddingGroup] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const boundCreate = createGroupAction.bind(null, teamId);
  const [createState, createFormAction, createPending] = useActionState(boundCreate, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasSubmittingRef = useRef(false);

  useEffect(() => {
    if (createPending) { wasSubmittingRef.current = true; return; }
    if (wasSubmittingRef.current && !createState?.error && addingGroup) {
      wasSubmittingRef.current = false;
      formRef.current?.reset();
      setAddingGroup(false);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createPending, createState, addingGroup]);

  function handleDelete(groupId: string, label: string) {
    if (!window.confirm(`Delete group "${label}"? This cannot be undone.`)) return;
    setDeletingId(groupId);
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteGroupAction(teamId, groupId);
      setDeletingId(null);
      if (result?.error) setDeleteError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Groups control which users are subject to permission rules.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon={<Icon name="add" className="text-[16px]" />}
          onClick={() => { setAddingGroup(true); setDeleteError(null); }}
        >
          Create Group
        </Button>
      </div>

      {deleteError && (
        <div className="flex items-center gap-2 p-3 bg-error-container/20 rounded-lg text-error font-body-md text-[13px]">
          <Icon name="error" className="text-[16px] shrink-0" /> {deleteError}
          <button type="button" onClick={() => setDeleteError(null)} className="ml-auto">
            <Icon name="close" className="text-[14px]" />
          </button>
        </div>
      )}

      {addingGroup && (
        <form
          ref={formRef}
          action={createFormAction}
          className="flex flex-col gap-3 p-4 bg-surface-container-low border border-outline-variant rounded-lg"
        >
          <label className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface-variant">Group Name</span>
            <input
              name="name"
              required
              autoFocus
              placeholder="e.g. Reviewers"
              className="px-3 py-2 border border-outline-variant rounded-md font-body-md text-on-surface bg-surface-container-lowest placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </label>
          {createState?.error && (
            <p className="font-body-md text-[12px] text-error">{createState.error}</p>
          )}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={createPending}>
              {createPending ? "Creating…" : "Create"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAddingGroup(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {groups.filter((g) => !g.name?.startsWith("__personal__")).length === 0 && !addingGroup && (
          <p className="font-body-md text-body-md text-on-surface-variant py-4 text-center">
            No groups yet. Create one to use in permission rules.
          </p>
        )}
        {groups.filter((g) => !g.name?.startsWith("__personal__")).map((group) => {
          const members = group.user_groups.map((ug) => ug.user);
          const label = group.name ?? groupLabel(group);
          const isDeleting = deletingId === group.id;
          return (
            <div
              key={group.id}
              className={`flex items-center gap-4 p-4 bg-surface-container-lowest border border-outline-variant rounded-xl transition-opacity ${isDeleting ? "opacity-50" : ""}`}
            >
              <div className="w-9 h-9 rounded-lg bg-secondary-container/40 flex items-center justify-center shrink-0">
                <Icon name="group" className="text-secondary text-[18px]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-label-md text-label-md text-on-surface font-semibold truncate">{label}</p>
                  {group.all_members && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-fixed/60 text-primary font-label-sm uppercase tracking-wide">
                      System
                    </span>
                  )}
                </div>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  {members.length} {members.length === 1 ? "member" : "members"}
                </p>
              </div>
              {members.length > 0 && <AvatarStack people={members} max={4} size="xs" />}
              {!group.all_members && (
                <button
                  type="button"
                  onClick={() => handleDelete(group.id, label)}
                  disabled={isDeleting}
                  className="text-on-surface-variant hover:text-error p-1.5 rounded-md hover:bg-error-container/30 transition-colors disabled:opacity-40 shrink-0"
                  title="Delete group"
                >
                  <Icon name="delete" className="text-[18px]" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

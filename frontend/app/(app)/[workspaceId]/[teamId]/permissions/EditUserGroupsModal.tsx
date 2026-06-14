"use client";

import { useActionState, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { updateUserGroupsAction } from "@/lib/permissions-actions";
import { groupLabel } from "./action-labels";

type Person = { id: string; display_name: string; username: string; email: string | null };
type Group = { id: string; all_members: boolean };

export function EditUserGroupsModal({
  teamId,
  user,
  groups,
  memberGroupIds,
}: {
  teamId: string;
  user: Person;
  groups: Group[];
  memberGroupIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const action = updateUserGroupsAction.bind(null, teamId, user.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-on-surface-variant hover:text-primary p-2 rounded-md hover:bg-primary/5 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label={`Edit groups for ${user.display_name}`}
      >
        <Icon name="edit" />
      </button>

      <Modal
        open={open}
        onClose={close}
        title="Edit User Permissions"
        width="lg"
        footer={
          <>
            <Button variant="ghost" onClick={close} type="button">
              Cancel
            </Button>
            <Button form={`edit-groups-${user.id}`} type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save Changes"}
            </Button>
          </>
        }
      >
        <form id={`edit-groups-${user.id}`} action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="all_group_ids" value={groups.map((g) => g.id).join(",")} />

          <div className="flex items-center gap-4 bg-surface-container-low p-4 rounded-lg border border-outline-variant">
            <Avatar person={user} size="md" />
            <div className="flex-1">
              <p className="font-title-lg text-title-lg text-on-surface">{user.display_name}</p>
              <p className="font-label-md text-label-md text-on-surface-variant">{user.email ?? user.username}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-title-lg text-title-lg text-on-surface mb-1">Group Memberships</h3>
            <p className="font-body-md text-[13px] text-on-surface-variant -mt-1 mb-1">
              Permissions are granted via group membership — add or remove this user from groups to change what they
              can do in this team.
            </p>
            {groups.length === 0 && (
              <p className="font-body-md text-body-md text-on-surface-variant italic">No groups exist in this team yet.</p>
            )}
            {groups.map((group) => (
              <label
                key={group.id}
                className="flex items-center justify-between p-3 bg-surface-bright rounded-lg border border-outline-variant hover:border-primary transition-colors cursor-pointer"
              >
                <span className="font-label-md text-label-md text-on-surface">{groupLabel(group)}</span>
                <input
                  type="checkbox"
                  name="group_id"
                  value={group.id}
                  defaultChecked={memberGroupIds.includes(group.id)}
                  className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                />
              </label>
            ))}
          </div>

          {state?.error && <p className="font-body-md text-[13px] text-error">{state.error}</p>}
        </form>
      </Modal>
    </>
  );
}

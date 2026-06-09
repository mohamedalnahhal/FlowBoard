"use client";

import { useActionState, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { createPermissionRuleAction } from "@/lib/permissions-actions";
import { ACTION_LABELS, groupLabel } from "./action-labels";

type Group = { id: string; name?: string | null; all_members: boolean };
type Board = { id: string; name: string };

export function CreateRuleModal({ teamId, groups, boards }: { teamId: string; groups: Group[]; boards: Board[] }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"ALLOW" | "DENY">("ALLOW");
  const [scopeType, setScopeType] = useState("team");
  const action = createPermissionRuleAction.bind(null, teamId);
  const [state, formAction, pending] = useActionState(action, undefined);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <Button type="button" variant="secondary" icon={<Icon name="add_circle" className="text-[18px]" />} onClick={() => setOpen(true)}>
        Create Rule
      </Button>

      <Modal
        open={open}
        onClose={close}
        title="Create New Permission Rule"
        width="md"
        footer={
          <>
            <Button variant="ghost" onClick={close} type="button">
              Cancel
            </Button>
            <Button form="create-rule-form" type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create Rule"}
            </Button>
          </>
        }
      >
        <form id="create-rule-form" action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="type" value={type} />

          <Select label="Permission Action" name="action" defaultValue="" required>
            <option value="" disabled>
              Select an action…
            </option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>

          <div className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface">Type</span>
            <div className="flex p-1 bg-surface-container-low rounded-lg border border-outline-variant w-fit">
              <button
                type="button"
                onClick={() => setType("ALLOW")}
                className={`px-6 py-1.5 rounded-md font-label-md text-label-md flex items-center gap-2 transition-colors ${
                  type === "ALLOW" ? "bg-surface-container-lowest shadow-sm border border-outline-variant text-primary" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Icon name="check_circle" className="text-[16px]" />
                Permit
              </button>
              <button
                type="button"
                onClick={() => setType("DENY")}
                className={`px-6 py-1.5 rounded-md font-label-md text-label-md flex items-center gap-2 transition-colors ${
                  type === "DENY" ? "bg-surface-container-lowest shadow-sm border border-outline-variant text-error" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Icon name="cancel" className="text-[16px]" />
                Deny
              </button>
            </div>
          </div>

          <Select label="Subject" name="group_id" defaultValue="" required hint="Permissions are granted to groups; pick the group this rule targets.">
            <option value="" disabled>
              Select a group…
            </option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {groupLabel(group)}
              </option>
            ))}
          </Select>

          <Select label="Scope" name="scope_type" value={scopeType} onChange={(e) => setScopeType(e.target.value)}>
            <option value="team">Team-wide (All Resources)</option>
            <option value="board">Specific Board</option>
          </Select>

          {scopeType === "board" && (
            <Select label="Target Board" name="scope_id" defaultValue="" required>
              <option value="" disabled>
                Select a board…
              </option>
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </Select>
          )}

          <TextField
            label="Rule Priority"
            name="priority"
            type="number"
            defaultValue={10}
            min={0}
            hint="Determines order of evaluation when conflicts occur."
          />

          {state?.error && <p className="font-body-md text-[13px] text-error">{state.error}</p>}
        </form>
      </Modal>
    </>
  );
}

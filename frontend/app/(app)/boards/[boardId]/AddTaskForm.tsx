"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { createTaskAction } from "@/lib/board-actions";

export function AddTaskForm({ teamId, boardId, listId }: { teamId: string; boardId: string; listId: string }) {
  const [open, setOpen] = useState(false);
  const action = createTaskAction.bind(null, teamId, boardId, listId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state?.error && open) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [pending, state, open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 w-full py-3 flex items-center justify-center gap-2 text-secondary hover:bg-surface-container-low rounded-lg transition-colors border border-dashed border-outline-variant bg-surface-bright"
      >
        <Icon name="add" className="text-[18px]" />
        <span className="font-label-md text-label-md">Add Task</span>
      </button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="mt-2 flex flex-col gap-2 p-2 bg-surface-bright border border-outline-variant rounded-lg">
      <input
        name="name"
        autoFocus
        placeholder="Task name…"
        className="w-full px-2.5 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
      />
      {state?.error && <p className="font-body-md text-[12px] text-error">{state.error}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

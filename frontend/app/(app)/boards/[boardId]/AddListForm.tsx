"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { createListAction } from "@/lib/board-actions";

export function AddListForm({ teamId, boardId }: { teamId: string; boardId: string }) {
  const [open, setOpen] = useState(false);
  const action = createListAction.bind(null, teamId, boardId);
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
        className="w-full py-3 flex items-center justify-center gap-2 text-secondary hover:bg-surface-container-low rounded-lg transition-colors border border-dashed border-outline-variant bg-surface-bright font-label-md text-label-md"
      >
        <Icon name="add" className="text-[18px]" />
        Add List
      </button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2 p-3 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm">
      <input
        name="name"
        autoFocus
        placeholder="List name…"
        className="w-full px-2.5 py-1.5 bg-surface-bright border border-outline-variant rounded-md font-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
      />
      {state?.error && <p className="font-body-md text-[12px] text-error">{state.error}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add List"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

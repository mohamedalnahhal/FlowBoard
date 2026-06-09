"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { createLabelAction, deleteLabelAction } from "@/lib/board-actions";

type Label = { id: string; name: string; color: string };

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
];

export function LabelsModal({
  open,
  onClose,
  teamId,
  boardId,
  labels,
}: {
  open: boolean;
  onClose: () => void;
  teamId: string;
  boardId: string;
  labels: Label[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const wasSubmittingRef = useRef(false);
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]!);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const createAction = createLabelAction.bind(null, teamId, boardId);
  const [state, formAction, pending] = useActionState(createAction, undefined);

  useEffect(() => {
    if (pending) { wasSubmittingRef.current = true; return; }
    if (wasSubmittingRef.current && !state?.error) {
      wasSubmittingRef.current = false;
      formRef.current?.reset();
      setSelectedColor(PRESET_COLORS[0]!);
      startTransition(() => router.refresh());
    }
  }, [pending, state, router, startTransition]);

  async function handleDelete(labelId: string) {
    setDeleting(labelId);
    setDeleteError(null);
    const result = await deleteLabelAction(teamId, boardId, labelId);
    setDeleting(null);
    if (result?.error) {
      setDeleteError(result.error);
    } else {
      startTransition(() => router.refresh());
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Manage Labels" width="sm">
      {/* Existing labels */}
      {labels.length > 0 ? (
        <div className="flex flex-col gap-2 mb-6">
          {labels.map((label) => (
            <div
              key={label.id}
              className="flex items-center gap-3 p-2.5 rounded-lg border border-outline-variant bg-surface-container-low"
            >
              <span
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: label.color }}
              />
              <span className="flex-1 font-label-md text-label-md text-on-surface">{label.name}</span>
              <button
                type="button"
                onClick={() => handleDelete(label.id)}
                disabled={deleting === label.id}
                className="text-on-surface-variant hover:text-error p-1 rounded transition-colors disabled:opacity-50"
                title="Delete label"
              >
                <Icon name={deleting === label.id ? "hourglass_empty" : "delete"} className="text-[18px]" />
              </button>
            </div>
          ))}
          {deleteError && <p className="font-body-md text-[12px] text-error">{deleteError}</p>}
        </div>
      ) : (
        <p className="font-body-md text-body-md text-on-surface-variant mb-6">
          No labels yet. Create your first one below.
        </p>
      )}

      {/* Create label form */}
      <form ref={formRef} action={formAction} className="flex flex-col gap-4 pt-4 border-t border-outline-variant/50">
        <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
          Add a label
        </h3>

        {/* Hidden color value */}
        <input type="hidden" name="color" value={selectedColor} />

        <div className="flex flex-col gap-1.5">
          <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="label-name">
            Name
          </label>
          <input
            id="label-name"
            name="name"
            placeholder="e.g. Bug, Feature, Urgent…"
            required
            className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-label-sm text-label-sm text-on-surface-variant">Color</label>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedColor(c)}
                className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110 focus:outline-none"
                style={{
                  backgroundColor: c,
                  borderColor: selectedColor === c ? "var(--color-on-surface)" : "transparent",
                  transform: selectedColor === c ? "scale(1.15)" : undefined,
                }}
                title={c}
                aria-label={`Select color ${c}`}
              />
            ))}
            <label
              className="w-7 h-7 rounded-full overflow-hidden border-2 border-outline-variant hover:border-primary transition-all cursor-pointer"
              title="Custom color"
            >
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-9 h-9 -m-1 cursor-pointer opacity-0 absolute"
              />
              <span
                className="block w-full h-full rounded-full"
                style={{ backgroundColor: PRESET_COLORS.includes(selectedColor) ? "#6b7280" : selectedColor }}
                title="Custom"
              >
                <Icon name="colorize" className="text-white text-[14px] flex items-center justify-center w-full h-full" />
              </span>
            </label>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="w-5 h-5 rounded-full border border-outline-variant shrink-0"
              style={{ backgroundColor: selectedColor }}
            />
            <span className="font-label-sm text-label-sm text-on-surface-variant">{selectedColor}</span>
          </div>
        </div>

        {state?.error && (
          <p className="font-body-md text-[12px] text-error">{state.error}</p>
        )}

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Creating…" : "Create Label"}
        </Button>
      </form>
    </Modal>
  );
}

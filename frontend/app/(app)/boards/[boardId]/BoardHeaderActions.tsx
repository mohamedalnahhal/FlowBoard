"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { LabelsModal } from "./LabelsModal";

type Label = { id: string; name: string; color: string };

export function BoardHeaderActions({
  teamId,
  boardId,
  labels,
}: {
  teamId: string;
  boardId: string;
  labels: Label[];
}) {
  const [labelsOpen, setLabelsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setLabelsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors font-label-md text-label-md"
      >
        <Icon name="label" className="text-[18px]" />
        Labels
        {labels.length > 0 && (
          <span className="bg-surface-container-high text-on-surface-variant font-label-sm text-[11px] px-1.5 py-0.5 rounded-full">
            {labels.length}
          </span>
        )}
      </button>

      <button
        type="button"
        title="Coming soon"
        className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-secondary hover:bg-surface-container-low transition-colors font-label-md text-label-md cursor-default opacity-60"
      >
        <Icon name="filter_list" className="text-[18px]" />
        Filter
      </button>

      <LabelsModal
        open={labelsOpen}
        onClose={() => setLabelsOpen(false)}
        teamId={teamId}
        boardId={boardId}
        labels={labels}
      />
    </>
  );
}

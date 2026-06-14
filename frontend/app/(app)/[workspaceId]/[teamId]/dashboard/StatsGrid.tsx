"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export type StatColor = "primary" | "tertiary" | "secondary" | "error";

export type StatOption = {
  key: string;
  label: string;
  value: number;
  hint: string;
  icon: string;
  color: StatColor;
};

// The selection is a per-user UI preference, so it lives in localStorage rather
// than the backend. Versioned key so the shape can change safely later.
const STORAGE_KEY = "dashboard_stats_v1";
const DEFAULT_KEYS = ["my_tasks", "boards"];
const STAT_COUNT = 2;

const BADGE: Record<StatColor, string> = {
  primary:   "bg-primary-fixed text-primary group-hover:bg-primary group-hover:text-white",
  tertiary:  "bg-tertiary-fixed text-tertiary-container group-hover:bg-tertiary-container group-hover:text-white",
  secondary: "bg-secondary-container text-secondary group-hover:bg-secondary group-hover:text-white",
  error:     "bg-error-container/40 text-error group-hover:bg-error group-hover:text-on-error",
};

// Keeps only valid, de-duplicated keys and pads to exactly STAT_COUNT using the
// defaults (then any remaining options). Also drops keys whose option no longer
// exists — e.g. a stat that was removed since the user last chose it.
function sanitize(keys: string[], options: StatOption[]): string[] {
  const valid = options.map((o) => o.key);
  const result = [...new Set(keys.filter((k) => valid.includes(k)))].slice(0, STAT_COUNT);
  for (const k of [...DEFAULT_KEYS, ...valid]) {
    if (result.length === STAT_COUNT) break;
    if (valid.includes(k) && !result.includes(k)) result.push(k);
  }
  return result.slice(0, STAT_COUNT);
}

const noopSubscribe = () => () => {};

export function StatsGrid({ options }: { options: StatOption[] }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  // The selection made this session (after a Save), which wins over storage.
  const [override, setOverride] = useState<string[] | null>(null);

  // Read the persisted selection after hydration without a setState-in-effect
  // cascade. getSnapshot returns the raw string (a stable primitive); SSR and
  // the first client render use the defaults so the markup matches.
  const stored = useSyncExternalStore(
    noopSubscribe,
    () => localStorage.getItem(STORAGE_KEY),
    () => null,
  );

  const selected = useMemo(() => {
    if (override) return sanitize(override, options);
    if (stored) {
      try {
        return sanitize(JSON.parse(stored), options);
      } catch {
        // ignore malformed storage
      }
    }
    return sanitize(DEFAULT_KEYS, options);
  }, [override, stored, options]);

  function openEditor() {
    setDraft(selected);
    setEditing(true);
  }

  function toggle(key: string) {
    // Adding a third stat replaces the oldest, so reaching exactly two is easy.
    setDraft((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key].slice(-STAT_COUNT)));
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // ignore storage failures (e.g. private mode)
    }
    setOverride(draft);
    setEditing(false);
  }

  const cards = selected
    .map((key) => options.find((o) => o.key === key))
    .filter((o): o is StatOption => Boolean(o));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-label-md text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
          Overview
        </h2>
        <button
          type="button"
          onClick={openEditor}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors font-label-sm text-label-sm"
        >
          <Icon name="tune" className="text-[18px]" />
          Customize
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {cards.map((stat) => (
          <Card key={stat.key} hoverable className="p-6 flex flex-col justify-between group">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-label-md text-label-md font-semibold text-on-surface-variant">{stat.label}</h3>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${BADGE[stat.color]}`}>
                <Icon name={stat.icon} filled />
              </div>
            </div>
            <div>
              <p className="font-display text-display text-on-surface">{stat.value}</p>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">{stat.hint}</p>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Customize stats"
        width="sm"
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={draft.length !== STAT_COUNT}>
              Save
            </Button>
          </>
        }
      >
        <p className="font-body-md text-[13px] text-on-surface-variant mb-3">
          Choose {STAT_COUNT} stats to show on your dashboard.
        </p>
        <div className="flex flex-col gap-2">
          {options.map((opt) => {
            const active = draft.includes(opt.key);
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggle(opt.key)}
                aria-pressed={active}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${active ? "border-primary bg-primary-fixed/20" : "border-outline-variant hover:bg-surface-container-low"}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${BADGE[opt.color]}`}>
                  <Icon name={opt.icon} className="text-[18px]" filled />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-label-md text-label-md text-on-surface font-semibold">{opt.label}</p>
                  <p className="font-body-md text-[12px] text-on-surface-variant truncate">{opt.hint}</p>
                </div>
                <span className="font-display text-title-lg text-on-surface-variant">{opt.value}</span>
                <Icon
                  name={active ? "check_circle" : "radio_button_unchecked"}
                  className={`text-[20px] shrink-0 ${active ? "text-primary" : "text-outline"}`}
                  filled={active}
                />
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}

# Run exec-2026-07-05-calendar-new-event-fix

- Goal: Fix the calendar "New Event" form so it submits reliably when the all-day toggle is used.
- Agent: OpenCode (in-session execution)
- Started: 2026-07-05
- Primer source: TaskBoard AGENTS.md rule 2026-07-04
- Refine pattern: Senior frontend engineer + hostile peer reviewer
- Acceptance criteria:
  1. `EventFormModal` date inputs remount when `allDay` changes so `defaultValue` always matches the active input type.
  2. No render-side mutation of `initialDate`.
  3. Bound server action created outside `useActionState` to match codebase convention.
  4. `npx eslint "app/(app)/[workspaceId]/[teamId]/calendar/" --max-warnings 0` passes.
  5. `npx tsc --noEmit` passes.
  6. `npm run build` passes.
- Status: completed

## Output
- File changed: `frontend/app/(app)/[workspaceId]/[teamId]/calendar/EventFormModal.tsx`
  - Added `Fragment` import and keyed `<Fragment key="all-day">` / `<Fragment key="timed">` wrappers around the start/end inputs so React remounts them when `allDay` changes; this ensures `defaultValue` always matches the active input type.
  - Removed render-side mutation of `initialDate` by cloning before calling `setHours`.
  - Moved the bound server action outside `useActionState` to match the codebase convention.
- Verification:
  - `npx eslint "app/(app)/[workspaceId]/[teamId]/calendar/" --max-warnings 0` ✅
  - `npx tsc --noEmit` ✅
  - `npm run build` ✅
- Final reviewer pass: senior frontend engineer — no additional issues found.

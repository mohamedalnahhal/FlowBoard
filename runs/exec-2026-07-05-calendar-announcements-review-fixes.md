# Run exec-2026-07-05-calendar-announcements-review-fixes

- Goal: Fix all issues found in the Calendar + Announcements review.
- Stack: Next.js 16.2.7 App Router, React 19.2.4, Tailwind v4, custom UI primitives, server actions, `api.ts` (`cache: no-store`).
- Started: 2026-07-05
- Primer source: TaskBoard AGENTS.md rule 2026-07-04

## Fixes

### Calendar
1. **Recurring occurrences break interactions** — gate: occurrences (`parent_event_id` set) are not draggable, and EventDetailModal hides Edit/Delete and shows a "recurring occurrence" note. (No create-recurrence UI exists, so this is the safe bound.)
2. **Back/forward stale grid** — CalendarClient derives `view/year/month/day` from `useSearchParams()` instead of once-seeded `useState`.
3. **Timezone inconsistency (form vs drag)** — EventFormModal converts date inputs to absolute ISO (`new Date(local).toISOString()`) client-side via hidden inputs; server action drops naive `normalizeDateInput`. Drag path already sends absolute ISO. Fetch window widened ±1 day to cover TZ offset at grid edges.
4. **Day clamp** — page.tsx clamps `day` to the month's real length (no roll-over).
5. **Cross-midnight events** — overlap.ts clamps event minutes to the column's day `[0,1440]`.
6. **Task drop loses time-of-day** — task drag payload carries `sourceHour/sourceMinute`; `formatTaskDrop` preserves them.

### Cleanup
7. utils.ts imports `CalendarEvent`/`TaskDeadline` from `./types` (removes duplicate drift-prone decls) and drops unused `getDayHours`.
8. `revalidatePath("/", "layout")` narrowed to the calendar page pattern in calendar-actions.
9. page.tsx role check simplified (`user.role <= 2`).

### Announcements
10. **"Load more" discarded first page** — client-side accumulation via new `fetchAnnouncementsPageAction`; button appends the next page instead of navigating to `?offset=`.

### Build fix (blocking)
11. **`"use server"` module invalidated by non-async export** — `announcement-actions.ts` exported `const ANNOUNCEMENTS_PAGE_SIZE = 20`. A `"use server"` file may only export async functions; the plain-value export made Turbopack report the whole module as having "no exports at all", so every server-action import failed at build. `tsc` passed (types don't model the directive constraint) but `next build` failed. Fix: drop `export` (the const is only used inside the file). The `type` export is erased and stays.

## Acceptance
- `npx eslint "app/(app)/[workspaceId]/[teamId]/calendar/" "app/(app)/[workspaceId]/[teamId]/announcements/" "lib/" --max-warnings 0` ✅
- `npx tsc --noEmit` ✅
- `npm run build` ✅

## Status: completed

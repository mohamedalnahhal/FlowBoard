# Run exec-2026-07-04-calendar-recurring

- **Goal:** Add full recurring-event support to the team calendar: create series, edit series, edit single occurrence, delete series, delete single occurrence.
- **Agent:** OpenCode (in-session)
- **Started:** 2026-07-04
- **Primer source:** Reused Loop 1–2 primer (TaskBoard frontend: Next.js 16, React 19, Tailwind v4; backend: Express 5 + Prisma)
- **Refine pattern:** Senior backend engineer + principal architect
- **Status:** in_progress

## Approved Scope (Loop 3 of 3)

- A: Simple recurrence patterns — daily, weekly, monthly, yearly
- B: End condition — never, count, or until date
- C: Edit/delete single occurrence
- D: Edit/delete whole series

## Out of Scope

- Complex RRULE features (BYDAY, BYMONTHDAY, etc.)
- Drag-and-drop on recurring occurrences
- Recurring task deadlines

## Implementation Plan

1. Update Prisma schema:
   - Add `recurrence_rule Json?` to `CalendarEvent`.
   - Add `CalendarEventException` model.
2. Run `prisma migrate dev` to create migration.
3. Backend (`backend/src/routes/calendarEvents.ts`):
   - Accept `recurrence_rule` in POST/PATCH.
   - Add `POST /:eventId/exceptions` for occurrence edit/delete.
   - Expand recurring events in GET using `date-fns` helpers.
   - Return occurrences with `parent_event_id` and virtual `id`.
4. Frontend actions:
   - Update `createCalendarEventAction` and `updateCalendarEventAction` to accept recurrence_rule.
   - Add `editCalendarEventExceptionAction`.
5. Frontend components:
   - Update `types.ts` with `parent_event_id`, `is_recurring`.
   - Add recurrence UI to `EventFormModal`.
   - Add recurring indicator to `CalendarEventItem`.
   - Add series/occurrence actions to `EventDetailModal`.
   - Disable drag on recurring occurrences.
6. Verification:
   - `npm run build` passes.
   - `npx eslint` clean on changed directories.
   - Manual checks: create series, edit occurrence, delete occurrence, edit series, delete series.

## Acceptance Criteria

- [ ] `npm run build` passes with no new errors.
- [ ] Prisma migration applies cleanly.
- [ ] Recurring events can be created with daily/weekly/monthly/yearly patterns.
- [ ] End conditions (never/count/until) are enforced.
- [ ] Occurrences render in month/week/day/agenda views.
- [ ] Recurring indicator appears on event pills.
- [ ] Single occurrence can be edited.
- [ ] Single occurrence can be deleted.
- [ ] Whole series can be edited.
- [ ] Whole series can be deleted.
- [ ] Drag-and-drop is disabled on recurring occurrences.
- [ ] Non-recurring events behave exactly as before.

## Output

[To be updated on completion]

# Run exec-2026-07-04-announcements-harden

- **Goal:** Harden the existing Announcements feature (Loop 1 of PURE): fix silent API errors, align frontend permission checks with backend, replace broad revalidation, use date-fns consistently, and pass lint/build.
- **Agent:** OpenCode (in-session execution)
- **Started:** 2026-07-04
- **Primer source:** AGENTS.md TaskBoard primer (Next.js 16, React 19, Tailwind v4, custom UI primitives in /components/ui, server actions in /lib/*-actions.ts, API wrapper in /lib/api.ts)
- **Refine pattern:** Senior frontend engineer + auth-focused reviewer
- **Acceptance criteria:**
  - [x] Announcements API errors are no longer silently swallowed in `page.tsx`
  - [x] Frontend permission checks match backend intent and system admins can view
  - [x] `date-fns` used for date formatting in `AnnouncementsClient.tsx`
  - [x] Server actions revalidate targeted routes, not the whole app layout
  - [x] Delete action errors are visible to the user
  - [x] `npx eslint frontend/app/(app)/[workspaceId]/[teamId]/announcements/` passes
  - [x] `npm run build` in `frontend/` passes
- **Status:** completed

## Output

Files touched:
- `frontend/app/(app)/[workspaceId]/[teamId]/announcements/page.tsx`
- `frontend/app/(app)/[workspaceId]/[teamId]/announcements/AnnouncementsClient.tsx`
- `frontend/lib/announcement-actions.ts`

Changes:
1. `page.tsx` — removed `.catch(() => ({ items: [], total: 0 }))` swallow; added explicit try/catch that maps 403/404 to `notFound()` and lets other errors propagate to the error boundary. Added `WORKSPACE_ADMIN_ROLE` constant and documented why `user.role <= WORKSPACE_ADMIN_ROLE` matches the backend (`activeTeam` presence implies workspace membership).
2. `AnnouncementsClient.tsx` — replaced `toLocaleDateString("en-US")` with `date-fns` `format(..., "MMM d, yyyy")`. Added `deleteError` state and surfaced delete-action failures inline under the confirm/cancel buttons. Passed `teamId` into `AnnouncementFormModal` so server actions can revalidate targeted routes.
3. `announcement-actions.ts` — added `teamId` parameter to all three actions; replaced broad `revalidatePath("/", "layout")` with a helper that revalidates `/${workspaceId}/${teamId}/announcements` and `/${workspaceId}/${teamId}/dashboard`.

Verification:
- `npx eslint "frontend/app/(app)/[workspaceId]/[teamId]/announcements/"` — clean
- `npm run build` in `frontend/` — passed

Deferred:
- Full system-admin view fallback without team membership requires a backend endpoint to fetch arbitrary team/workspace data; left out of Loop 1 because the current route model requires an active team.

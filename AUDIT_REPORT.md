# Site Audit Report
**Date:** 2026-06-10
**Auditor:** Claude Code

## Summary

| Category | Issues Found | Issues Fixed | Additions Made |
|---|---|---|---|
| Code Quality | 6 | 6 | — |
| Bugs & Correctness | 5 | 5 | — |
| Performance | 2 | 2 | — |
| Security | 9 | 9 | — |
| Accessibility | 2 | 2 | — |
| UI & UX | 2 | 2 | — |
| Developer Experience | 3 | 3 | — |
| Smart Additions | — | — | 4 |

**Stack:** Express 5 + Prisma + PostgreSQL backend (`backend/`), Next.js 16 (App Router) + React 19 frontend (`frontend/`). Runs via `docker compose up` (frontend `:6001`, backend `:6000`, postgres `:5432`).

Verification after changes: backend `tsc --noEmit` clean, frontend `tsc --noEmit` clean, frontend ESLint down from **3 errors + 9 warnings → 0 errors + 1 warning** (documented below). Authorization fixes were smoke-tested against the running containers with seed users (see notes per finding). The new unique-username migration was applied to the live database.

---

## Detailed Findings

### 🔴 Critical Issues Fixed

**1. Any authenticated user could create users and self-escalate to System Admin** — [backend/src/routes/users.ts](backend/src/routes/users.ts)
`POST /users` had no role check, so any logged-in user (even a read-only viewer) could create accounts — including `role: 0` (System Admin). Combined with `PATCH /users/:userId`, which accepted a `role` field with no authorization, this was a full privilege-escalation path.
- Fixed `POST /users`: now requires the requester to be a workspace admin (role ≤ 2) and forbids creating a user with a higher role than the requester's own. Added password-length and role-range (0–4) validation.
- Fixed `PATCH /users/:userId`: removed the ability to change `role` entirely (role changes must go through the dedicated `/role` endpoint), and restricted profile edits of *other* users to workspace admins.
- Hardened `PATCH /users/:userId/role`: added role-range validation and a ceiling so a requester cannot grant a role more privileged than their own.
- *Verified:* Dave (role 3) now gets `403` creating a user or changing a role; Alice (role 1) gets `403` trying to grant role 0; Alice can still create a role-3 member (`201`).

**2. Missing authorization on workspace-scoped read/write endpoints** — [backend/src/routes/workspaces.ts](backend/src/routes/workspaces.ts), [backend/src/routes/dashboard.ts](backend/src/routes/dashboard.ts)
Several endpoints took a `workspace_id`/`team_id`/`board_id` from the caller and returned or mutated data without checking the caller belonged to that scope (IDOR). Fixed:
- `GET /workspaces/:id` and `GET /workspaces/:id/members` — now require workspace membership (system admins exempt).
- `DELETE /workspaces/:id/members/:userId` — now requires the requester to be a workspace admin *and* a member (previously any member could remove anyone).
- `GET /dashboard/announcements`, `GET /dashboard/calendar-events`, `GET /dashboard/activity?team_id=`, `POST /dashboard/favorites` — now verify workspace/team/board membership before returning or writing data.

**3. Team data readable/writable by non-leads and cross-workspace users** — [backend/src/routes/teams.ts](backend/src/routes/teams.ts)
- `GET /teams` listed *all* teams in the system to any user. Now non-admins only see teams in workspaces they belong to.
- `PATCH /teams/:id`, `POST /teams/:id/members`, `DELETE /teams/:id/members/:userId` used `canAccessTeam` (any member). Mutations now use a stricter `canManageTeam` (workspace admin or team lead).
- `POST /teams` now verifies the caller belongs to the target workspace before creating a team in it.

### 🟡 Moderate Issues Fixed

**4. Task could be moved into another board via the move endpoint** — [backend/src/routes/boards.ts](backend/src/routes/boards.ts)
`PATCH .../tasks/:taskId/move` trusted `list_id` from the body without checking it belonged to the board the permission check was scoped to — a user with move rights on board A could relocate a task into board B. Now validates the target list belongs to the URL's board, and validates `position` is an integer.

**5. Attachment URLs accepted any scheme (stored XSS vector)** — [backend/src/routes/tasks.ts](backend/src/routes/tasks.ts)
`POST /tasks/:taskId/attachments` stored an arbitrary `url` that the UI renders as a clickable link. A `javascript:` URL would execute on click. Now validates the URL parses and uses `http`/`https` only.

**6. Username had no uniqueness constraint** — [backend/prisma/schema.prisma](backend/prisma/schema.prisma), [backend/prisma/migrations/20260610000000_unique_username/](backend/prisma/migrations/20260610000000_unique_username/migration.sql)
`User.username` was non-unique, yet login does `findFirst({ where: { username } })` and user-creation relied on a P2002 catch that could never fire. Added `@unique` plus a migration. **The live DB already contained a duplicate (`M2003` ×2)**, so the migration deduplicates existing rows (oldest kept, others suffixed) before adding the index. Migration applied successfully to the running database.

**7. Frontend search was broken** — [frontend/components/shell/TopHeader.tsx](frontend/components/shell/TopHeader.tsx), [frontend/app/api/search/route.ts](frontend/app/api/search/route.ts)
The header search fetched `http://localhost:3001/search` (wrong port, unreachable from the browser, no auth cookie forwarding) and read `task.title`, but the API returns `task.name`. Added a same-origin proxy route handler (`/api/search`) that forwards the session cookie to the backend, and corrected the field to `task.name`. *Verified:* proxy returns results for an authenticated user and `401` when unauthenticated.

**8. Board status filter used a non-existent enum value** — [frontend/app/(app)/boards/BoardsClient.tsx](frontend/app/(app)/boards/BoardsClient.tsx)
The status dropdown and label/dot maps used `ON_HOLD`, but the Prisma `BoardStatus` enum is `ACTIVE | ARCHIVED | CLOSED`. `CLOSED` boards showed a raw label and the "On Hold" filter matched nothing. Replaced with `CLOSED`.

### 🟢 Minor Issues Fixed

**9. ESLint errors — `set-state-in-effect`** — [frontend/components/ui/Modal.tsx](frontend/components/ui/Modal.tsx), [frontend/components/shell/Sidebar.tsx](frontend/components/shell/Sidebar.tsx)
Both used a mount/localStorage `useEffect` + `setState` pattern that triggers cascading renders (a React Compiler error in this config). Replaced with `useSyncExternalStore` for SSR-safe hydration without the cascade.

**10. ESLint error — `prefer-const`** and **unused import** — [frontend/app/(app)/permissions/page.tsx](frontend/app/(app)/permissions/page.tsx)
`let userPermissionsMap` never reassigned → `const`. Removed unused `groupLabel` import.

**11. Unused loop variable** — [frontend/app/(app)/page.tsx](frontend/app/(app)/page.tsx)
`upcoming.map((event, i) => …)` never used `i`. Removed.

**12. Stale `exhaustive-deps` suppressions / missing deps** — [frontend/app/(app)/teams/[teamId]/TeamDetailClient.tsx](frontend/app/(app)/teams/[teamId]/TeamDetailClient.tsx), [frontend/app/(app)/boards/BoardsClient.tsx](frontend/app/(app)/boards/BoardsClient.tsx), [frontend/app/(app)/permissions/UserPermissionsModal.tsx](frontend/app/(app)/permissions/UserPermissionsModal.tsx)
Removed unnecessary `eslint-disable` directives and added the missing `router`/`startTransition` dependencies.

**13. Misplaced `eslint-disable` and product naming inconsistency** — [frontend/components/ui/Avatar.tsx](frontend/components/ui/Avatar.tsx), [frontend/components/shell/Sidebar.tsx](frontend/components/shell/Sidebar.tsx)
Moved the `no-img-element` disable onto the correct line. The sidebar logo said "TaskHub" while the rest of the app is "FlowBoard" — unified to FlowBoard.

**14. Duplicated `requireAuth` / role helpers across 5 routers** — [backend/src/lib/auth.ts](backend/src/lib/auth.ts)
Each router redefined its own `requireAuth`. Extracted shared `requireAuth`, `getUserRole`, `isSystemAdmin`, `isWorkspaceAdmin`, `isWorkspaceMember`, `isTeamMember` helpers and reused them across `users`, `workspaces`, `teams`, `dashboard`.

**15. Missing Prisma error mapping** — [backend/src/app.ts](backend/src/app.ts)
The error handler mapped `P2025`/`P2002` but not `P2003` (FK violation, e.g. adding a member referencing a non-existent user) which fell through to a generic 500. Added a `400` mapping.

### ✨ Smart Additions

1. **Global error boundary** — [frontend/app/error.tsx](frontend/app/error.tsx): top-level `error.tsx` with a styled fallback and a retry button (uses this Next.js fork's `unstable_retry` API, confirmed against the bundled docs), logging the error in an effect.
2. **404 / Not Found page** — [frontend/app/not-found.tsx](frontend/app/not-found.tsx): branded not-found UI; the app already calls `notFound()` for missing/forbidden boards, tasks, and teams, so this now renders consistently. *Verified:* unknown routes return HTTP 404.
3. **Loading skeleton** — [frontend/app/(app)/loading.tsx](frontend/app/(app)/loading.tsx): a route-level pulse skeleton for the main content area during server-component data fetches.
4. **Metadata title template** — [frontend/app/layout.tsx](frontend/app/layout.tsx): added a `%s | FlowBoard` title template so per-page titles compose cleanly.

Plus: a production safety guard in [backend/src/app.ts](backend/src/app.ts) that refuses to boot if `SESSION_SECRET` is still the dev default in production, and an updated [backend/.env.example](backend/.env.example) documenting `SESSION_SECRET`.

### ⚠️ Issues Found But NOT Fixed

- **`@next/next/no-page-custom-font` warning** ([frontend/app/layout.tsx](frontend/app/layout.tsx)): the Material Symbols icon font is loaded via a `<link>` in `<head>`. Migrating an icon font to `next/font` is non-trivial and changes icon-loading behavior app-wide; left as-is. Low impact (a single global stylesheet, already in the root layout).
- **`npm audit` — moderate PostCSS advisory via `next`** (frontend): `npm audit` reports a transitive PostCSS advisory whose only "fix" is `next@9.3.3`, a massive downgrade that would break the entire App Router. Not actionable without a Next.js patch release; should be revisited when Next ships an update. Backend `npm audit`: **0 vulnerabilities**.
- **`<img>` in Avatar** ([frontend/components/ui/Avatar.tsx](frontend/components/ui/Avatar.tsx)): Next suggests `next/image`. Avatars are tiny, optional (`avatar_url` is rarely set), and `next/image` needs remote-host config that isn't established. Kept the raw `<img>` with a scoped disable.
- **"Coming soon" placeholder UI** (board view tabs, comment Reply/React, attachment Add, filter): these are intentional stubs, not bugs — left untouched per the "don't add unimplied features" constraint.
- **`SESSION_SECRET` is the dev default in the committed `backend/.env`**: this is a local dev file; rotating it is a deployment/ops action, not a code fix. The new production boot-guard makes the risk explicit instead.

## Recommendations for the Team

1. **Centralize authorization for non-permission-middleware routes.** The `users`/`workspaces`/`teams`/`dashboard` routers do ad-hoc membership checks, while board/task routes use the well-designed `checkPermission` middleware. Several of the security holes above existed precisely because these routers hand-rolled (or skipped) their checks. Consider a small middleware layer (`requireWorkspaceMember`, `requireTeamLead`, etc.) so authorization is declarative and hard to forget.
2. **Add an automated test suite.** Both `package.json` test scripts are stubs. The privilege-escalation bugs would have been caught by a handful of supertest integration tests asserting `403` for under-privileged callers. Prioritize authorization tests for every mutating endpoint.
3. **Add CI running `tsc --noEmit` + `eslint` for both packages.** The frontend had 3 lint errors and a broken search feature shipped to the default branch; a CI gate would block these. The React Compiler's `set-state-in-effect` rule in particular flags real performance footguns.
4. **Introduce a structured logger.** The backend uses bare `console.error` in the error handler and the frontend uses `console.error` in the error boundary. A thin logger wrapper (silenceable in production, leveled, with request context) would make production debugging far easier — and is a prerequisite for wiring up an error-reporting service.
5. **Validate request bodies with a schema library (e.g. Zod).** Validation is currently manual and inconsistent (some endpoints check types, others don't — the role-escalation bug was partly a validation gap). A shared schema layer would make inputs uniformly safe and self-documenting.

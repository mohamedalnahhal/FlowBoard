# FlowBoard

A team task-management app: workspaces → teams → boards → lists → tasks, with a fine-grained, group-based permission system.

## Stack

- **Backend** — Express 5 + Prisma + PostgreSQL (`backend/`)
- **Frontend** — Next.js 16 (App Router) + React 19 (`frontend/`)

## Running with Docker

```bash
docker compose up
```

- Frontend: http://localhost:6001
- Backend:  http://localhost:6000
- Postgres: localhost:5432

Seed sample data (users `alice` / `bob` / `carol` / `dave`, password `password123`):

```bash
docker compose exec backend npm run seed
```

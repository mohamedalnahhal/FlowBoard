import express from 'express';
import type { ErrorRequestHandler } from 'express';
import cookieParser from 'cookie-parser';

import prisma from './lib/prisma.js';
import { SESSION_COOKIE } from './lib/session.js';

import authRouter from './routes/auth.js';
import workspacesRouter from './routes/workspaces.js';
import teamsRouter from './routes/teams.js';
import usersRouter from './routes/users.js';
import dashboardRouter from './routes/dashboard.js';
import permissionsRouter, { userPermissionsRouter } from './routes/permissions.js';
import groupsRouter from './routes/groups.js';
import calendarEventsRouter from './routes/calendarEvents.js';
import announcementsRouter from './routes/announcements.js';
import boardsRouter from './routes/boards.js';
import boardDetailRouter from './routes/boardDetail.js';
import tasksRouter from './routes/tasks.js';
import searchRouter from './routes/search.js';

const app = express();

const SESSION_SECRET = process.env.SESSION_SECRET ?? 'dev-secret-change-me';
if (process.env.NODE_ENV === 'production' && SESSION_SECRET === 'dev-secret-change-me') {
  throw new Error('SESSION_SECRET must be set in production — refusing to start with the dev default.');
}

app.use(express.json());
app.use(cookieParser(SESSION_SECRET));

app.set('prisma', prisma);

app.use((req, _res, next) => {
  const userId = req.signedCookies?.[SESSION_COOKIE];
  req.user = userId ? { id: userId } : null;
  next();
});

// Unauthenticated liveness probe for the docker-compose healthcheck and
// uptime monitoring. Returns a boolean only — never configuration values.
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRouter);
app.use('/workspaces', workspacesRouter);
app.use('/teams', teamsRouter);
app.use('/users', usersRouter);
app.use('/dashboard', dashboardRouter);
app.use('/boards', boardDetailRouter);
app.use('/tasks', tasksRouter);
app.use('/search', searchRouter);

app.use('/teams/:teamId/permissions', permissionsRouter);
app.use('/teams/:teamId/users/:userId/permissions', userPermissionsRouter);
app.use('/teams/:teamId/groups', groupsRouter);
app.use('/teams/:teamId/calendar-events', calendarEventsRouter);
app.use('/teams/:teamId/boards', boardsRouter);

app.use('/workspaces/:workspaceId/announcements', announcementsRouter);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);

  if (err.code === 'P2025') {
    res.status(404).json({ error: 'Record not found' });
    return;
  }
  if (err.code === 'P2002') {
    res.status(409).json({ error: 'Duplicate record' });
    return;
  }
  if (err.code === 'P2003') {
    res.status(400).json({ error: 'Related record not found' });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
};
app.use(errorHandler);

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;

const express = require('express');
const { PrismaClient } = require('@prisma/client');

const permissionsRouter = require('./routes/permissions');
const groupsRouter      = require('./routes/groups');
const boardsRouter      = require('./routes/boards');
const listsRouter       = require('./routes/lists');
const tasksRouter       = require('./routes/tasks');

const app    = express();
const prisma = new PrismaClient();

app.use(express.json());

app.set('prisma', prisma);

app.use((req, _res, next) => {
  // TODO: replace with real JWT auth middleware
  req.user = { id: req.headers['x-user-id'] }; // dev stub
  next();
});

app.use('/teams/:teamId/permissions', permissionsRouter);
app.use('/teams/:teamId/groups',      groupsRouter);
app.use('/teams/:teamId/boards',      boardsRouter);

// Lists and Tasks are nested under boards — mergeParams propagates :teamId + :boardId + :listId
app.use('/teams/:teamId/boards/:boardId/lists',                       listsRouter);
app.use('/teams/:teamId/boards/:boardId/lists/:listId/tasks',         tasksRouter);

app.use((err, req, res, _next) => {
  console.error(err);

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Duplicate record' });
  }

  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const permissionsRouter = require('./routes/permissions');
const groupsRouter = require('./routes/groups');
const boardsRouter = require('./routes/boards.example');

const app    = express();
const prisma = new PrismaClient();

app.use(express.json());

app.set('prisma', prisma);

app.use((req, _res, next) => {
  // TODO: implement Auth
  req.user = { id: req.headers['x-user-id'] }; // dev stub
  next();
});


app.use('/teams/:teamId/permissions', permissionsRouter);

app.use('/teams/:teamId/groups', groupsRouter);

app.use('/teams/:teamId/boards', boardsRouter);

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
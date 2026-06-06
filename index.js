const express = require('express');
const prisma = require('./src/lib/prisma');

const app = express();
const port = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
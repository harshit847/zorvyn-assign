require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const { initDb } = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const recordRoutes = require('./routes/records');
const dashboardRoutes = require('./routes/dashboard');
const { handleErrors } = require('./middlewares/error');
const { authenticate } = require('./middlewares/auth');

const app = express();
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.json({ message: 'Finance Dashboard API is running.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/records', authenticate, recordRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);

app.use(handleErrors);

const DEFAULT_PORT = Number(process.env.PORT) || 4000;

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`Server started on port ${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.warn(`Port ${port} is already in use. Retrying on port ${nextPort}...`);
      startServer(nextPort);
      return;
    }

    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

async function bootstrap() {
  try {
    await initDb();
    console.log('Database initialized');
    startServer(DEFAULT_PORT);
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
}

bootstrap();

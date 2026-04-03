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

(async () => {
  try {
    await initDb();
    console.log('Database initialized');
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
})();

app.get('/', (req, res) => {
  res.json({ message: 'Finance Dashboard API is running.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/records', authenticate, recordRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);

app.use(handleErrors);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
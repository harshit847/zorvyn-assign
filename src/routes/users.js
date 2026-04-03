const express = require('express');
const Joi = require('joi');
const { getDb } = require('../db');
const { requireRole } = require('../middlewares/rbac');

const router = express.Router();

const updateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  role: Joi.string().valid('viewer', 'analyst', 'admin'),
});

router.get('/', requireRole('admin'), async (req, res, next) => {
  try {
    const db = getDb();
    await db.read();

    const users = db.data.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      created_at: u.created_at,
    }));

    return res.json({ users });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const db = getDb();
    await db.read();

    const user = db.data.users.find((u) => u.id === Number(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, created_at: user.created_at } });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const value = await updateSchema.validateAsync(req.body);
    const db = getDb();
    await db.read();

    const userIndex = db.data.users.findIndex((u) => u.id === Number(req.params.id));
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.data.users[userIndex] = {
      ...db.data.users[userIndex],
      name: value.name ?? db.data.users[userIndex].name,
      role: value.role ?? db.data.users[userIndex].role,
    };

    await db.write();

    const updated = db.data.users[userIndex];
    return res.json({ user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role, created_at: updated.created_at } });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const db = getDb();
    await db.read();

    const userIndex = db.data.users.findIndex((u) => u.id === Number(req.params.id));
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.data.users.splice(userIndex, 1);
    db.data.finance_records = db.data.finance_records.filter((r) => r.user_id !== Number(req.params.id));
    await db.write();

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
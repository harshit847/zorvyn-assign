const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { getDb } = require('../db');
const { generateToken } = require('../middlewares/auth');

const router = express.Router();

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('viewer', 'analyst', 'admin').required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

router.post('/register', async (req, res, next) => {
  try {
    const value = await registerSchema.validateAsync(req.body);
    const db = getDb();
    await db.read();

    const existing = db.data.users.find((u) => u.email === value.email);
    if (existing) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const nextId = ++db.data.counters.userId;
    const hashedPassword = bcrypt.hashSync(value.password, 10);
    const user = {
      id: nextId,
      name: value.name,
      email: value.email,
      password: hashedPassword,
      role: value.role,
      created_at: new Date().toISOString(),
    };

    db.data.users.push(user);
    await db.write();

    const out = { id: user.id, name: user.name, email: user.email, role: user.role, created_at: user.created_at };
    const token = generateToken(out);
    return res.status(201).json({ user: out, token });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const value = await loginSchema.validateAsync(req.body);
    const db = getDb();
    await db.read();

    const user = db.data.users.find((u) => u.email === value.email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const matched = bcrypt.compareSync(value.password, user.password);
    if (!matched) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    const token = generateToken(payload);

    return res.json({ user: payload, token });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
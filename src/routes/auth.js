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

router.post('/register', (req, res, next) => {
  const value = registerSchema.validate(req.body);
  if (value.error) return res.status(400).json({ error: value.error.details[0].message });

  const db = getDb();
  db.get('SELECT id FROM users WHERE email = ?', [value.value.email], (err, row) => {
    if (err) return next(err);
    if (row) return res.status(409).json({ error: 'Email already exists' });

    const hashedPassword = bcrypt.hashSync(value.value.password, 10);
    db.run('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)', [value.value.name, value.value.email, hashedPassword, value.value.role], function(err) {
      if (err) return next(err);
      db.get('SELECT id,name,email,role,created_at FROM users WHERE id = ?', [this.lastID], (err, user) => {
        if (err) return next(err);
        const token = generateToken(user);
        return res.status(201).json({ user, token });
      });
    });
  });
});

router.post('/login', (req, res, next) => {
  const value = loginSchema.validate(req.body);
  if (value.error) return res.status(400).json({ error: value.error.details[0].message });

  const db = getDb();
  db.get('SELECT id,name,email,password,role FROM users WHERE email = ?', [value.value.email], (err, user) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const matched = bcrypt.compareSync(value.value.password, user.password);
    if (!matched) return res.status(401).json({ error: 'Invalid credentials' });

    const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const token = generateToken(payload);
    return res.json({ user: payload, token });
  });
});

module.exports = router;
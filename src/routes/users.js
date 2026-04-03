const express = require('express');
const Joi = require('joi');
const { getDb } = require('../db');

const router = express.Router();

const updateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  role: Joi.string().valid('viewer', 'analyst', 'admin'),
});

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }

    next();
  };
}

router.get('/', requireRole('admin'), (req, res, next) => {
  const db = getDb();
  db.all('SELECT id,name,email,role,created_at FROM users', [], (err, users) => {
    if (err) return next(err);
    return res.json({ users });
  });
});

router.get('/:id', requireRole('admin'), (req, res, next) => {
  const db = getDb();
  db.get('SELECT id,name,email,role,created_at FROM users WHERE id = ?', [req.params.id], (err, user) => {
    if (err) return next(err);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  });
});

router.patch('/:id', requireRole('admin'), (req, res, next) => {
  const value = updateSchema.validate(req.body);
  if (value.error) return res.status(400).json({ error: value.error.details[0].message });

  const db = getDb();
  db.get('SELECT id FROM users WHERE id = ?', [req.params.id], (err, user) => {
    if (err) return next(err);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updates = [];
    const params = [];
    if (value.value.name) {
      updates.push('name = ?');
      params.push(value.value.name);
    }
    if (value.value.role) {
      updates.push('role = ?');
      params.push(value.value.role);
    }
    params.push(req.params.id);

    db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
      if (err) return next(err);
      db.get('SELECT id,name,email,role,created_at FROM users WHERE id = ?', [req.params.id], (err, updated) => {
        if (err) return next(err);
        return res.json({ user: updated });
      });
    });
  });
});

router.delete('/:id', requireRole('admin'), (req, res, next) => {
  const db = getDb();
  db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
    if (err) return next(err);
    if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
    return res.status(204).send();
  });
});

module.exports = router;
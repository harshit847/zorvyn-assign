const express = require('express');
const Joi = require('joi');
const { getDb } = require('../db');

const router = express.Router();

const recordSchema = Joi.object({
  type: Joi.string().valid('income', 'expense').required(),
  amount: Joi.number().positive().required(),
  category: Joi.string().required(),
  description: Joi.string().allow('', null),
  date: Joi.date().iso().required(),
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

router.post('/', requireRole('analyst', 'admin'), (req, res, next) => {
  try {
    const value = recordSchema.validateAsync(req.body);
    const db = getDb();

    const inserted = db.prepare('INSERT INTO finance_records (user_id, type, amount, category, description, date) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.user.id, value.type, value.amount, value.category, value.description, value.date);
    const record = db.prepare('SELECT fr.*, u.name as author FROM finance_records fr JOIN users u ON u.id = fr.user_id WHERE fr.id = ?').get(inserted.lastInsertRowid);

    return res.status(201).json({ record });
  } catch (error) {
    next(error);
  }
});

router.get('/', requireRole('viewer', 'analyst', 'admin'), (req, res, next) => {
  try {
    const db = getDb();
    const { type, category, fromDate, toDate, minAmount, maxAmount, page = 1, limit = 20 } = req.query;

    let query = 'SELECT fr.*, u.name as author FROM finance_records fr JOIN users u ON u.id = fr.user_id';
    const conditions = [];
    const params = [];

    if (type) {
      conditions.push('fr.type = ?');
      params.push(type);
    }
    if (category) {
      conditions.push('fr.category = ?');
      params.push(category);
    }
    if (fromDate) {
      conditions.push('fr.date >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      conditions.push('fr.date <= ?');
      params.push(toDate);
    }
    if (minAmount) {
      conditions.push('fr.amount >= ?');
      params.push(Number(minAmount));
    }
    if (maxAmount) {
      conditions.push('fr.amount <= ?');
      params.push(Number(maxAmount));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY fr.date DESC LIMIT ? OFFSET ?';
    params.push(Number(limit));
    params.push((Number(page) - 1) * Number(limit));

    const records = db.prepare(query).all(...params);
    const count = db.prepare('SELECT COUNT(1) as total FROM finance_records fr ' + (conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''))
      .get(...params.slice(0, params.length - 2)).total;

    return res.json({ page: Number(page), limit: Number(limit), total: count, records });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requireRole('viewer', 'analyst', 'admin'), (req, res, next) => {
  const db = getDb();
  try {
    const record = db.prepare('SELECT fr.*, u.name as author FROM finance_records fr JOIN users u ON u.id = fr.user_id WHERE fr.id = ?').get(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    return res.json({ record });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireRole('analyst', 'admin'), (req, res, next) => {
  try {
    const value = recordSchema.validateAsync(req.body);
    const db = getDb();

    const existing = db.prepare('SELECT id FROM finance_records WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Record not found' });
    }

    db.prepare('UPDATE finance_records SET type = ?, amount = ?, category = ?, description = ?, date = ? WHERE id = ?')
      .run(value.type, value.amount, value.category, value.description, value.date, req.params.id);

    const record = db.prepare('SELECT fr.*, u.name as author FROM finance_records fr JOIN users u ON u.id = fr.user_id WHERE fr.id = ?').get(req.params.id);
    return res.json({ record });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireRole('analyst', 'admin'), (req, res, next) => {
  const db = getDb();
  try {
    const info = db.prepare('DELETE FROM finance_records WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Record not found' });
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
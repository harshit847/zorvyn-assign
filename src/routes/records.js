const express = require('express');
const Joi = require('joi');
const { getDb } = require('../db');
const { requireRole } = require('../middlewares/rbac');

const router = express.Router();

const recordSchema = Joi.object({
  type: Joi.string().valid('income', 'expense').required(),
  amount: Joi.number().positive().required(),
  category: Joi.string().required(),
  description: Joi.string().allow('', null),
  date: Joi.date().iso().required(),
});

const formatRecord = (record, users) => {
  const author = users.find((u) => u.id === record.user_id);
  return {
    ...record,
    author: author ? author.name : null,
  };
};

router.post('/', requireRole('analyst', 'admin'), async (req, res, next) => {
  try {
    const value = await recordSchema.validateAsync(req.body);
    const db = getDb();
    await db.read();

    const nextId = ++db.data.counters.recordId;
    const record = {
      id: nextId,
      user_id: req.user.id,
      type: value.type,
      amount: value.amount,
      category: value.category,
      description: value.description || '',
      date: value.date,
      created_at: new Date().toISOString(),
    };

    db.data.finance_records.push(record);
    await db.write();

    return res.status(201).json({ record: formatRecord(record, db.data.users) });
  } catch (error) {
    next(error);
  }
});

router.get('/', requireRole('viewer', 'analyst', 'admin'), async (req, res, next) => {
  try {
    const db = getDb();
    await db.read();

    const { type, category, fromDate, toDate, minAmount, maxAmount, page = 1, limit = 20 } = req.query;
    let records = [...db.data.finance_records];

    if (type) records = records.filter((r) => r.type === type);
    if (category) records = records.filter((r) => r.category === category);
    if (fromDate) records = records.filter((r) => new Date(r.date) >= new Date(fromDate));
    if (toDate) records = records.filter((r) => new Date(r.date) <= new Date(toDate));
    if (minAmount) records = records.filter((r) => r.amount >= Number(minAmount));
    if (maxAmount) records = records.filter((r) => r.amount <= Number(maxAmount));

    records.sort((a, b) => new Date(b.date) - new Date(a.date));
    const total = records.length;
    const start = (Number(page) - 1) * Number(limit);
    const paged = records.slice(start, start + Number(limit));

    return res.json({
      page: Number(page),
      limit: Number(limit),
      total,
      records: paged.map((record) => formatRecord(record, db.data.users)),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requireRole('viewer', 'analyst', 'admin'), async (req, res, next) => {
  try {
    const db = getDb();
    await db.read();

    const record = db.data.finance_records.find((r) => r.id === Number(req.params.id));
    if (!record) return res.status(404).json({ error: 'Record not found' });

    return res.json({ record: formatRecord(record, db.data.users) });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireRole('analyst', 'admin'), async (req, res, next) => {
  try {
    const value = await recordSchema.validateAsync(req.body);
    const db = getDb();
    await db.read();

    const index = db.data.finance_records.findIndex((r) => r.id === Number(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Record not found' });

    db.data.finance_records[index] = {
      ...db.data.finance_records[index],
      type: value.type,
      amount: value.amount,
      category: value.category,
      description: value.description || '',
      date: value.date,
    };

    await db.write();

    return res.json({ record: formatRecord(db.data.finance_records[index], db.data.users) });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireRole('analyst', 'admin'), async (req, res, next) => {
  try {
    const db = getDb();
    await db.read();

    const index = db.data.finance_records.findIndex((r) => r.id === Number(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Record not found' });

    db.data.finance_records.splice(index, 1);
    await db.write();

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
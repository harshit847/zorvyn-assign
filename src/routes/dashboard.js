const express = require('express');
const { getDb } = require('../db');
const { requireRole } = require('../middlewares/rbac');

const router = express.Router();

router.get('/summary', requireRole('viewer', 'analyst', 'admin'), async (req, res, next) => {
  try {
    const db = getDb();
    await db.read();

    const incomeRecords = db.data.finance_records.filter((r) => r.type === 'income');
    const expenseRecords = db.data.finance_records.filter((r) => r.type === 'expense');
    const incomeSum = incomeRecords.reduce((acc, item) => acc + Number(item.amount), 0);
    const expenseSum = expenseRecords.reduce((acc, item) => acc + Number(item.amount), 0);
    const net = incomeSum - expenseSum;

    res.json({
      totalIncome: incomeSum,
      totalExpenses: expenseSum,
      netSavings: net,
      numberOfIncomeRecords: incomeRecords.length,
      numberOfExpenseRecords: expenseRecords.length,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/trend', requireRole('viewer', 'analyst', 'admin'), async (req, res, next) => {
  const { period = 'month' } = req.query;
  try {
    const db = getDb();
    await db.read();

    const bucketFn = period === 'year'
      ? (dateStr) => new Date(dateStr).getFullYear().toString()
      : (dateStr) => {
        const d = new Date(dateStr);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      };

    const groupTrend = (type) => {
      const filtered = db.data.finance_records.filter((r) => r.type === type);
      const grouped = filtered.reduce((acc, item) => {
        const bucket = bucketFn(item.date);
        acc[bucket] = (acc[bucket] || 0) + Number(item.amount);
        return acc;
      }, {});
      return Object.entries(grouped)
        .map(([periodKey, value]) => ({ period: periodKey, value }))
        .sort((a, b) => (a.period > b.period ? 1 : -1));
    };

    const incomeTrend = groupTrend('income');
    const expenseTrend = groupTrend('expense');

    return res.json({ period, incomeTrend, expenseTrend });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

module.exports = router;
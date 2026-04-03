const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

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

router.get('/summary', requireRole('viewer', 'analyst', 'admin'), (req, res, next) => {
  const db = getDb();
  try {
    const incomeSum = db.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM finance_records WHERE type='income'").get().total;
    const expenseSum = db.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM finance_records WHERE type='expense'").get().total;
    const countIncome = db.prepare("SELECT COUNT(1) AS total FROM finance_records WHERE type='income'").get().total;
    const countExpense = db.prepare("SELECT COUNT(1) AS total FROM finance_records WHERE type='expense'").get().total;

    const net = incomeSum - expenseSum;

    res.json({
      totalIncome: incomeSum,
      totalExpenses: expenseSum,
      netSavings: net,
      numberOfIncomeRecords: countIncome,
      numberOfExpenseRecords: countExpense,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/trend', requireRole('viewer', 'analyst', 'admin'), (req, res, next) => {
  const { period = 'month' } = req.query;
  const db = getDb();

  try {
    const bucket = period === 'year' ? "%Y" : "%Y-%m";
    const incomeTrend = db.prepare(`
      SELECT strftime('${bucket}', date) AS period, SUM(amount) AS value
      FROM finance_records WHERE type='income' GROUP BY period ORDER BY period ASC
    `).all();

    const expenseTrend = db.prepare(`
      SELECT strftime('${bucket}', date) AS period, SUM(amount) AS value
      FROM finance_records WHERE type='expense' GROUP BY period ORDER BY period ASC
    `).all();

    return res.json({ period, incomeTrend, expenseTrend });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

module.exports = router;
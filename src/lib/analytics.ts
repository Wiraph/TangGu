import { accounts, expenseCategories, type Transaction } from '../types';
import { monthKey, todayIso, yearKey } from './utils';

export function dailyStats(transactions: Transaction[], selectedDate = todayIso()) {
  const todayTransactions = transactions.filter((transaction) => transaction.date === selectedDate);
  const todayExpense = todayTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const weekAgo = new Date(`${selectedDate}T00:00:00`);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekStart = weekAgo.toISOString().slice(0, 10);
  const weekExpense = transactions
    .filter((transaction) => transaction.type === 'expense' && transaction.date >= weekStart && transaction.date <= selectedDate)
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    selectedDate,
    todayTransactions,
    todayExpense,
    weeklyAverage: weekExpense / 7,
  };
}

export function weeklyStats(transactions: Transaction[], selectedDate = todayIso()) {
  const { weekStart, weekEnd, days } = weekRange(selectedDate);
  const weekly = transactions.filter((transaction) => transaction.date >= weekStart && transaction.date <= weekEnd);
  const income = weekly
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expense = weekly
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const byCategory = expenseCategories
    .map((category) => ({
      name: category,
      value: weekly
        .filter((transaction) => transaction.type === 'expense' && transaction.category === category)
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    }))
    .filter((item) => item.value > 0);
  const dailyFlow = days.map((date) => {
    const dayTransactions = weekly.filter((transaction) => transaction.date === date);
    return {
      day: new Date(`${date}T00:00:00`).toLocaleDateString('th-TH', { weekday: 'short' }),
      income: dayTransactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((sum, transaction) => sum + transaction.amount, 0),
      expense: dayTransactions
        .filter((transaction) => transaction.type === 'expense')
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    };
  });

  return {
    selectedDate,
    weekStart,
    weekEnd,
    weekly,
    income,
    expense,
    net: income - expense,
    byCategory,
    dailyFlow,
  };
}

export function monthlyStats(transactions: Transaction[], selectedMonth = monthKey(todayIso())) {
  const monthly = transactions.filter((transaction) => monthKey(transaction.date) === selectedMonth);
  const byCategory = expenseCategories
    .map((category) => ({
      name: category,
      value: monthly
        .filter((transaction) => transaction.type === 'expense' && transaction.category === category)
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    }))
    .filter((item) => item.value > 0);

  const accountBalances = accounts.map((account) => {
    const balance = transactions
      .filter((transaction) => monthKey(transaction.date) <= selectedMonth)
      .reduce((sum, transaction) => {
      if (transaction.type === 'income' && transaction.account === account) return sum + transaction.amount;
      if (transaction.type === 'expense' && transaction.account === account) return sum - transaction.amount;
      if (transaction.type === 'transfer' && transaction.account === account) return sum - transaction.amount;
      if (transaction.type === 'transfer' && transaction.to_account === account) return sum + transaction.amount;
      return sum;
    }, 0);

    return { account, balance };
  });

  const popularExpenses = [...monthly]
    .filter((transaction) => transaction.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return { selectedMonth, monthly, byCategory, accountBalances, popularExpenses };
}

export function yearlyStats(transactions: Transaction[], selectedYear = yearKey(todayIso())) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = `${selectedYear}-${String(index + 1).padStart(2, '0')}`;
    const monthly = transactions.filter((transaction) => monthKey(transaction.date) === month);
    const income = monthly
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const expense = monthly
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

    return {
      month: new Date(`${month}-01`).toLocaleDateString('th-TH', { month: 'short' }),
      income,
      expense,
      savingsRate,
    };
  });
}

function weekRange(selectedDate: string) {
  const date = new Date(`${selectedDate}T00:00:00`);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(date.getDate() + mondayOffset);

  return {
    weekStart: toIsoDate(start),
    weekEnd: toIsoDate(addDays(start, 6)),
    days: Array.from({ length: 7 }, (_, index) => toIsoDate(addDays(start, index))),
  };
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + amount);
  return next;
}

function toIsoDate(date: Date) {
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

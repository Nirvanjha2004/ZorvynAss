import prisma from '../lib/prisma';

export interface Summary {
  total_income: number;
  total_expenses: number;
  net_balance: number;
}

export interface CategoryTotal {
  category: string;
  total: number;
}

export interface TrendEntry {
  period: string;
  total_income: number;
  total_expenses: number;
  net_balance: number;
}

export async function getSummary(): Promise<Summary> {
  const records = await prisma.financialRecord.findMany({
    where: { deletedAt: null },
    select: { amount: true, type: true },
  });

  let total_income = 0;
  let total_expenses = 0;

  for (const r of records) {
    if (r.type === 'INCOME') total_income += r.amount;
    else total_expenses += r.amount;
  }

  return {
    total_income: Math.round(total_income * 100) / 100,
    total_expenses: Math.round(total_expenses * 100) / 100,
    net_balance: Math.round((total_income - total_expenses) * 100) / 100,
  };
}

export async function getCategorySummary(): Promise<CategoryTotal[]> {
  const records = await prisma.financialRecord.findMany({
    where: { deletedAt: null },
    select: { amount: true, category: true },
  });

  const map = new Map<string, number>();
  for (const r of records) {
    map.set(r.category, (map.get(r.category) ?? 0) + r.amount);
  }

  return Array.from(map.entries()).map(([category, total]) => ({
    category,
    total: Math.round(total * 100) / 100,
  }));
}

export async function getTrends(period: 'monthly' | 'weekly'): Promise<TrendEntry[]> {
  const records = await prisma.financialRecord.findMany({
    where: { deletedAt: null },
    select: { amount: true, type: true, date: true },
    orderBy: { date: 'asc' },
  });

  const map = new Map<string, { income: number; expenses: number }>();

  for (const r of records) {
    const key = getPeriodKey(r.date, period);
    const existing = map.get(key) ?? { income: 0, expenses: 0 };
    if (r.type === 'INCOME') existing.income += r.amount;
    else existing.expenses += r.amount;
    map.set(key, existing);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, { income, expenses }]) => ({
      period,
      total_income: Math.round(income * 100) / 100,
      total_expenses: Math.round(expenses * 100) / 100,
      net_balance: Math.round((income - expenses) * 100) / 100,
    }));
}

function getPeriodKey(date: Date, period: 'monthly' | 'weekly'): string {
  if (period === 'monthly') {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  // ISO week: find Monday of the week
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-W${m}-${dd}`;
}

export async function getRecentActivity(limit = 10) {
  return prisma.financialRecord.findMany({
    where: { deletedAt: null },
    orderBy: { date: 'desc' },
    take: limit,
  });
}

import { getDashboardSummary } from '@/shared/services/dashboard.service';
import { getRecurringTemplates } from '@/shared/services/recurring.service';
import { getTransactions } from '@/shared/services/transactions.service';
import type { Transaction } from '@/entities/transaction/types';

export interface ProjectionPoint {
  date: string;
  balance: number;
}

export interface ProjectionScenario {
  id: string;
  name: string;
  description: string;
  points: ProjectionPoint[];
}

interface MonthlyAverages {
  income: number;
  expenses: number;
  monthCount: number;
}

interface ProjectionBaseData {
  currentBalance: number;
  baseIncome: number;
  baseExpenses: number;
  monthCount: number;
  futureAdjustments: Map<string, number>;
}

const PROJECTION_MONTHS = 6;
const HISTORY_MONTHS = 6;

function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function getSignedTransactionValue(transaction: Transaction): number {
  return transaction.type === 'income' ? transaction.value : -transaction.value;
}

function getHistoricalAverages(transactions: Transaction[], now: Date): MonthlyAverages {
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstRelevantMonth = addMonths(currentMonthStart, -HISTORY_MONTHS);
  const monthTotals = new Map<string, { income: number; expenses: number }>();

  transactions.forEach((transaction) => {
    if (transaction.status !== 'completed') {
      return;
    }

    const date = new Date(transaction.date);
    if (Number.isNaN(date.getTime()) || date >= currentMonthStart || date < firstRelevantMonth) {
      return;
    }

    const monthKey = getMonthKey(date);
    const current = monthTotals.get(monthKey) ?? { income: 0, expenses: 0 };

    if (transaction.type === 'income') {
      current.income += transaction.value;
    } else {
      current.expenses += transaction.value;
    }

    monthTotals.set(monthKey, current);
  });

  const totals = Array.from(monthTotals.values()).reduce(
    (acc, month) => {
      acc.income += month.income;
      acc.expenses += month.expenses;
      return acc;
    },
    { income: 0, expenses: 0 }
  );

  const monthCount = monthTotals.size;

  if (monthCount === 0) {
    return { income: 0, expenses: 0, monthCount: 0 };
  }

  return {
    income: Math.round(totals.income / monthCount),
    expenses: Math.round(totals.expenses / monthCount),
    monthCount,
  };
}

function getFutureAdjustments(transactions: Transaction[], now: Date): Map<string, number> {
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const adjustments = new Map<string, number>();

  transactions.forEach((transaction) => {
    if (transaction.status === 'cancelled') {
      return;
    }

    const date = new Date(transaction.date);
    if (Number.isNaN(date.getTime()) || date < currentMonthStart) {
      return;
    }

    const monthKey = getMonthKey(date);
    adjustments.set(
      monthKey,
      (adjustments.get(monthKey) ?? 0) + getSignedTransactionValue(transaction)
    );
  });

  return adjustments;
}

async function getProjectionBaseData(): Promise<ProjectionBaseData> {
  const now = new Date();
  const [summary, transactions, recurringTemplates] = await Promise.all([
    getDashboardSummary(),
    getTransactions({ limit: 500 }),
    getRecurringTemplates(),
  ]);

  const historical = getHistoricalAverages(transactions, now);
  const recurringIncome = recurringTemplates
    .filter((template) => template.type === 'income')
    .reduce((total, template) => total + template.value, 0);
  const recurringExpenses = recurringTemplates
    .filter((template) => template.type === 'expense')
    .reduce((total, template) => total + template.value, 0);

  const baseIncome = historical.income || recurringIncome;
  const baseExpenses = historical.expenses || recurringExpenses;

  return {
    currentBalance: summary.currentBalance,
    baseIncome,
    baseExpenses,
    monthCount: historical.monthCount,
    futureAdjustments: getFutureAdjustments(transactions, now),
  };
}

function buildProjectionPoints(
  currentBalance: number,
  baseIncome: number,
  baseExpenses: number,
  futureAdjustments: Map<string, number>
): ProjectionPoint[] {
  const now = new Date();
  const points: ProjectionPoint[] = [
    {
      date: getMonthKey(now),
      balance: currentBalance,
    },
  ];

  let runningBalance = currentBalance;

  for (let index = 1; index <= PROJECTION_MONTHS; index += 1) {
    const monthDate = addMonths(now, index);
    const monthKey = getMonthKey(monthDate);
    const scheduledAdjustment = futureAdjustments.get(monthKey) ?? 0;
    runningBalance += baseIncome - baseExpenses + scheduledAdjustment;

    points.push({
      date: monthKey,
      balance: runningBalance,
    });
  }

  return points;
}

export async function getBalanceProjection(): Promise<ProjectionPoint[]> {
  const projection = await getProjectionBaseData();

  return buildProjectionPoints(
    projection.currentBalance,
    projection.baseIncome,
    projection.baseExpenses,
    projection.futureAdjustments
  );
}

export async function getProjectionScenarios(): Promise<ProjectionScenario[]> {
  const projection = await getProjectionBaseData();
  const historyDescription =
    projection.monthCount > 0
      ? `baseado na média dos últimos ${projection.monthCount} meses fechados`
      : 'baseado nas suas recorrências cadastradas';

  return [
    {
      id: 'base',
      name: 'Cenário base',
      description: `Mantém o comportamento atual, ${historyDescription}, com ajuste de lançamentos futuros já cadastrados.`,
      points: buildProjectionPoints(
        projection.currentBalance,
        projection.baseIncome,
        projection.baseExpenses,
        projection.futureAdjustments
      ),
    },
    {
      id: 'optimistic',
      name: 'Cenário otimista',
      description: `Simula redução de 10% nas despesas mensais, ${historyDescription}.`,
      points: buildProjectionPoints(
        projection.currentBalance,
        projection.baseIncome,
        Math.round(projection.baseExpenses * 0.9),
        projection.futureAdjustments
      ),
    },
    {
      id: 'conservative',
      name: 'Cenário conservador',
      description: `Simula aumento de 10% nas despesas mensais, ${historyDescription}.`,
      points: buildProjectionPoints(
        projection.currentBalance,
        projection.baseIncome,
        Math.round(projection.baseExpenses * 1.1),
        projection.futureAdjustments
      ),
    },
  ];
}

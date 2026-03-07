import { apiRequest } from '@/shared/services/api-client';
import { appLogger } from '@/shared/logger';

export interface DashboardSummary {
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsPercent: number;
}

export interface MonthlyEvolutionItem {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface CategorySpendItem {
  categoryId: string;
  categoryName: string;
  total: number;
  color: string;
}

export interface SavingsEvolutionItem {
  month: string;
  savingsPercent: number;
  savingsAmount: number;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const data = await apiRequest<DashboardSummary>('/dashboard/summary');
  appLogger.info('Dashboard carregado', {
    domain: 'dashboard',
    event: 'dashboard.loaded',
  });
  return data;
}

export async function getMonthlyEvolution(
  months?: number
): Promise<MonthlyEvolutionItem[]> {
  const res = await apiRequest<
    MonthlyEvolutionItem[] | Array<{ month: string; income: number; expense: number; balance: number }>
  >('/dashboard/evolution', {
    params: { months: months ?? 12 },
  });
  const list = Array.isArray(res) ? res : [];
  return list.map((item) => {
    const raw = item as { month: string; income: number; expense?: number; expenses?: number; balance: number };
    return {
      month: raw.month,
      income: raw.income,
      expenses: raw.expenses ?? raw.expense ?? 0,
      balance: raw.balance,
    };
  }) as MonthlyEvolutionItem[];
}

export async function getCategorySpend(): Promise<CategorySpendItem[]> {
  const res = await apiRequest<
    CategorySpendItem[] | Array<{ categoryId: string; name: string; total: number; color: string }>
  >('/dashboard/category-spend');
  const list = Array.isArray(res) ? res : [];
  return list.map((item) => {
    const raw = item as { categoryId: string; name?: string; categoryName?: string; total: number; color: string };
    return {
      categoryId: raw.categoryId,
      categoryName: raw.categoryName ?? raw.name ?? '',
      total: raw.total,
      color: raw.color,
    };
  }) as CategorySpendItem[];
}

export async function getSavingsEvolution(
  months?: number
): Promise<SavingsEvolutionItem[]> {
  const res = await apiRequest<
    SavingsEvolutionItem[] | Array<{ month: string; saved: number }>
  >('/dashboard/savings-evolution', {
    params: { months: months ?? 6 },
  });
  const list = Array.isArray(res) ? res : [];
  return list.map((item) => {
    const raw = item as { month: string; saved?: number; savingsAmount?: number; savingsPercent?: number };
    return {
      month: raw.month,
      savingsPercent: raw.savingsPercent ?? 0,
      savingsAmount: raw.savingsAmount ?? raw.saved ?? 0,
    };
  }) as SavingsEvolutionItem[];
}

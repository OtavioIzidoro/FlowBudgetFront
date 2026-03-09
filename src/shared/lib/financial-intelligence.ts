import type { Goal } from '@/entities/goal/types';
import type { Transaction } from '@/entities/transaction/types';
import type { DashboardSummary } from '@/shared/services/dashboard.service';
import type { FinancialInsightResponse } from '@/shared/services/financial-ai.service';

export interface FinancialScoreResult {
  score: number;
  label: string;
  summary: string;
  highlights: string[];
}

export interface GoalPlanResult {
  remainingAmount: number;
  monthsRemaining: number;
  recommendedMonthlyContribution: number;
  dailyContribution: number;
  status: 'achieved' | 'overdue' | 'planned';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getDaysUntil(targetDate: string): number {
  const today = new Date();
  const target = new Date(targetDate);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getGoalPlan(targetAmount: number, currentAmount: number, targetDate: string): GoalPlanResult {
  const remainingAmount = Math.max(0, targetAmount - currentAmount);

  if (remainingAmount === 0) {
    return {
      remainingAmount: 0,
      monthsRemaining: 0,
      recommendedMonthlyContribution: 0,
      dailyContribution: 0,
      status: 'achieved',
    };
  }

  const daysUntil = getDaysUntil(targetDate);

  if (daysUntil <= 0) {
    return {
      remainingAmount,
      monthsRemaining: 0,
      recommendedMonthlyContribution: remainingAmount,
      dailyContribution: remainingAmount,
      status: 'overdue',
    };
  }

  const monthsRemaining = Math.max(1, Math.ceil(daysUntil / 30));

  return {
    remainingAmount,
    monthsRemaining,
    recommendedMonthlyContribution: Math.ceil(remainingAmount / monthsRemaining),
    dailyContribution: Math.ceil(remainingAmount / daysUntil),
    status: 'planned',
  };
}

export function getFinancialScore(
  summary: DashboardSummary,
  goals: Goal[],
  transactions: Transaction[]
): FinancialScoreResult {
  let score = 50;
  const highlights: string[] = [];

  if (summary.currentBalance > 0) {
    score += 15;
    highlights.push('Seu saldo atual está positivo.');
  } else if (summary.currentBalance < 0) {
    score -= 20;
    highlights.push('Seu saldo atual está negativo.');
  }

  if (summary.savingsPercent >= 20) {
    score += 20;
    highlights.push('Sua taxa de economia está forte.');
  } else if (summary.savingsPercent >= 10) {
    score += 12;
    highlights.push('Você já está conseguindo economizar no mês.');
  } else if (summary.savingsPercent > 0) {
    score += 5;
    highlights.push('Você economiza, mas ainda há espaço para melhorar.');
  } else {
    score -= 10;
    highlights.push('As despesas estão pressionando sua sobra mensal.');
  }

  const overdueGoals = goals.filter((goal) => goal.status === 'overdue').length;
  if (overdueGoals > 0) {
    score -= Math.min(20, overdueGoals * 8);
    highlights.push(`Você tem ${overdueGoals} meta(s) fora do prazo.`);
  }

  const activeGoals = goals.filter((goal) => goal.status === 'active');
  if (activeGoals.length > 0) {
    const averageProgress =
      activeGoals.reduce((total, goal) => {
        if (goal.targetAmount <= 0) {
          return total;
        }
        return total + Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
      }, 0) / activeGoals.length;

    if (averageProgress >= 50) {
      score += 10;
      highlights.push('Suas metas estão avançando bem.');
    } else if (averageProgress > 0) {
      score += 5;
      highlights.push('Suas metas já começaram a evoluir.');
    }
  }

  const pendingTransactions = transactions.filter((transaction) => transaction.status === 'pending');
  if (pendingTransactions.length >= 5) {
    score -= 8;
    highlights.push('Você tem muitos lançamentos pendentes para acompanhar.');
  }

  const normalizedScore = clamp(Math.round(score), 0, 100);

  const label =
    normalizedScore >= 85
      ? 'Excelente'
      : normalizedScore >= 70
        ? 'Muito bom'
        : normalizedScore >= 55
          ? 'Bom'
          : normalizedScore >= 40
            ? 'Atenção'
            : 'Crítico';

  const summaryText =
    normalizedScore >= 70
      ? 'Seu cenário financeiro está saudável e com boa previsibilidade.'
      : normalizedScore >= 40
        ? 'Sua vida financeira está funcional, mas pede mais disciplina em alguns pontos.'
        : 'Seu momento financeiro exige atenção imediata para recuperar controle e fôlego.';

  return {
    score: normalizedScore,
    label,
    summary: summaryText,
    highlights: highlights.slice(0, 3),
  };
}

export function buildNaturalFinanceConversation(
  summary: DashboardSummary,
  goals: Goal[],
  transactions: Transaction[],
  insight?: FinancialInsightResponse | null
): string[] {
  const lines: string[] = [];
  const recentTransactions = transactions.slice(0, 3);
  const activeGoals = goals.filter((goal) => goal.status === 'active');

  const monthlyNet = summary.monthlyIncome - summary.monthlyExpenses;
  lines.push(
    monthlyNet >= 0
      ? `Você fechou o mês com uma sobra de ${(monthlyNet / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
      : `Neste mês você está no negativo em ${Math.abs(monthlyNet / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
  );

  lines.push(
    `Seu saldo atual está em ${(summary.currentBalance / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} e sua taxa de economia está em ${summary.savingsPercent}%.`
  );

  if (activeGoals.length > 0) {
    lines.push(
      `Você tem ${activeGoals.length} meta(s) ativa(s), então vale direcionar parte da sobra mensal para acelerar esses objetivos.`
    );
  } else {
    lines.push('Você ainda não tem metas ativas, então este é um bom momento para transformar sua sobra em objetivos concretos.');
  }

  if (recentTransactions.length > 0) {
    const latestMovement = recentTransactions[0];
    if (latestMovement) {
      lines.push(
        `Seu movimento mais recente foi ${latestMovement.type === 'income' ? 'uma entrada' : 'uma saída'} de ${(latestMovement.value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}${latestMovement.description ? ` em "${latestMovement.description}"` : ''}.`
      );
    }
  }

  if (insight?.insight?.advice) {
    lines.push(`Sugestão da IA: ${insight.insight.advice}`);
  }

  return lines.slice(0, 4);
}

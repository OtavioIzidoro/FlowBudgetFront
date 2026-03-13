import { useQuery } from '@tanstack/react-query';
import {
  getDashboardSummary,
  getMonthlyEvolution,
  getCategorySpend,
  getSavingsEvolution,
} from '@/shared/services/dashboard.service';
import { getTransactions } from '@/shared/services/transactions.service';
import { getGoals } from '@/shared/services/goals.service';
import { getNotifications } from '@/shared/services/notifications.service';
import { getFinancialInsight } from '@/shared/services/financial-ai.service';
import { useNotificationStore } from '@/shared/store/notification-store';
import { useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Skeleton } from '@/shared/ui/skeleton';
import { formatCurrency } from '@/shared/lib/format';
import {
  buildNaturalFinanceConversation,
  getFinancialScore,
  getGoalPlan,
} from '@/shared/lib/financial-intelligence';
import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BadgeAlert,
  Bell,
  Brain,
  CalendarClock,
  Gauge,
  MessageCircle,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  success: '#22c55e',
  danger: '#ef4444',
};

const dashboardCardClassName =
  'border-primary/10 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm backdrop-blur-sm';

function getMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatMonthLabel(monthKey: string): string {
  return new Date(monthKey + '-01').toLocaleDateString('pt-BR', {
    month: 'short',
    year: '2-digit',
  });
}

export function DashboardPage() {
  const setNotifications = useNotificationStore((s) => s.setNotifications);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary,
  });

  const { data: evolution, isLoading: evolutionLoading } = useQuery({
    queryKey: ['dashboard', 'evolution'],
    queryFn: () => getMonthlyEvolution(),
  });

  const { data: categorySpend } = useQuery({
    queryKey: ['dashboard', 'categorySpend'],
    queryFn: getCategorySpend,
  });

  const { data: savingsEvolution } = useQuery({
    queryKey: ['dashboard', 'savingsEvolution'],
    queryFn: () => getSavingsEvolution(),
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => getTransactions(),
  });

  const { data: goals } = useQuery({
    queryKey: ['goals'],
    queryFn: getGoals,
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  });

  const { data: financialInsight, isLoading: insightLoading } = useQuery({
    queryKey: ['financial-ai', 'insight'],
    queryFn: getFinancialInsight,
  });

  useEffect(() => {
    if (notifications) {
      setNotifications(notifications);
    }
  }, [notifications, setNotifications]);

  const currentMonthKey = getMonthKey(new Date());
  const currentMonthLabel = formatMonthLabel(currentMonthKey);

  const evolutionData = Array.isArray(evolution)
    ? [...evolution]
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((e: { month: string }) => ({
          ...e,
          month: formatMonthLabel(e.month),
          isCurrentMonth: e.month === currentMonthKey,
        }))
    : undefined;

  const savingsData = Array.isArray(savingsEvolution)
    ? [...savingsEvolution]
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((e: { month: string }) => ({
          ...e,
          monthLabel: formatMonthLabel(e.month),
          isCurrentMonth: e.month === currentMonthKey,
        }))
    : undefined;

  const showCurrentMonthLineEvolution = evolutionData?.some((d) => d.month === currentMonthLabel);
  const showCurrentMonthLineSavings = savingsData?.some((d) => d.monthLabel === currentMonthLabel);

  const goalsChartData =
    goals?.filter((g) => g.status === 'active' || g.status === 'achieved').map((g) => ({
      name: g.name.length > 18 ? g.name.slice(0, 18) + '…' : g.name,
      progress: g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0,
      fullName: g.name,
    })) ?? [];

  const insightReasonLabel =
    financialInsight?.reason === 'insufficient_data'
      ? 'A IA precisa de mais dados para gerar uma dica.'
      : financialInsight?.reason === 'quota_exceeded'
        ? 'O limite diário de uso da IA foi atingido.'
        : financialInsight?.reason === 'disabled'
          ? 'A IA está desativada no backend.'
          : financialInsight?.reason === 'unavailable'
            ? 'O serviço de IA está indisponível no momento.'
            : 'Nenhuma dica disponível agora.';

  const financialScore =
    summary && transactions && goals
      ? getFinancialScore(summary, goals, transactions)
      : null;

  const naturalConversation =
    summary && transactions && goals
      ? buildNaturalFinanceConversation(summary, goals, transactions, financialInsight)
      : [];

  const monthlyNet = summary ? summary.monthlyIncome - summary.monthlyExpenses : 0;
  const pendingTransactions = transactions?.filter((transaction) => transaction.status === 'pending') ?? [];
  const pendingExpenses = pendingTransactions
    .filter((transaction) => transaction.type === 'expense')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const pendingIncome = pendingTransactions
    .filter((transaction) => transaction.type === 'income')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const pendingExpensesTotal = pendingExpenses.reduce((total, transaction) => total + transaction.value, 0);
  const pendingIncomeTotal = pendingIncome.reduce((total, transaction) => total + transaction.value, 0);
  const unreadNotifications = notifications?.filter((notification) => !notification.read) ?? [];
  const activeGoalsWithPlan =
    goals
      ?.filter((goal) => goal.status === 'active')
      .map((goal) => ({
        ...goal,
        plan: getGoalPlan(goal.targetAmount, goal.currentAmount, goal.targetDate),
      }))
      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()) ?? [];
  const topPriorityGoals = activeGoalsWithPlan.slice(0, 3);
  const totalSuggestedGoalContribution = activeGoalsWithPlan.reduce(
    (total, goal) =>
      goal.plan.status === 'planned'
        ? total + goal.plan.recommendedMonthlyContribution
        : total,
    0
  );
  const topCategories = categorySpend?.slice(0, 4) ?? [];
  const performanceGaugeData = financialScore
    ? [
        {
          name: 'score',
          value: financialScore.score,
          fill: CHART_COLORS.primary,
        },
      ]
    : [];

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {summaryLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className={dashboardCardClassName}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {summary && !summaryLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className={dashboardCardClassName}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo atual</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">
                {formatCurrency(summary.currentBalance)}
              </span>
            </CardContent>
          </Card>
          <Card className={dashboardCardClassName}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receitas do mês</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.monthlyIncome)}
              </span>
            </CardContent>
          </Card>
          <Card className={dashboardCardClassName}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas do mês</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-destructive">
                {formatCurrency(summary.monthlyExpenses)}
              </span>
            </CardContent>
          </Card>
          <Card className={dashboardCardClassName}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Economia</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">
                {summary.savingsPercent}%
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className={dashboardCardClassName}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resultado do mês</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summary ? (
              <>
                <span className={`text-2xl font-bold ${monthlyNet >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {formatCurrency(monthlyNet)}
                </span>
                <p className="mt-1 text-xs text-muted-foreground">
                  {monthlyNet >= 0 ? 'Sobra mensal atual' : 'Déficit mensal atual'}
                </p>
              </>
            ) : (
              <Skeleton className="h-12 w-full" />
            )}
          </CardContent>
        </Card>

        <Card className={dashboardCardClassName}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas pendentes</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {transactions ? (
              <>
                <span className="text-2xl font-bold text-destructive">
                  {formatCurrency(pendingExpensesTotal)}
                </span>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pendingExpenses.length} lançamento(s) aguardando pagamento
                </p>
              </>
            ) : (
              <Skeleton className="h-12 w-full" />
            )}
          </CardContent>
        </Card>

        <Card className={dashboardCardClassName}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas pendentes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {transactions ? (
              <>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(pendingIncomeTotal)}
                </span>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pendingIncome.length} lançamento(s) aguardando recebimento
                </p>
              </>
            ) : (
              <Skeleton className="h-12 w-full" />
            )}
          </CardContent>
        </Card>

        <Card className={dashboardCardClassName}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Metas ativas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {goals ? (
              <>
                <span className="text-2xl font-bold">{activeGoalsWithPlan.length}</span>
                <p className="mt-1 text-xs text-muted-foreground">
                  Aporte sugerido total: {formatCurrency(totalSuggestedGoalContribution)}/mês
                </p>
              </>
            ) : (
              <Skeleton className="h-12 w-full" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={dashboardCardClassName}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Score financeiro pessoal</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {financialScore ? (
              <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <RadialBarChart
                      data={performanceGaugeData}
                      innerRadius="68%"
                      outerRadius="100%"
                      startAngle={205}
                      endAngle={-25}
                      barSize={18}
                    >
                      <defs>
                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#60a5fa" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar
                        dataKey="value"
                        cornerRadius={16}
                        background={{ fill: 'hsl(var(--muted))' }}
                        fill="url(#scoreGradient)"
                        isAnimationActive={true}
                        animationDuration={1600}
                      />
                      <text
                        x="50%"
                        y="45%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-foreground text-3xl font-bold"
                      >
                        {financialScore.score}
                      </text>
                      <text
                        x="50%"
                        y="58%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-muted-foreground text-xs"
                      >
                        {financialScore.label}
                      </text>
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{financialScore.summary}</p>
                  {financialScore.highlights.length > 0 && (
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {financialScore.highlights.map((highlight) => (
                        <li
                          key={highlight}
                          className="rounded-md border border-primary/10 bg-background/60 px-3 py-2"
                        >
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <Skeleton className="h-24 w-full" />
            )}
          </CardContent>
        </Card>

        <Card className={dashboardCardClassName}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Conversa natural com seus dados</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {naturalConversation.length > 0 ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                {naturalConversation.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : (
              <Skeleton className="h-24 w-full" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={dashboardCardClassName}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Insight financeiro com IA</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {insightLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : financialInsight?.insight ? (
            <Alert>
              <Brain className="h-4 w-4" />
              <AlertTitle>{financialInsight.insight.headline}</AlertTitle>
              <AlertDescription>{financialInsight.insight.advice}</AlertDescription>
            </Alert>
          ) : (
            <Alert variant="warning">
              <Brain className="h-4 w-4" />
              <AlertTitle>Sem insight disponível</AlertTitle>
              <AlertDescription>{insightReasonLabel}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={dashboardCardClassName}>
          <CardHeader>
            <CardTitle>Evolução mensal</CardTitle>
          </CardHeader>
          <CardContent>
            {evolutionLoading && (
              <Skeleton className="h-[280px] w-full" />
            )}
            {!evolutionLoading && evolutionData && evolutionData.length > 0 && (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={evolutionData}>
                    <defs>
                      <linearGradient id="balanceGlow" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `${v / 1000}k`} />
                    {showCurrentMonthLineEvolution && (
                      <ReferenceLine
                        x={currentMonthLabel}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        label={{ value: 'Mês atual', position: 'top', fill: 'hsl(var(--primary))' }}
                      />
                    )}
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => label}
                    />
                    <Line
                      type="monotone"
                      dataKey="income"
                      stroke={CHART_COLORS.success}
                      name="Receitas"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                      isAnimationActive={true}
                      animationDuration={1200}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke={CHART_COLORS.danger}
                      name="Despesas"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                      isAnimationActive={true}
                      animationDuration={1400}
                    />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      stroke="url(#balanceGlow)"
                      name="Saldo"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 7 }}
                      isAnimationActive={true}
                      animationDuration={1600}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
          </CardContent>
        </Card>

        <Card className={dashboardCardClassName}>
          <CardHeader>
            <CardTitle>Receitas x Despesas por mês</CardTitle>
          </CardHeader>
          <CardContent>
            {evolutionLoading && (
              <Skeleton className="h-[280px] w-full" />
            )}
            {!evolutionLoading && evolutionData && evolutionData.length > 0 && (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={evolutionData}>
                  <defs>
                    <linearGradient id="incomeBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" />
                      <stop offset="100%" stopColor="#166534" />
                    </linearGradient>
                    <linearGradient id="expenseBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f87171" />
                      <stop offset="100%" stopColor="#7f1d1d" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `${v / 1000}k`} />
                  {showCurrentMonthLineEvolution && (
                    <ReferenceLine
                      x={currentMonthLabel}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      label={{ value: 'Mês atual', position: 'top', fill: 'hsl(var(--primary))' }}
                    />
                  )}
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend
                    formatter={(value) => <span className="text-foreground">{value}</span>}
                  />
                  <Bar
                    dataKey="income"
                    fill="url(#incomeBarGradient)"
                    name="Receitas"
                    radius={[8, 8, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1100}
                  />
                  <Bar
                    dataKey="expenses"
                    fill="url(#expenseBarGradient)"
                    name="Despesas"
                    radius={[8, 8, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={1450}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className={`lg:col-span-2 ${dashboardCardClassName}`}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Próximos vencimentos e pendências</CardTitle>
            <Link to={'/transactions' as '/'}>
              <span className="text-sm text-primary hover:underline">
                Ir para transações
              </span>
            </Link>
          </CardHeader>
          <CardContent>
            {transactions ? (
              pendingTransactions.length > 0 ? (
                <ul className="space-y-3">
                  {pendingTransactions.slice(0, 5).map((transaction) => (
                    <li
                      key={transaction.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {transaction.description || (transaction.type === 'income' ? 'Receita pendente' : 'Despesa pendente')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.type === 'income' ? 'Recebimento' : 'Vencimento'} em{' '}
                          {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                      <span className={transaction.type === 'income' ? 'text-sm font-semibold text-green-600' : 'text-sm font-semibold text-destructive'}>
                        {formatCurrency(transaction.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma pendência no momento.
                </p>
              )
            ) : (
              <Skeleton className="h-36 w-full" />
            )}
          </CardContent>
        </Card>

        <Card className={dashboardCardClassName}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Alertas e atenção</CardTitle>
            <BadgeAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications ? (
              <>
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-medium">Alertas não lidos</p>
                  <p className="mt-1 text-2xl font-bold">{unreadNotifications.length}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-medium">Transações pendentes</p>
                  <p className="mt-1 text-2xl font-bold">{pendingTransactions.length}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-medium">Comprometimento do mês</p>
                  <p className="mt-1 text-2xl font-bold">
                    {summary?.monthlyIncome ? Math.round((summary.monthlyExpenses / summary.monthlyIncome) * 100) : 0}%
                  </p>
                </div>
              </>
            ) : (
              <Skeleton className="h-36 w-full" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={dashboardCardClassName}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Metas prioritárias</CardTitle>
            <Link to={'/goals' as '/'}>
              <span className="text-sm text-primary hover:underline">
                Ver metas
              </span>
            </Link>
          </CardHeader>
          <CardContent>
            {goals ? (
              topPriorityGoals.length > 0 ? (
                <ul className="space-y-3">
                  {topPriorityGoals.map((goal) => (
                    <li key={goal.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{goal.name}</p>
                        <span className="text-xs text-muted-foreground">
                          até {format(new Date(goal.targetDate), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Faltam {formatCurrency(goal.plan.remainingAmount)}. Sugestão: {formatCurrency(goal.plan.recommendedMonthlyContribution)}/mês.
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma meta ativa para priorizar.
                </p>
              )
            ) : (
              <Skeleton className="h-32 w-full" />
            )}
          </CardContent>
        </Card>

        <Card className={dashboardCardClassName}>
          <CardHeader>
            <CardTitle>Maiores categorias do mês</CardTitle>
          </CardHeader>
          <CardContent>
            {categorySpend ? (
              topCategories.length > 0 ? (
                <ul className="space-y-3">
                  {topCategories.map((category) => (
                    <li key={category.categoryId} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm">{category.categoryName}</span>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(category.total)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ainda não há categorias com gasto para destacar.
                </p>
              )
            ) : (
              <Skeleton className="h-32 w-full" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={dashboardCardClassName}>
          <CardHeader>
            <CardTitle>Economia ao longo do tempo</CardTitle>
          </CardHeader>
          <CardContent>
            {savingsData && savingsData.length > 0 && (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={savingsData}>
                  <defs>
                    <linearGradient id="savingsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.75} />
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthLabel" />
                  <YAxis tickFormatter={(v) => `${v}%`} />
                  {showCurrentMonthLineSavings && (
                    <ReferenceLine
                      x={currentMonthLabel}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      label={{ value: 'Mês atual', position: 'top', fill: 'hsl(var(--primary))' }}
                    />
                  )}
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === 'savingsPercent' ? [`${value}%`, 'Economia %'] : [formatCurrency(value), 'Valor']
                    }
                    labelFormatter={(label) => label}
                  />
                  <Area
                    type="monotone"
                    dataKey="savingsPercent"
                    stroke={CHART_COLORS.primary}
                    fill="url(#savingsAreaGradient)"
                    fillOpacity={1}
                    name="savingsPercent"
                    isAnimationActive={true}
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className={dashboardCardClassName}>
          <CardHeader>
            <CardTitle>Gastos por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categorySpend && categorySpend.length > 0 && (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={categorySpend}
                      dataKey="total"
                      nameKey="categoryName"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ categoryName, percent }) =>
                        `${categoryName} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {categorySpend.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={categorySpend[index]?.color ?? '#888'}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={dashboardCardClassName}>
          <CardHeader>
            <CardTitle>Gastos por categoria (barras)</CardTitle>
          </CardHeader>
          <CardContent>
            {categorySpend && categorySpend.length > 0 && (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={categorySpend}
                  layout="vertical"
                  margin={{ left: 20, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `${v / 1000}k`} />
                  <YAxis type="category" dataKey="categoryName" width={90} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar
                      dataKey="total"
                      fill={CHART_COLORS.primary}
                      radius={[0, 8, 8, 0]}
                      name="Total"
                      isAnimationActive={true}
                      animationDuration={1400}
                    />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progresso das metas</CardTitle>
          </CardHeader>
          <CardContent>
            {goalsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={goalsChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(0)}%`, 'Progresso']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                  />
                  <Bar
                    dataKey="progress"
                    fill={CHART_COLORS.primary}
                    radius={[0, 8, 8, 0]}
                    name="Progresso"
                    isAnimationActive={true}
                    animationDuration={1500}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-sm text-muted-foreground">Nenhuma meta para exibir.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className={`lg:col-span-2 ${dashboardCardClassName}`}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Últimas transações</CardTitle>
            <Link to={'/transactions' as '/'}>
              <span className="text-sm text-primary hover:underline">
                Ver todas
              </span>
            </Link>
          </CardHeader>
          <CardContent>
            {transactions && transactions.length > 0 ? (
              <ul className="space-y-3">
                {transactions.slice(0, 5).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <span className="text-sm">{t.description ?? '-'}</span>
                    <span
                      className={
                        t.type === 'income'
                          ? 'text-sm font-medium text-green-600'
                          : 'text-sm font-medium text-destructive'
                      }
                    >
                      {t.type === 'income' ? '+' : '-'}
                      {formatCurrency(t.value)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma transação recente.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className={dashboardCardClassName}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Alertas</CardTitle>
              <Link to={'/notifications' as '/'}>
                <Bell className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent>
              {notifications && notifications.filter((n) => !n.read).length > 0 ? (
                <ul className="space-y-2">
                  {notifications
                    .filter((n) => !n.read)
                    .slice(0, 3)
                    .map((n) => (
                      <Alert key={n.id} variant="warning">
                        <AlertTitle className="text-sm">{n.title}</AlertTitle>
                        <AlertDescription className="text-xs">
                          {n.message}
                        </AlertDescription>
                      </Alert>
                    ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum alerta no momento.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className={dashboardCardClassName}>
            <CardHeader>
              <CardTitle>Progresso das metas</CardTitle>
            </CardHeader>
            <CardContent>
              {goalsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={goalsChartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} hide />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => [`${v.toFixed(0)}%`, 'Progresso']} />
                    <Bar
                      dataKey="progress"
                      fill={CHART_COLORS.primary}
                      radius={[0, 4, 4, 0]}
                      isAnimationActive={true}
                      animationDuration={1200}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma meta ativa.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

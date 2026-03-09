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
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Skeleton } from '@/shared/ui/skeleton';
import { formatCurrency } from '@/shared/lib/format';
import { Link } from '@tanstack/react-router';
import { Bell, Brain, TrendingUp, TrendingDown, Wallet, Target } from 'lucide-react';

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

  const evolutionData = Array.isArray(evolution)
    ? evolution.map((e: { month: string }) => ({
        ...e,
        month: new Date(e.month + '-01').toLocaleDateString('pt-BR', {
          month: 'short',
          year: '2-digit',
        }),
      }))
    : undefined;

  const savingsData = Array.isArray(savingsEvolution)
    ? savingsEvolution.map((e: { month: string }) => ({
        ...e,
        monthLabel: new Date(e.month + '-01').toLocaleDateString('pt-BR', {
          month: 'short',
          year: '2-digit',
        }),
      }))
    : undefined;

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

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {summaryLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
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
          <Card>
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
          <Card>
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
          <Card>
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
          <Card>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Insight financeiro do dia</CardTitle>
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
        <Card>
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
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => label}
                    />
                    <Line
                      type="monotone"
                      dataKey="income"
                      stroke="#22c55e"
                      name="Receitas"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="#ef4444"
                      name="Despesas"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      stroke="hsl(var(--primary))"
                      name="Saldo"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
          </CardContent>
        </Card>

        <Card>
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
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="income" fill="#22c55e" name="Receitas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#ef4444" name="Despesas" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Economia ao longo do tempo</CardTitle>
          </CardHeader>
          <CardContent>
            {savingsData && savingsData.length > 0 && (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={savingsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthLabel" />
                  <YAxis tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === 'savingsPercent' ? [`${value}%`, 'Economia %'] : [formatCurrency(value), 'Valor']
                    }
                    labelFormatter={(label) => label}
                  />
                  <Area
                    type="monotone"
                    dataKey="savingsPercent"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                    name="savingsPercent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
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
        <Card>
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
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Total" />
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
                  <Bar dataKey="progress" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Progresso" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-sm text-muted-foreground">Nenhuma meta para exibir.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
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
          <Card>
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

          <Card>
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
                    <Bar dataKey="progress" fill="hsl(var(--primary))" radius={[0, 2, 2, 0]} />
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

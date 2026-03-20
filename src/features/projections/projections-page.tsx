import { useQuery } from '@tanstack/react-query';
import {
  getBalanceProjection,
  getProjectionScenarios,
} from '@/shared/services/projections.service';
import { formatCurrency } from '@/shared/lib/format';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Skeleton } from '@/shared/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { toServiceError } from '@/shared/lib/errors';

const projectionCardClassName =
  'border-primary/10 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm';

const scenarioColors = ['hsl(var(--primary))', '#22c55e', '#ef4444'];

function formatMonthLabel(date: string): string {
  return new Date(`${date}-01`).toLocaleDateString('pt-BR', {
    month: 'short',
    year: '2-digit',
  });
}

function getFinalBalance(points: Array<{ balance: number }>): number {
  return points[points.length - 1]?.balance ?? 0;
}

function getFirstNegativePoint<T extends { date: string; balance: number }>(points: T[]): T | null {
  return points.find((point) => point.balance < 0) ?? null;
}

export function ProjectionsPage() {
  const {
    data: projection,
    isLoading: projectionLoading,
    isError: projectionError,
    error: projectionErrorDetail,
  } = useQuery({
    queryKey: ['projections', 'balance'],
    queryFn: getBalanceProjection,
  });

  const {
    data: scenarios,
    isLoading: scenariosLoading,
    isError: scenariosError,
    error: scenariosErrorDetail,
  } = useQuery({
    queryKey: ['projections', 'scenarios'],
    queryFn: getProjectionScenarios,
  });

  const loadError =
    projectionError || scenariosError
      ? toServiceError(projectionError ? projectionErrorDetail : scenariosErrorDetail)
      : null;

  const projectionData = projection?.map((p) => ({
    ...p,
    month: formatMonthLabel(p.date),
  }));

  const scenariosComparisonData =
    scenarios && scenarios.length > 1 && projectionData?.length
      ? projectionData.map((pt, idx) => {
          const point: Record<string, string | number> = {
            month: pt.month,
            balance: pt.balance,
          };
          scenarios.forEach((s) => {
            const p = s.points[idx];
            if (p) point[s.id] = p.balance;
          });
          return point;
        })
      : [];

  const currentBalance = projectionData?.[0]?.balance ?? 0;
  const projectedFinalBalance = projectionData?.[projectionData.length - 1]?.balance ?? 0;
  const projectedDelta = projectedFinalBalance - currentBalance;
  const firstNegativeProjectionPoint = projectionData
    ? getFirstNegativePoint(projectionData)
    : null;
  const averageMonthlyDelta =
    projectionData && projectionData.length > 1
      ? Math.round((projectedFinalBalance - currentBalance) / (projectionData.length - 1))
      : 0;

  const enrichedScenarios =
    scenarios?.map((scenario) => {
      const finalBalance = getFinalBalance(scenario.points);
      return {
        ...scenario,
        finalBalance,
        firstNegativePoint: getFirstNegativePoint(scenario.points),
      };
    }) ?? [];

  const bestScenario = enrichedScenarios.reduce<(typeof enrichedScenarios)[number] | null>(
    (best, scenario) => (best && best.finalBalance >= scenario.finalBalance ? best : scenario),
    null
  );
  const worstScenario = enrichedScenarios.reduce<(typeof enrichedScenarios)[number] | null>(
    (worst, scenario) => (worst && worst.finalBalance <= scenario.finalBalance ? worst : scenario),
    null
  );
  const nextMilestones = projectionData?.slice(1, 5) ?? [];
  const isLoading = projectionLoading || scenariosLoading;
  const hasProjectionData = !!projectionData?.length;

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <h1 className="text-xl font-bold sm:text-2xl">Projeções</h1>

      {loadError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Não foi possível carregar as projeções</AlertTitle>
          <AlertDescription>{loadError.message}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <Card key={item} className={projectionCardClassName}>
                <CardHeader className="space-y-2 pb-2">
                  <Skeleton className="h-4 w-28" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className={projectionCardClassName}>
            <CardContent className="pt-6">
              <Skeleton className="h-[320px] w-full" />
            </CardContent>
          </Card>
        </>
      )}

      {!isLoading && !hasProjectionData && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Sem dados suficientes para projetar</AlertTitle>
          <AlertDescription>
            Cadastre transações concluídas ou recorrências para gerar projeções mais confiáveis.
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && hasProjectionData && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className={projectionCardClassName}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo projetado final</CardTitle>
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(projectedFinalBalance)}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Valor estimado ao fim da janela projetada.
              </p>
            </CardContent>
          </Card>

          <Card className={projectionCardClassName}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Variação no período</CardTitle>
              {projectedDelta >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${projectedDelta >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {formatCurrency(projectedDelta)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Média mensal estimada: {formatCurrency(averageMonthlyDelta)}.
              </p>
            </CardContent>
          </Card>

          <Card className={projectionCardClassName}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Risco de saldo negativo</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {firstNegativeProjectionPoint ? formatMonthLabel(firstNegativeProjectionPoint.date) : 'Sem risco'}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {firstNegativeProjectionPoint
                  ? 'Primeiro mês previsto com saldo abaixo de zero.'
                  : 'Nenhum mês projetado fica negativo no cenário base.'}
              </p>
            </CardContent>
          </Card>

          <Card className={projectionCardClassName}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Melhor cenário</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bestScenario?.name ?? 'Indisponível'}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {bestScenario
                  ? `Fecha em ${formatCurrency(bestScenario.finalBalance)}.`
                  : 'Sem cenários suficientes para comparar.'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className={projectionCardClassName}>
        <CardHeader>
          <CardTitle>Projeção de saldo futuro</CardTitle>
        </CardHeader>
        <CardContent>
          {projectionData && projectionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={projectionData}>
                <defs>
                  <linearGradient id="projectionAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--primary))"
                  fill="url(#projectionAreaGradient)"
                  fillOpacity={1}
                  name="Saldo projetado"
                  strokeWidth={3}
                  isAnimationActive={true}
                  animationDuration={1400}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            !isLoading && (
              <p className="text-sm text-muted-foreground">
                Ainda não foi possível gerar uma projeção de saldo.
              </p>
            )
          )}
        </CardContent>
      </Card>

      {scenarios && scenarios.length > 1 && scenariosComparisonData.length > 0 && (
        <Card className={projectionCardClassName}>
          <CardHeader>
            <CardTitle>Comparativo de cenários</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={scenariosComparisonData} margin={{ right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                {scenarios.map((s, i) => {
                  return (
                    <Line
                      key={s.id}
                      type="monotone"
                      dataKey={s.id}
                      stroke={scenarioColors[i % scenarioColors.length]}
                      name={s.name}
                      strokeWidth={2.5}
                      connectNulls
                      dot={false}
                      activeDot={{ r: 6 }}
                      isAnimationActive={true}
                      animationDuration={1000 + i * 250}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {!isLoading && bestScenario && worstScenario && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className={projectionCardClassName}>
            <CardHeader>
              <CardTitle>Leitura rápida</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                O cenário mais favorável hoje é <span className="font-medium text-foreground">{bestScenario.name}</span>,
                com fechamento estimado em {formatCurrency(bestScenario.finalBalance)}.
              </p>
              <p>
                O cenário mais pressionado é <span className="font-medium text-foreground">{worstScenario.name}</span>,
                com fechamento estimado em {formatCurrency(worstScenario.finalBalance)}.
              </p>
              <p>
                {firstNegativeProjectionPoint
                  ? `Se nada mudar, o cenário base entra em saldo negativo a partir de ${formatMonthLabel(firstNegativeProjectionPoint.date)}.`
                  : 'No cenário base atual, a projeção não cruza saldo negativo.'}
              </p>
            </CardContent>
          </Card>

          <Card className={projectionCardClassName}>
            <CardHeader>
              <CardTitle>Próximos marcos</CardTitle>
            </CardHeader>
            <CardContent>
              {nextMilestones.length > 0 ? (
                <ul className="space-y-3">
                  {nextMilestones.map((point) => (
                    <li
                      key={point.date}
                      className="flex items-center justify-between rounded-lg border border-primary/10 bg-background/60 px-3 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{point.month}</span>
                      </div>
                      <span className={`text-sm font-semibold ${point.balance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                        {formatCurrency(point.balance)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum marco projetado disponível.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card className={projectionCardClassName}>
        <CardHeader>
          <CardTitle>Cenários simulados</CardTitle>
        </CardHeader>
        <CardContent>
          {scenarios && scenarios.length > 0 ? (
            <Tabs defaultValue={scenarios[0]?.id ?? ''}>
              <TabsList>
                {scenarios.map((s) => (
                  <TabsTrigger key={s.id} value={s.id}>
                    {s.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              {scenarios.map((s) => {
                const finalBalance = getFinalBalance(s.points);
                const firstNegativePoint = getFirstNegativePoint(s.points);
                const chartData = s.points.map((p) => ({
                  ...p,
                  month: formatMonthLabel(p.date),
                }));
                return (
                  <TabsContent key={s.id} value={s.id}>
                    <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_220px]">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">{s.description}</p>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-lg border border-primary/10 bg-background/60 px-3 py-3">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Fechamento estimado
                            </p>
                            <p className="mt-1 text-lg font-semibold">
                              {formatCurrency(finalBalance)}
                            </p>
                          </div>
                          <div className="rounded-lg border border-primary/10 bg-background/60 px-3 py-3">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Primeira pressão negativa
                            </p>
                            <p className="mt-1 text-lg font-semibold">
                              {firstNegativePoint ? formatMonthLabel(firstNegativePoint.date) : 'Sem risco'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(v) => `${v / 1000}k`} />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                        <Line
                          type="monotone"
                          dataKey="balance"
                          stroke="hsl(var(--primary))"
                          name="Saldo"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 6 }}
                          isAnimationActive={true}
                          animationDuration={1200}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                );
              })}
            </Tabs>
          ) : (
            <p className="text-muted-foreground">
              Nenhum cenário disponível.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

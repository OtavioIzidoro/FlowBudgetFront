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
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

export function ProjectionsPage() {
  const { data: projection } = useQuery({
    queryKey: ['projections', 'balance'],
    queryFn: getBalanceProjection,
  });

  const { data: scenarios } = useQuery({
    queryKey: ['projections', 'scenarios'],
    queryFn: getProjectionScenarios,
  });

  const projectionData = projection?.map((p) => ({
    ...p,
    month: new Date(p.date + '-01').toLocaleDateString('pt-BR', {
      month: 'short',
      year: '2-digit',
    }),
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

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Projeções</h1>

      <Card>
        <CardHeader>
          <CardTitle>Projeção de saldo futuro</CardTitle>
        </CardHeader>
        <CardContent>
          {projectionData && projectionData.length > 0 && (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                  name="Saldo projetado"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {scenarios && scenarios.length > 1 && scenariosComparisonData.length > 0 && (
        <Card>
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
                {scenarios.map((s, i) => {
                  const colors = ['hsl(var(--primary))', '#22c55e', '#ef4444'];
                  return (
                    <Line
                      key={s.id}
                      type="monotone"
                      dataKey={s.id}
                      stroke={colors[i % colors.length]}
                      name={s.name}
                      strokeWidth={2}
                      connectNulls
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
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
                const chartData = s.points.map((p) => ({
                  ...p,
                  month: new Date(p.date + '-01').toLocaleDateString('pt-BR', {
                    month: 'short',
                    year: '2-digit',
                  }),
                }));
                return (
                  <TabsContent key={s.id} value={s.id}>
                    <p className="mb-4 text-sm text-muted-foreground">
                      {s.description}
                    </p>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(v) => `${v / 1000}k`} />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTransactions, updateTransaction } from '@/shared/services/transactions.service';
import { getCategories } from '@/shared/services/categories.service';
import { formatCurrency } from '@/shared/lib/format';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Switch } from '@/shared/ui/switch';
import { CalendarCheck } from 'lucide-react';
import { toServiceError } from '@/shared/lib/errors';
import { useToastStore } from '@/shared/store/toast-store';
import { appLogger } from '@/shared/logger';
import { invalidateTransactionRelatedQueries } from '@/shared/lib/query-invalidation';

function getMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function BillsPage() {
  const queryClient = useQueryClient();
  const currentMonth = getMonthKey(new Date());

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => getTransactions({ type: 'expense' }),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; status: 'pending' | 'completed' }) =>
      updateTransaction({ id: payload.id, status: payload.status }),
    onSuccess: async () => {
      await invalidateTransactionRelatedQueries(queryClient);
      useToastStore.getState().success('Status atualizado.');
    },
    onError: (error: unknown) => {
      const err = toServiceError(error);
      appLogger.error('Erro ao atualizar', {
        domain: 'transaction',
        event: 'bills.update.error',
        code: err.code,
        error: err.message,
      });
      useToastStore.getState().error(err.message);
    },
  });

  const bills =
    transactions?.filter((t) => {
      const yyyyMm = t.date.slice(0, 7);
      return yyyyMm === currentMonth && t.status !== 'cancelled';
    }) ?? [];

  const sortedBills = [...bills].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const categoryMap = new Map(categories?.map((c) => [c.id, c]) ?? []);
  const total = sortedBills.reduce((acc, t) => acc + t.value, 0);
  const paidTotal = sortedBills.filter((t) => t.status === 'completed').reduce((acc, t) => acc + t.value, 0);

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarCheck className="h-6 w-6 shrink-0 text-primary sm:h-8 sm:w-8" />
        <h1 className="text-xl font-bold sm:text-2xl">Contas a pagar este mês</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 sm:gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Total do mês</p>
            <p className="text-xl font-semibold text-destructive">{formatCurrency(total)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Já pago</p>
            <p className="text-xl font-semibold text-green-600">{formatCurrency(paidTotal)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Falta pagar</p>
            <p className="text-xl font-semibold">
              {formatCurrency(total - paidTotal)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedBills.length === 0 ? (
            <p className="text-muted-foreground">
              Nenhuma despesa com vencimento neste mês.
            </p>
          ) : (
            <ul className="space-y-3">
              {sortedBills.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{categoryMap.get(t.categoryId)?.name ?? t.categoryId}</p>
                    <p className="text-sm text-muted-foreground">
                      Vencimento: {format(new Date(t.date), "dd/MM/yyyy", { locale: ptBR })}
                      {t.description ? ` · ${t.description}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0 sm:gap-3">
                    <span className="font-semibold text-destructive">
                      {formatCurrency(t.value)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Pago</span>
                      <Switch
                        checked={t.status === 'completed'}
                        disabled={updateMutation.isPending}
                        onCheckedChange={(checked) =>
                          updateMutation.mutate({
                            id: t.id,
                            status: checked ? 'completed' : 'pending',
                          })
                        }
                        aria-label={t.status === 'completed' ? 'Marcado como pago' : 'Marcar como pago'}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

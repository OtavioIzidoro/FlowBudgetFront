import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { getTransactions, updateTransaction } from '@/shared/services/transactions.service';
import { getCategories } from '@/shared/services/categories.service';
import { getRecurringTemplates } from '@/shared/services/recurring.service';
import { formatCurrency } from '@/shared/lib/format';
import { format, startOfMonth, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Switch } from '@/shared/ui/switch';
import { CalendarCheck, Info } from 'lucide-react';
import { toServiceError } from '@/shared/lib/errors';
import { useToastStore } from '@/shared/store/toast-store';
import { appLogger } from '@/shared/logger';
import { invalidateTransactionRelatedQueries } from '@/shared/lib/query-invalidation';
import { cn } from '@/shared/lib/utils';
import type { Transaction } from '@/entities/transaction/types';
import type { RecurringTemplate } from '@/entities/recurring-template/types';
import { Skeleton } from '@/shared/ui/skeleton';
import { parseLocalDateYmd, startOfMonthFromYearMonthKey } from '@/shared/lib/date';

/** Mês atual + quantidade de meses à frente na visão consolidada */
const MONTH_WINDOW = 7;

function monthKeyFromDate(d: Date): string {
  return format(startOfMonth(d), 'yyyy-MM');
}

function buildMonthKeys(): string[] {
  const start = startOfMonth(new Date());
  return Array.from({ length: MONTH_WINDOW }, (_, i) => format(addMonths(start, i), 'yyyy-MM'));
}

function sumActiveRecurringExpenses(templates: RecurringTemplate[]): number {
  return templates
    .filter((t) => t.type === 'expense' && t.active !== false)
    .reduce((acc, t) => acc + t.value, 0);
}

interface MonthBillsSummary {
  monthKey: string;
  label: string;
  total: number;
  paidTotal: number;
  toPay: number;
  isEstimate: boolean;
}

function computeMonthSummaries(
  transactions: Transaction[],
  recurringExpenseTotal: number,
  monthKeys: string[],
  todayMonthKey: string
): MonthBillsSummary[] {
  return monthKeys.map((monthKey) => {
    const bills = transactions.filter((t) => {
      const yyyyMm = t.date.slice(0, 7);
      return yyyyMm === monthKey && t.status !== 'cancelled';
    });
    const txTotal = bills.reduce((acc, t) => acc + t.value, 0);
    const paidFromTx = bills
      .filter((t) => t.status === 'completed')
      .reduce((acc, t) => acc + t.value, 0);

    const isStrictFuture = monthKey > todayMonthKey;
    const useRecurringEstimate = isStrictFuture && txTotal === 0 && recurringExpenseTotal > 0;
    const total = useRecurringEstimate ? recurringExpenseTotal : txTotal;
    const paidTotal = useRecurringEstimate ? 0 : paidFromTx;

    return {
      monthKey,
      label: format(startOfMonthFromYearMonthKey(monthKey), "MMMM 'de' yyyy", { locale: ptBR }),
      total,
      paidTotal,
      toPay: total - paidTotal,
      isEstimate: useRecurringEstimate,
    };
  });
}

export function BillsPage() {
  const queryClient = useQueryClient();
  const todayMonthKey = monthKeyFromDate(new Date());
  const monthKeys = useMemo(() => buildMonthKeys(), [todayMonthKey]);
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => monthKeyFromDate(new Date()));

  useEffect(() => {
    setSelectedMonthKey((prev) => (monthKeys.includes(prev) ? prev : todayMonthKey));
  }, [monthKeys, todayMonthKey]);

  const { data: transactions, isPending: transactionsPending } = useQuery({
    queryKey: ['transactions', '', 'expense'],
    queryFn: () => getTransactions({ type: 'expense', limit: 500 }),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { data: recurringTemplates, isPending: recurringPending } = useQuery({
    queryKey: ['recurring-templates'],
    queryFn: getRecurringTemplates,
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

  const recurringExpenseTotal = useMemo(
    () => sumActiveRecurringExpenses(recurringTemplates ?? []),
    [recurringTemplates]
  );

  const monthSummaries = useMemo(
    () =>
      computeMonthSummaries(transactions ?? [], recurringExpenseTotal, monthKeys, todayMonthKey),
    [transactions, recurringExpenseTotal, monthKeys, todayMonthKey]
  );

  const billsForSelectedMonth =
    transactions?.filter((t) => {
      const yyyyMm = t.date.slice(0, 7);
      return yyyyMm === selectedMonthKey && t.status !== 'cancelled';
    }) ?? [];

  const sortedBills = [...billsForSelectedMonth].sort(
    (a, b) => parseLocalDateYmd(a.date).getTime() - parseLocalDateYmd(b.date).getTime()
  );

  const categoryMap = new Map(categories?.map((c) => [c.id, c]) ?? []);
  const total = sortedBills.reduce((acc, t) => acc + t.value, 0);
  const paidTotal = sortedBills
    .filter((t) => t.status === 'completed')
    .reduce((acc, t) => acc + t.value, 0);

  const selectedSummary = monthSummaries.find((m) => m.monthKey === selectedMonthKey);
  const listIsEstimate = selectedSummary?.isEstimate ?? false;

  const isLoading = transactionsPending || recurringPending;

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarCheck className="h-6 w-6 shrink-0 text-primary sm:h-8 sm:w-8" />
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Contas a pagar</h1>
          <p className="text-sm text-muted-foreground">
            Despesas (à vista e parceladas) por mês de vencimento — totais e lista no mês selecionado.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Totais por mês</CardTitle>
          <p className="text-sm text-muted-foreground">
            Meses futuros sem lançamentos usam a soma das suas despesas recorrentes ativas como estimativa.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 rounded-md border border-primary/15 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <p>
              Toque ou clique em um mês para ver a lista de contas naquele período. O valor consolidado aparece na
              coluna &quot;Total&quot;.
            </p>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[520px] text-sm">
              <caption className="sr-only">
                Totais de contas a pagar por mês; selecione um mês para ver o detalhe abaixo.
              </caption>
              <thead className="border-b bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Mês</th>
                  <th className="px-3 py-2 font-medium text-right">Total</th>
                  <th className="px-3 py-2 font-medium text-right">Pago</th>
                  <th className="px-3 py-2 font-medium text-right">A pagar</th>
                  <th className="px-3 py-2 font-medium text-center">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: MONTH_WINDOW }).map((_, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <Skeleton className="h-4 w-36" />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Skeleton className="ml-auto h-4 w-20" />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Skeleton className="ml-auto h-4 w-20" />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Skeleton className="ml-auto h-4 w-20" />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Skeleton className="mx-auto h-4 w-16" />
                        </td>
                      </tr>
                    ))
                  : monthSummaries.map((row) => {
                      const isSelected = row.monthKey === selectedMonthKey;
                      return (
                        <tr
                          key={row.monthKey}
                          className={cn(
                            'border-b last:border-0 transition-colors',
                            isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                          )}
                        >
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setSelectedMonthKey(row.monthKey)}
                              className={cn(
                                'text-left font-medium underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm',
                                isSelected && 'text-primary'
                              )}
                            >
                              <span className="capitalize">{row.label}</span>
                            </button>
                            {row.isEstimate && (
                              <span className="ml-2 text-xs font-normal text-muted-foreground">(estimativa)</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-destructive">
                            {formatCurrency(row.total)}
                          </td>
                          <td className="px-3 py-2 text-right text-green-600">{formatCurrency(row.paidTotal)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(row.toPay)}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedMonthKey(row.monthKey)}
                              className="text-xs font-medium text-primary underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm"
                            >
                              Ver lista
                            </button>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="capitalize">
            Resumo — {selectedSummary ? selectedSummary.label : selectedMonthKey}
          </CardTitle>
          {listIsEstimate && (
            <p className="text-sm text-amber-700 dark:text-amber-500">
              Nenhuma despesa lançada neste mês; valores refletem apenas recorrências ativas (estimativa).
            </p>
          )}
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 sm:gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Total do mês</p>
            <p className="text-xl font-semibold text-destructive">
              {formatCurrency(selectedSummary?.total ?? total)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Já pago</p>
            <p className="text-xl font-semibold text-green-600">
              {formatCurrency(selectedSummary?.paidTotal ?? paidTotal)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Falta pagar</p>
            <p className="text-xl font-semibold">
              {formatCurrency((selectedSummary?.total ?? total) - (selectedSummary?.paidTotal ?? paidTotal))}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista do mês selecionado</CardTitle>
        </CardHeader>
        <CardContent>
          {listIsEstimate ? (
            <p className="text-muted-foreground">
              Ainda não há despesas com vencimento neste mês. Cadastre lançamentos ou confirme recorrências para o
              período para ver itens aqui.
            </p>
          ) : sortedBills.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma despesa com vencimento neste mês.</p>
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
                      Vencimento: {format(parseLocalDateYmd(t.date), 'dd/MM/yyyy', { locale: ptBR })}
                      {t.installmentsTotal != null &&
                      t.installmentsTotal > 1 &&
                      t.installmentNumber != null
                        ? ` · Parcela ${t.installmentNumber}/${t.installmentsTotal}`
                        : ''}
                      {t.description ? ` · ${t.description}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0 sm:gap-3">
                    <span className="font-semibold text-destructive">{formatCurrency(t.value)}</span>
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

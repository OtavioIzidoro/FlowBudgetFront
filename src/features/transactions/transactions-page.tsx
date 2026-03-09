import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNewTransactionModalStore } from '@/shared/store/new-transaction-modal-store';
import {
  getTransactions,
  deleteTransaction,
  updateTransaction,
} from '@/shared/services/transactions.service';
import {
  getRecurringTemplates,
  deleteRecurringTemplate,
  confirmRecurringForMonth,
} from '@/shared/services/recurring.service';
import { getCategories } from '@/shared/services/categories.service';
import type { TransactionType, TransactionStatus } from '@/entities/transaction/types';
import { TransactionFormDialog } from '@/features/transactions/transaction-form-dialog';
import { RecurringFormDialog } from '@/features/recurring/recurring-form-dialog';
import type { RecurringTemplate } from '@/entities/recurring-template/types';
import { formatCurrency } from '@/shared/lib/format';
import { format, subMonths, addMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, Repeat, Check } from 'lucide-react';
import { Switch } from '@/shared/ui/switch';
import { toServiceError } from '@/shared/lib/errors';
import { appLogger } from '@/shared/logger';
import { useToastStore } from '@/shared/store/toast-store';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  invalidateTransactionRelatedQueries,
  removeTransactionFromQueries,
  upsertTransactionInQueries,
} from '@/shared/lib/query-invalidation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Receita',
  expense: 'Despesa',
};

const STATUS_LABELS: Record<TransactionStatus, string> = {
  pending: 'Pendente',
  completed: 'Pago',
  cancelled: 'Cancelado',
};

function getStatusLabel(status: TransactionStatus, type: TransactionType): string {
  if (status === 'completed') return type === 'income' ? 'Recebido' : 'Pago';
  return STATUS_LABELS[status];
}

function getMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function parseMonthKey(value: string): Date {
  const [yearPart, monthPart] = value.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);
  return new Date(year, (month || 1) - 1, 1);
}

function parseTransactionDate(value: string): Date {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  return new Date(value);
}

export function TransactionsPage() {
  const queryClient = useQueryClient();
  const openFromFab = useNewTransactionModalStore((s) => s.openFromFab);
  const setOpenFromFab = useNewTransactionModalStore((s) => s.setOpenFromFab);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>(() => getMonthKey(new Date()));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creatingRecurring, setCreatingRecurring] = useState(false);
  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null);
  const [updatingTransactionId, setUpdatingTransactionId] = useState<string | null>(null);

  useEffect(() => {
    if (openFromFab) setCreating(true);
    setOpenFromFab(false);
  }, [openFromFab, setOpenFromFab]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { data: recurringTemplates } = useQuery({
    queryKey: ['recurring-templates'],
    queryFn: getRecurringTemplates,
  });

  const { data: transactions, isLoading } = useQuery({
    queryKey: [
      'transactions',
      search,
      typeFilter === 'all' ? undefined : typeFilter,
      categoryFilter === 'all' ? undefined : categoryFilter,
    ],
    queryFn: () =>
      getTransactions({
        search: search || undefined,
        type: typeFilter === 'all' ? undefined : typeFilter,
        categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
      }),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; status: TransactionStatus }) =>
      updateTransaction({ id: payload.id, status: payload.status }),
    onMutate: async (payload) => {
      setUpdatingTransactionId(payload.id);
      const previousQueries = queryClient.getQueriesData<{ id: string; status: TransactionStatus }[]>({
        queryKey: ['transactions'],
      });

      queryClient.setQueriesData(
        { queryKey: ['transactions'] },
        (old: { id: string; status: TransactionStatus }[] | undefined) =>
          old?.map((item) =>
            item.id === payload.id ? { ...item, status: payload.status } : item
          ) ?? old
      );

      return { previousQueries };
    },
    onSuccess: async (updatedTransaction) => {
      upsertTransactionInQueries(queryClient, updatedTransaction);
      await invalidateTransactionRelatedQueries(queryClient);
      useToastStore.getState().success('Status atualizado.');
    },
    onError: (error: unknown, _variables, context) => {
      context?.previousQueries.forEach(([queryKey, queryData]) => {
        queryClient.setQueryData(queryKey, queryData);
      });
      const err = toServiceError(error);
      appLogger.error('Erro ao atualizar status', {
        domain: 'transaction',
        event: 'transaction.update.error',
        code: err.code,
        error: err.message,
      });
      useToastStore.getState().error(err.message);
    },
    onSettled: () => {
      setUpdatingTransactionId(null);
    },
  });

  const filteredTransactions =
    transactions?.filter((t) => {
      const raw = t.date;
      if (raw == null) return true;

      const dateStr = typeof raw === 'string' ? raw : String(raw);
      const yyyyMm = dateStr.slice(0, 7);

      if (monthFilter === 'upcoming-pending-expenses') {
        const currentMonthStart = startOfMonth(new Date()).getTime();
        return (
          t.type === 'expense' &&
          t.status === 'pending' &&
          parseTransactionDate(dateStr).getTime() >= currentMonthStart
        );
      }

      if (!monthFilter) return true;
      return yyyyMm === monthFilter;
    }) ?? [];

  const deleteRecurringMutation = useMutation({
    mutationFn: deleteRecurringTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
      useToastStore.getState().success('Recorrência removida.');
    },
    onError: (error: unknown) => {
      const err = toServiceError(error);
      appLogger.error('Erro ao remover recorrência', {
        domain: 'recurring',
        event: 'recurring.delete.error',
        code: err.code,
        error: err.message,
      });
      useToastStore.getState().error(err.message);
    },
  });

  const confirmRecurringMutation = useMutation({
    mutationFn: ({ template, yearMonth }: { template: RecurringTemplate; yearMonth: string }) =>
      confirmRecurringForMonth(template, yearMonth),
    onSuccess: async (createdTransaction) => {
      upsertTransactionInQueries(queryClient, createdTransaction);
      await invalidateTransactionRelatedQueries(queryClient);
      useToastStore.getState().success('Transação criada. Confirme se recebeu/pagou na listagem.');
    },
    onError: (error: unknown) => {
      const err = toServiceError(error);
      appLogger.error('Erro ao confirmar recorrência', {
        domain: 'recurring',
        event: 'recurring.confirm.error',
        code: err.code,
        error: err.message,
      });
      useToastStore.getState().error(err.message);
    },
  });

  const isRecurringConfirmedForMonth = (
    template: RecurringTemplate,
    yearMonth: string,
    txList: { date: string; categoryId: string; type: string; value: number }[]
  ): boolean => {
    return txList.some(
      (t) =>
        t.date.startsWith(yearMonth) &&
        t.categoryId === template.categoryId &&
        t.type === template.type &&
        t.value === template.value
    );
  };

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: async (_data, deletedTransactionId) => {
      removeTransactionFromQueries(queryClient, deletedTransactionId);
      await invalidateTransactionRelatedQueries(queryClient);
      setDeletingId(null);
      useToastStore.getState().success('Transação removida.');
    },
    onError: (error: unknown) => {
      const err = toServiceError(error);
      appLogger.error('Erro ao remover transação', {
        domain: 'transaction',
        event: 'transaction.delete.error',
        code: err.code,
        error: err.message,
      });
      useToastStore.getState().error(err.message);
    },
  });

  const categoryMap = new Map(categories?.map((c) => [c.id, c]) ?? []);
  const editingRecurringTemplate = editingRecurringId
    ? recurringTemplates?.find((template) => template.id === editingRecurringId)
    : undefined;

  const chartDataByCategory = (() => {
    if (!filteredTransactions.length || !categories?.length) return [];
    const expenseByCategory = filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.categoryId] = (acc[t.categoryId] ?? 0) + t.value;
        return acc;
      }, {} as Record<string, number>);
    return categories
      .filter((c) => (expenseByCategory[c.id] ?? 0) > 0)
      .map((c) => ({
        categoryName: c.name,
        total: expenseByCategory[c.id] ?? 0,
      }))
      .sort((a, b) => b.total - a.total);
  })();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transações</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova transação
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as TransactionType | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <label htmlFor="month-filter" className="text-sm text-muted-foreground whitespace-nowrap">
              Mês:
            </label>
            <Select
              value={monthFilter || 'all'}
              onValueChange={(v) => setMonthFilter(v === 'all' ? '' : v)}
            >
              <SelectTrigger id="month-filter" className="w-[180px]">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={getMonthKey(new Date())}>Este mês</SelectItem>
                <SelectItem value="upcoming-pending-expenses">A pagar daqui pra frente</SelectItem>
                <SelectItem value={getMonthKey(addMonths(new Date(), 1))}>Próximo mês</SelectItem>
                <SelectItem value={getMonthKey(subMonths(new Date(), 1))}>Mês passado</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
                {Array.from({ length: 12 }, (_, i) => {
                  const d = addMonths(new Date(), i + 2);
                  const key = getMonthKey(d);
                  const label = format(d, 'MMMM yyyy', { locale: ptBR });
                  return (
                    <SelectItem key={key} value={key}>
                      {label.charAt(0).toUpperCase() + label.slice(1)}
                    </SelectItem>
                  );
                })}
                {Array.from({ length: 24 }, (_, i) => {
                  const d = subMonths(new Date(), i + 2);
                  const key = getMonthKey(d);
                  const label = format(d, 'MMMM yyyy', { locale: ptBR });
                  return (
                    <SelectItem key={key} value={key}>
                      {label.charAt(0).toUpperCase() + label.slice(1)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 border rounded-md">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const ref = monthFilter
                    ? parseMonthKey(monthFilter)
                    : new Date();
                  setMonthFilter(getMonthKey(subMonths(ref, 1)));
                }}
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[120px] text-center text-sm font-medium">
                {monthFilter === 'upcoming-pending-expenses'
                  ? 'A pagar'
                  : monthFilter
                  ? format(parseMonthKey(monthFilter), 'MMMM yyyy', { locale: ptBR }).replace(/^./, (c) => c.toUpperCase())
                  : 'Todos os meses'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const ref = monthFilter
                    ? monthFilter === 'upcoming-pending-expenses'
                      ? new Date()
                      : parseMonthKey(monthFilter)
                    : new Date();
                  setMonthFilter(getMonthKey(addMonths(ref, 1)));
                }}
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {monthFilter === 'upcoming-pending-expenses' && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Exibindo despesas pendentes do mês atual em diante para facilitar o acompanhamento do que ainda falta pagar.
            </p>
          </CardContent>
        </Card>
      )}

      {recurringTemplates && recurringTemplates.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recorrências</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setCreatingRecurring(true)}>
              <Repeat className="mr-2 h-4 w-4" />
              Nova
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Todo mês o valor aparece; você confirma se já recebeu ou pagou.
            </p>
            <div className="space-y-2">
              {recurringTemplates.map((tpl) => {
                const currentMonth = monthFilter || getMonthKey(new Date());
                const confirmed = isRecurringConfirmedForMonth(
                  tpl,
                  currentMonth,
                  transactions ?? []
                );
                const catName = categoryMap.get(tpl.categoryId)?.name ?? tpl.categoryId;
                return (
                  <div
                    key={tpl.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div>
                      <span className="font-medium">
                        {TYPE_LABELS[tpl.type]} - {formatCurrency(tpl.value)}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {catName}
                        {tpl.description ? ` • ${tpl.description}` : ''}
                      </span>
                      {tpl.autoCreateOnDueDate && (
                        <span className="ml-2 text-xs font-medium text-primary">
                          Automática no dia
                        </span>
                      )}
                      <span className="text-muted-foreground text-sm ml-2">
                        (dia {tpl.dayOfMonth})
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingRecurringId(tpl.id)}
                        aria-label="Editar recorrência"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {confirmed ? (
                        <span className="text-sm text-green-600 flex items-center gap-1">
                          <Check className="h-4 w-4" />
                          Já confirmado este mês
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={confirmRecurringMutation.isPending}
                          onClick={() =>
                            confirmRecurringMutation.mutate({
                              template: tpl,
                              yearMonth: currentMonth,
                            })
                          }
                        >
                          {tpl.autoCreateOnDueDate ? 'Efetivar agora' : 'Confirmar recebimento'}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRecurringMutation.mutate(tpl.id)}
                        aria-label="Remover recorrência"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {(!recurringTemplates || recurringTemplates.length === 0) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recorrências</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setCreatingRecurring(true)}>
              <Repeat className="mr-2 h-4 w-4" />
              Adicionar recorrência
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ex: salário, aluguel. Todo mês o valor aparecerá aqui e você só confirma se recebeu
              ou pagou.
            </p>
          </CardContent>
        </Card>
      )}

      {chartDataByCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo por categoria (despesas filtradas)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartDataByCategory} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="categoryName" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Listagem</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Tipo</th>
                    <th className="pb-2 font-medium">Valor</th>
                    <th className="pb-2 font-medium">Categoria</th>
                    <th className="pb-2 font-medium">Data</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Pago/Recebido</th>
                    <th className="pb-2 font-medium">Parcela</th>
                    <th className="pb-2 font-medium">Observação</th>
                    <th className="w-24 pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="py-2">
                        {TYPE_LABELS[t.type]}
                      </td>
                      <td
                        className={
                          t.type === 'income'
                            ? 'text-green-600 font-medium'
                            : 'text-destructive font-medium'
                        }
                      >
                        {t.type === 'income' ? '+' : '-'}
                        {formatCurrency(t.value)}
                      </td>
                      <td className="py-2">
                        {categoryMap.get(t.categoryId)?.name ?? t.categoryId}
                      </td>
                      <td className="py-2">
                        {format(parseTransactionDate(t.date), 'dd/MM/yyyy', {
                          locale: ptBR,
                        })}
                      </td>
                      <td className="py-2">{getStatusLabel(t.status, t.type)}</td>
                      <td className="py-2">
                        {t.status !== 'cancelled' ? (
                          <Switch
                            checked={t.status === 'completed'}
                            disabled={updateMutation.isPending && updatingTransactionId === t.id}
                            onCheckedChange={(checked) =>
                              updateMutation.mutate({
                                id: t.id,
                                status: checked ? 'completed' : 'pending',
                              })
                            }
                            aria-label={
                              t.type === 'income'
                                ? (t.status === 'completed' ? 'Marcado como recebido' : 'Marcar como recebido')
                                : (t.status === 'completed' ? 'Marcado como pago' : 'Marcar como pago')
                            }
                          />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {t.installmentsTotal != null && t.installmentsTotal > 1
                          ? `${t.installmentNumber ?? '-'}/${t.installmentsTotal}`
                          : '—'}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {t.description ?? '-'}
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingId(t.id)}
                            aria-label="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingId(t.id)}
                            aria-label="Excluir"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : transactions && transactions.length > 0 ? (
            <p className="text-muted-foreground">
              {monthFilter === 'upcoming-pending-expenses'
                ? 'Nenhuma despesa pendente encontrada do mês atual em diante.'
                : 'Nenhuma transação neste mês. Use "Todos" no filtro de mês ou navegue para outro mês.'}
            </p>
          ) : (
            <p className="text-muted-foreground">
              Nenhuma transação encontrada.
            </p>
          )}
        </CardContent>
      </Card>

      {creating && (
        <TransactionFormDialog
          key="create-transaction"
          open={creating}
          onOpenChange={(open) => setCreating(open)}
          categories={categories ?? []}
          onSuccess={async (savedTransaction) => {
            upsertTransactionInQueries(queryClient, savedTransaction);
            setCreating(false);
            await invalidateTransactionRelatedQueries(queryClient);
          }}
        />
      )}

      {creatingRecurring && (
        <RecurringFormDialog
          key="create-recurring"
          open={creatingRecurring}
          onOpenChange={setCreatingRecurring}
          categories={categories ?? []}
          onSuccess={() => {
            setCreatingRecurring(false);
            queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
          }}
        />
      )}

      {editingId && transactions && (
        <TransactionFormDialog
          key={editingId}
          open={!!editingId}
          onOpenChange={(open) => !open && setEditingId(null)}
          categories={categories ?? []}
          transaction={transactions.find((t) => t.id === editingId) ?? undefined}
          onSuccess={async (savedTransaction) => {
            upsertTransactionInQueries(queryClient, savedTransaction);
            setEditingId(null);
            await invalidateTransactionRelatedQueries(queryClient);
          }}
        />
      )}

      {editingRecurringTemplate && (
        <RecurringFormDialog
          key={editingRecurringTemplate.id}
          open={!!editingRecurringId}
          onOpenChange={(open) => !open && setEditingRecurringId(null)}
          categories={categories ?? []}
          recurringTemplate={editingRecurringTemplate}
          onSuccess={() => {
            setEditingRecurringId(null);
            queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
          }}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

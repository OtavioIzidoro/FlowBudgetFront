import { z } from 'zod';
import { useCallback, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createTransaction, updateTransaction } from '@/shared/services/transactions.service';
import { getTransactions } from '@/shared/services/transactions.service';
import { createNotification } from '@/shared/services/notifications.service';
import type { Transaction } from '@/entities/transaction/types';
import type { Category } from '@/entities/category/types';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { CurrencyInput } from '@/shared/ui/currency-input';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { toServiceError } from '@/shared/lib/errors';
import { appLogger } from '@/shared/logger';
import { useToastStore } from '@/shared/store/toast-store';
import { Spinner } from '@/shared/ui/spinner';
import { Switch } from '@/shared/ui/switch';
import {
  formatCentsToCurrencyInput,
  formatCurrency,
  parseCurrencyInputToCents,
} from '@/shared/lib/format';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getQuickTransactions, saveQuickTransaction } from '@/shared/lib/quick-transactions';
import type { QuickTransaction } from '@/shared/lib/quick-transactions';

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  value: z.string().min(1, 'Informe o valor'),
  categoryId: z.string().min(1, 'Selecione a categoria'),
  date: z.string().min(1, 'Informe a data'),
  status: z.enum(['pending', 'completed', 'cancelled']),
  description: z.string().optional(),
  enableReminder: z.boolean().optional(),
  reminderDays: z.coerce.number().min(1).max(30).optional(),
  saveAsQuick: z.boolean().optional(),
  installmentsTotal: z.coerce
    .number()
    .transform((v) => (Number.isNaN(v) ? 1 : v))
    .pipe(z.number().int('Deve ser um número inteiro').min(1, 'Mínimo 1 parcela').max(100, 'Máximo 100 parcelas')),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

function getDefaultValues(transaction?: Transaction): TransactionFormData {
  if (transaction) {
    return {
      type: transaction.type,
      value: formatCentsToCurrencyInput(transaction.value, { emptyWhenZero: true }),
      categoryId: transaction.categoryId,
      date: transaction.date,
      status: transaction.status,
      description: transaction.description ?? '',
      installmentsTotal: transaction.installmentsTotal ?? 1,
    };
  }

  return {
    type: 'expense',
    value: '',
    categoryId: '',
    date: new Date().toISOString().slice(0, 10),
    status: 'completed',
    description: '',
    enableReminder: false,
    reminderDays: 3,
    saveAsQuick: false,
    installmentsTotal: 1,
  };
}

function buildReminderScheduleFor(date: string, remindBeforeDays: number): string {
  const [yearPart, monthPart, dayPart] = date.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const scheduleDate = new Date(year, month - 1, day, 9, 0, 0, 0);
  scheduleDate.setDate(scheduleDate.getDate() - remindBeforeDays);
  return scheduleDate.toISOString();
}

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  transaction?: Transaction;
  onSuccess: (transaction: Transaction) => void | Promise<void>;
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  categories,
  transaction,
  onSuccess,
}: TransactionFormDialogProps) {
  const isEdit = !!transaction;

  const mutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      const payload = {
        type: data.type as 'income' | 'expense',
        value: parseCurrencyInputToCents(data.value),
        categoryId: data.categoryId,
        date: data.date,
        status: data.status as Transaction['status'],
        description: data.description || undefined,
      };
      const t = isEdit
        ? await updateTransaction({ ...payload, id: transaction.id })
        : await createTransaction({
            ...payload,
            installmentsTotal: data.type === 'expense' ? data.installmentsTotal : undefined,
          });
      if (!isEdit && data.type === 'expense' && data.enableReminder) {
        const cat = categories.find((c) => c.id === data.categoryId);
        const days = data.reminderDays ?? 1;
        await createNotification({
          type: 'due_date',
          title: `Despesa vence em ${format(new Date(data.date), "dd/MM/yyyy", { locale: ptBR })}${days > 1 ? ` (lembrete ${days} dias antes)` : ''}`,
          message: `${cat?.name ?? 'Despesa'} - ${formatCurrency(parseCurrencyInputToCents(data.value))}${data.description ? ` - ${data.description}` : ''}`,
          scheduleFor: buildReminderScheduleFor(data.date, days),
        });
      }
      if (!isEdit && data.saveAsQuick) {
        saveQuickTransaction({
          type: data.type as 'income' | 'expense',
          value: parseCurrencyInputToCents(data.value),
          categoryId: data.categoryId,
          description: data.description ?? '',
        });
      }
      return t;
    },
    onSuccess: (savedTransaction) => {
      void onSuccess(savedTransaction);
      onOpenChange(false);
      useToastStore.getState().success(isEdit ? 'Transação atualizada.' : 'Transação criada.');
    },
    onError: (error: unknown) => {
      const err = toServiceError(error);
      appLogger.warn('Erro ao salvar transação', {
        domain: 'transaction',
        event: 'transaction.save.error',
        code: err.code,
        error: err.message,
      });
      useToastStore.getState().error(err.message);
    },
  });

  const { register, handleSubmit, control, formState: { errors }, watch, setValue, reset } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: getDefaultValues(transaction),
  });

  useEffect(() => {
    if (!open) return;
    reset(getDefaultValues(transaction));
  }, [open, reset, transaction]);

  const quickList = getQuickTransactions();
  const descWatch = watch('description');
  const { data: suggestedTransactions } = useQuery({
    queryKey: ['transactions', 'suggest', descWatch],
    queryFn: () => getTransactions({ search: descWatch || undefined }),
    enabled: !isEdit && (descWatch?.length ?? 0) >= 2,
  });
  const suggestedCategoryId = suggestedTransactions?.[0]?.categoryId;
  const suggestedCategory = suggestedCategoryId ? categories.find((c) => c.id === suggestedCategoryId) : undefined;

  const typeWatch = watch('type');
  const showInstallments = typeWatch === 'expense' && !isEdit;
  const showReminder = typeWatch === 'expense' && !isEdit;

  const applyQuick = useCallback(
    (qt: QuickTransaction) => {
      setValue('type', qt.type);
      setValue('value', formatCentsToCurrencyInput(qt.value, { emptyWhenZero: true }));
      setValue('categoryId', qt.categoryId);
      setValue('description', qt.description);
    },
    [setValue]
  );

  const onSubmit = (data: TransactionFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={true}>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar transação' : 'Nova transação'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            {!isEdit && quickList.length > 0 && (
              <div className="space-y-2">
                <Label>Rápidos</Label>
                <div className="flex flex-wrap gap-2">
                  {quickList.map((qt) => {
                    const cat = categories.find((c) => c.id === qt.categoryId);
                    return (
                      <Button
                        key={qt.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyQuick(qt)}
                      >
                        {cat?.name ?? (qt.description || formatCurrency(qt.value))}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Receita</SelectItem>
                        <SelectItem value="expense">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Controller
                  name="value"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      placeholder="R$ 0,00"
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  )}
                />
                {errors.value && (
                  <p className="text-sm text-destructive">{errors.value.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoryId && (
                <p className="text-sm text-destructive">{errors.categoryId.message}</p>
              )}
            {!isEdit && suggestedCategory && (
              <p className="text-xs text-muted-foreground">
                Sugestão:{' '}
                <button
                  type="button"
                  className="underline hover:no-underline"
                  onClick={() => setValue('categoryId', suggestedCategory.id)}
                >
                  {suggestedCategory.name}
                </button>
              </p>
            )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{typeWatch === 'expense' ? 'Data de vencimento' : 'Data'}</Label>
                <Input type="date" {...register('date')} />
                {errors.date && (
                  <p className="text-sm text-destructive">{errors.date.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            {showReminder && (
              <div className="flex items-center gap-2">
                <Controller
                  name="enableReminder"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="enableReminder"
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="enableReminder" className="font-normal cursor-pointer">
                  Criar lembrete (notificação de vencimento)
                </Label>
              </div>
            )}
            {showReminder && (
              <div className="space-y-2">
                <Label>Avisar com quantos dias de antecedência</Label>
                <Controller
                  name="reminderDays"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={String(field.value ?? 3)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 dia antes</SelectItem>
                        <SelectItem value="3">3 dias antes</SelectItem>
                        <SelectItem value="5">5 dias antes</SelectItem>
                        <SelectItem value="7">7 dias antes</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Observação</Label>
              <Input placeholder="Opcional" {...register('description')} />
            </div>
            {!isEdit && (
              <div className="flex items-center gap-2">
                <Controller
                  name="saveAsQuick"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="saveAsQuick"
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="saveAsQuick" className="font-normal cursor-pointer">
                  Salvar como transação rápida
                </Label>
              </div>
            )}
            {showInstallments && (
              <div className="space-y-2">
                <Label htmlFor="installmentsTotal">Número de parcelas</Label>
                <Input
                  id="installmentsTotal"
                  type="number"
                  min={1}
                  max={100}
                  placeholder="1 = à vista"
                  {...register('installmentsTotal', { valueAsNumber: true })}
                />
                {errors.installmentsTotal && (
                  <p className="text-sm text-destructive">{errors.installmentsTotal.message}</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { createTransaction, updateTransaction } from '@/shared/services/transactions.service';
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

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  value: z.string().min(1, 'Informe o valor'),
  categoryId: z.string().min(1, 'Selecione a categoria'),
  date: z.string().min(1, 'Informe a data'),
  status: z.enum(['pending', 'completed', 'cancelled']),
  description: z.string().optional(),
  installmentsTotal: z.coerce
    .number()
    .transform((v) => (Number.isNaN(v) ? 1 : v))
    .pipe(z.number().int('Deve ser um número inteiro').min(1, 'Mínimo 1 parcela').max(100, 'Máximo 100 parcelas')),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

function parseValueToCents(value: string): number {
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized) || 0;
  return Math.round(num * 100);
}

function formatCentsToInput(cents: number): string {
  if (cents === 0) return '';
  const reais = (cents / 100).toFixed(2).replace('.', ',');
  return reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  transaction?: Transaction;
  onSuccess: () => void;
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
        value: parseValueToCents(data.value),
        categoryId: data.categoryId,
        date: data.date,
        status: data.status as Transaction['status'],
        description: data.description || undefined,
        installmentsTotal: data.type === 'expense' ? data.installmentsTotal : undefined,
      };
      if (isEdit) {
        return updateTransaction({ ...payload, id: transaction.id });
      }
      return createTransaction(payload);
    },
    onSuccess: () => {
      onSuccess();
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

  const { register, handleSubmit, control, formState: { errors }, watch } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: transaction
      ? {
          type: transaction.type,
          value: formatCentsToInput(transaction.value),
          categoryId: transaction.categoryId,
          date: transaction.date,
          status: transaction.status,
          description: transaction.description ?? '',
          installmentsTotal: transaction.installmentsTotal ?? 1,
        }
      : {
          type: 'expense',
          value: '',
          categoryId: '',
          date: new Date().toISOString().slice(0, 10),
          status: 'completed',
          description: '',
          installmentsTotal: 1,
        },
  });

  const typeWatch = watch('type');
  const showInstallments = typeWatch === 'expense' && !isEdit;

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
                <Input
                  placeholder="0,00"
                  {...register('value')}
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
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
            <div className="space-y-2">
              <Label>Observação</Label>
              <Input placeholder="Opcional" {...register('description')} />
            </div>
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

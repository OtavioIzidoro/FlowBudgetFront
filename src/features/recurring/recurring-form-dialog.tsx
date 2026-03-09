import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { createRecurringTemplate } from '@/shared/services/recurring.service';
import type { RecurringTemplate } from '@/entities/recurring-template/types';
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

const recurringSchema = z.object({
  type: z.enum(['income', 'expense']),
  value: z.string().min(1, 'Informe o valor'),
  categoryId: z.string().min(1, 'Selecione a categoria'),
  dayOfMonth: z.coerce
    .number()
    .transform((v) => (Number.isNaN(v) ? 1 : v))
    .pipe(z.number().int().min(1, 'Dia entre 1 e 31').max(31, 'Dia entre 1 e 31')),
  description: z.string().optional(),
});

type RecurringFormData = z.infer<typeof recurringSchema>;

function parseValueToCents(value: string): number {
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized) || 0;
  return Math.round(num * 100);
}

interface RecurringFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onSuccess: () => void;
}

export function RecurringFormDialog({
  open,
  onOpenChange,
  categories,
  onSuccess,
}: RecurringFormDialogProps) {
  const mutation = useMutation({
    mutationFn: async (data: RecurringFormData) => {
      return createRecurringTemplate({
        type: data.type as RecurringTemplate['type'],
        value: parseValueToCents(data.value),
        categoryId: data.categoryId,
        dayOfMonth: data.dayOfMonth,
        description: data.description || undefined,
      });
    },
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
      useToastStore.getState().success('Recorrência criada.');
    },
    onError: (error: unknown) => {
      const err = toServiceError(error);
      appLogger.warn('Erro ao criar recorrência', {
        domain: 'recurring',
        event: 'recurring.create.error',
        code: err.code,
        error: err.message,
      });
      useToastStore.getState().error(err.message);
    },
  });

  const { register, handleSubmit, control, formState: { errors } } = useForm<RecurringFormData>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      type: 'income',
      value: '',
      categoryId: '',
      dayOfMonth: 1,
      description: '',
    },
  });

  const onSubmit = (data: RecurringFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={true}>
        <DialogHeader>
          <DialogTitle>Nova recorrência</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              Ex: salário, aluguel. Todo mês o valor aparecerá aqui; você só confirma se recebeu ou pagou.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
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
                <Input placeholder="0,00" {...register('value')} />
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
                <Label>Dia do mês (1-31)</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  placeholder="Ex: 5"
                  {...register('dayOfMonth', { valueAsNumber: true })}
                />
                {errors.dayOfMonth && (
                  <p className="text-sm text-destructive">{errors.dayOfMonth.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Observação</Label>
                <Input placeholder="Opcional" {...register('description')} />
              </div>
            </div>
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

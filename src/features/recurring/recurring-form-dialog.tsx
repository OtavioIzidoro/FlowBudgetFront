import { useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import {
  createRecurringTemplate,
  updateRecurringTemplate,
} from '@/shared/services/recurring.service';
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
import {
  formatCentsToCurrencyInput,
  parseCurrencyInputToCents,
} from '@/shared/lib/format';
import { Switch } from '@/shared/ui/switch';

const recurringSchema = z.object({
  type: z.enum(['income', 'expense']),
  value: z.string().min(1, 'Informe o valor'),
  categoryId: z.string().min(1, 'Selecione a categoria'),
  dayOfMonth: z.coerce
    .number()
    .transform((v) => (Number.isNaN(v) ? 1 : v))
    .pipe(z.number().int().min(1, 'Dia entre 1 e 31').max(31, 'Dia entre 1 e 31')),
  description: z.string().optional(),
  autoCreateOnDueDate: z.boolean().optional(),
});

type RecurringFormData = z.infer<typeof recurringSchema>;

function getDefaultValues(recurringTemplate?: RecurringTemplate): RecurringFormData {
  if (recurringTemplate) {
    return {
      type: recurringTemplate.type,
      value: formatCentsToCurrencyInput(recurringTemplate.value, { emptyWhenZero: true }),
      categoryId: recurringTemplate.categoryId,
      dayOfMonth: recurringTemplate.dayOfMonth,
      description: recurringTemplate.description ?? '',
      autoCreateOnDueDate: recurringTemplate.autoCreateOnDueDate ?? false,
    };
  }

  return {
    type: 'income',
    value: '',
    categoryId: '',
    dayOfMonth: 1,
    description: '',
    autoCreateOnDueDate: false,
  };
}

interface RecurringFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  recurringTemplate?: RecurringTemplate;
  onSuccess: () => void;
}

export function RecurringFormDialog({
  open,
  onOpenChange,
  categories,
  recurringTemplate,
  onSuccess,
}: RecurringFormDialogProps) {
  const isEdit = !!recurringTemplate;

  const mutation = useMutation({
    mutationFn: async (data: RecurringFormData) => {
      const payload = {
        type: data.type as RecurringTemplate['type'],
        value: parseCurrencyInputToCents(data.value),
        categoryId: data.categoryId,
        dayOfMonth: data.dayOfMonth,
        description: data.description || undefined,
        autoCreateOnDueDate: data.autoCreateOnDueDate ?? false,
      };

      return isEdit
        ? updateRecurringTemplate({ id: recurringTemplate.id, ...payload })
        : createRecurringTemplate(payload);
    },
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
      useToastStore.getState().success(isEdit ? 'Recorrência atualizada.' : 'Recorrência criada.');
    },
    onError: (error: unknown) => {
      const err = toServiceError(error);
      appLogger.warn('Erro ao salvar recorrência', {
        domain: 'recurring',
        event: 'recurring.save.error',
        code: err.code,
        error: err.message,
      });
      useToastStore.getState().error(err.message);
    },
  });

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<RecurringFormData>({
    resolver: zodResolver(recurringSchema),
    defaultValues: getDefaultValues(recurringTemplate),
  });

  useEffect(() => {
    if (!open) return;
    reset(getDefaultValues(recurringTemplate));
  }, [open, recurringTemplate, reset]);

  const onSubmit = (data: RecurringFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={true}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar recorrência' : 'Nova recorrência'}</DialogTitle>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dia do mês (1-31)</Label>
                <Controller
                  name="dayOfMonth"
                  control={control}
                  render={({ field }) => (
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ex: 5"
                      value={String(field.value ?? '')}
                      onChange={(event) => {
                        const digits = event.target.value.replace(/\D/g, '').slice(0, 2);
                        field.onChange(digits === '' ? '' : Number(digits));
                      }}
                    />
                  )}
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
            <div className="flex items-center gap-2">
              <Controller
                name="autoCreateOnDueDate"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="autoCreateOnDueDate"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="autoCreateOnDueDate" className="cursor-pointer font-normal">
                Efetivar automaticamente no dia agendado
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Quando ativado, a plataforma cria e marca como efetivada a transação da recorrência
              assim que o dia configurado chegar, enquanto o app estiver em uso.
            </p>
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

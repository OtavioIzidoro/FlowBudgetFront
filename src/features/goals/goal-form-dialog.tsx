import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { createGoal, updateGoal } from '@/shared/services/goals.service';
import type { Goal } from '@/entities/goal/types';
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
import { toServiceError } from '@/shared/lib/errors';
import { appLogger } from '@/shared/logger';
import { formatCentsToCurrencyInput, parseCurrencyInputToCents } from '@/shared/lib/format';
import { getGoalPlan } from '@/shared/lib/financial-intelligence';

const goalSchema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  targetAmount: z.string().min(1, 'Informe o valor alvo'),
  targetDate: z.string().min(1, 'Informe a data alvo'),
  currentAmount: z.string().optional(),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal;
  onSuccess: () => void;
}

export function GoalFormDialog({
  open,
  onOpenChange,
  goal,
  onSuccess,
}: GoalFormDialogProps) {
  const isEdit = !!goal;

  const mutation = useMutation({
    mutationFn: (data: GoalFormData) => {
      const targetAmount = parseCurrencyInputToCents(data.targetAmount);
      const currentAmount = data.currentAmount
        ? parseCurrencyInputToCents(data.currentAmount)
        : undefined;
      if (isEdit) {
        return updateGoal({
          id: goal.id,
          name: data.name,
          targetAmount,
          targetDate: data.targetDate,
          currentAmount,
        });
      }
      return createGoal({
        name: data.name,
        targetAmount,
        targetDate: data.targetDate,
        currentAmount,
      });
    },
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const err = toServiceError(error);
      appLogger.warn('Erro ao salvar meta', {
        domain: 'goal',
        event: 'goal.save.error',
        code: err.code,
        error: err.message,
      });
    },
  });

  const { register, handleSubmit, control, formState: { errors }, watch } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: goal
      ? {
          name: goal.name,
          targetAmount: formatCentsToCurrencyInput(goal.targetAmount, { emptyWhenZero: true }),
          targetDate: goal.targetDate,
          currentAmount: formatCentsToCurrencyInput(goal.currentAmount, { emptyWhenZero: true }),
        }
      : {
          name: '',
          targetAmount: '',
          targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10),
          currentAmount: '',
        },
  });

  const watchedTargetAmount = watch('targetAmount');
  const watchedCurrentAmount = watch('currentAmount');
  const watchedTargetDate = watch('targetDate');
  const targetAmountCents = parseCurrencyInputToCents(watchedTargetAmount || '');
  const currentAmountCents = parseCurrencyInputToCents(watchedCurrentAmount || '');
  const goalPlan =
    watchedTargetDate && targetAmountCents > 0
      ? getGoalPlan(targetAmountCents, currentAmountCents, watchedTargetDate)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={true}>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar meta' : 'Nova meta'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="Ex: Reserva de emergência" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Valor alvo (R$)</Label>
              <Controller
                name="targetAmount"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    placeholder="R$ 0,00"
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />
              {errors.targetAmount && (
                <p className="text-sm text-destructive">{errors.targetAmount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Data alvo</Label>
              <Input type="date" {...register('targetDate')} />
              {errors.targetDate && (
                <p className="text-sm text-destructive">{errors.targetDate.message}</p>
              )}
            </div>
            {isEdit && (
              <div className="space-y-2">
                <Label>Valor atual (R$)</Label>
                <Controller
                  name="currentAmount"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      placeholder="R$ 0,00"
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              </div>
            )}
            {goalPlan && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                {goalPlan.status === 'achieved'
                  ? 'A meta já está atingida com os valores informados.'
                  : goalPlan.status === 'overdue'
                    ? `Prazo vencido. Ainda faltam ${formatCentsToCurrencyInput(goalPlan.remainingAmount)} para concluir.`
                    : `Cálculo inteligente: para chegar na data escolhida, o aporte sugerido é de ${formatCentsToCurrencyInput(goalPlan.recommendedMonthlyContribution)} por mês, ou cerca de ${formatCentsToCurrencyInput(goalPlan.dailyContribution)} por dia.`}
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
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

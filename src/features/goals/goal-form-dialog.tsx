import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { toServiceError } from '@/shared/lib/errors';
import { appLogger } from '@/shared/logger';

const goalSchema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  targetAmount: z.string().min(1, 'Informe o valor alvo'),
  targetDate: z.string().min(1, 'Informe a data alvo'),
  currentAmount: z.string().optional(),
});

type GoalFormData = z.infer<typeof goalSchema>;

function parseValueToCents(value: string): number {
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized) || 0;
  return Math.round(num * 100);
}

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
      const targetAmount = parseValueToCents(data.targetAmount);
      const currentAmount = data.currentAmount
        ? parseValueToCents(data.currentAmount)
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

  const { register, handleSubmit, formState: { errors } } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: goal
      ? {
          name: goal.name,
          targetAmount: (goal.targetAmount / 100).toFixed(2).replace('.', ','),
          targetDate: goal.targetDate,
          currentAmount: (goal.currentAmount / 100).toFixed(2).replace('.', ','),
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
              <Input placeholder="0,00" {...register('targetAmount')} />
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
                <Input placeholder="0,00" {...register('currentAmount')} />
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

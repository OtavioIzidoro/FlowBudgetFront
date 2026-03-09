import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateGoal } from '@/shared/services/goals.service';
import type { Goal } from '@/entities/goal/types';
import { formatCurrency } from '@/shared/lib/format';
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
import { useToastStore } from '@/shared/store/toast-store';
import { appLogger } from '@/shared/logger';
import { Spinner } from '@/shared/ui/spinner';

function parseValueToCents(value: string): number {
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized) || 0;
  return Math.round(num * 100);
}

interface GoalContributeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal;
  onSuccess: () => void;
}

export function GoalContributeDialog({
  open,
  onOpenChange,
  goal,
  onSuccess,
}: GoalContributeDialogProps) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState('');

  const mutation = useMutation({
    mutationFn: async (cents: number) =>
      updateGoal({
        id: goal.id,
        currentAmount: goal.currentAmount + cents,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      onSuccess();
      onOpenChange(false);
      setValue('');
      useToastStore.getState().success('Valor adicionado à meta.');
    },
    onError: (error: unknown) => {
      const err = toServiceError(error);
      appLogger.warn('Erro ao adicionar à meta', {
        domain: 'goal',
        event: 'goal.contribute.error',
        code: err.code,
        error: err.message,
      });
      useToastStore.getState().error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseValueToCents(value);
    if (cents <= 0) return;
    mutation.mutate(cents);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={true}>
        <DialogHeader>
          <DialogTitle>Adicionar à meta: {goal.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              Atual: {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
            </p>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                placeholder="0,00"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
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
            <Button type="submit" disabled={mutation.isPending || parseValueToCents(value) <= 0}>
              {mutation.isPending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Salvando...
                </>
              ) : (
                'Adicionar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

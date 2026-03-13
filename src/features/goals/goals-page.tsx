import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGoals, deleteGoal } from '@/shared/services/goals.service';
import type { Goal } from '@/entities/goal/types';
import { GoalFormDialog } from '@/features/goals/goal-form-dialog';
import { GoalContributeDialog } from '@/features/goals/goal-contribute-dialog';
import { formatCurrency } from '@/shared/lib/format';
import { getGoalPlan } from '@/shared/lib/financial-intelligence';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
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
import { Plus, Pencil, Trash2, Target, CheckCircle, Wallet } from 'lucide-react';
import { toServiceError } from '@/shared/lib/errors';
import { appLogger } from '@/shared/logger';

const STATUS_LABELS: Record<Goal['status'], string> = {
  active: 'Em andamento',
  achieved: 'Concluída',
  overdue: 'Atrasada',
};

export function GoalsPage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [contributingId, setContributingId] = useState<string | null>(null);

  const { data: goals, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: getGoals,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setDeletingId(null);
    },
    onError: (error: unknown) => {
      const err = toServiceError(error);
      appLogger.error('Erro ao remover meta', {
        domain: 'goal',
        event: 'goal.delete.error',
        code: err.code,
        error: err.message,
      });
    },
  });

  const editingGoal = editingId ? goals?.find((g) => g.id === editingId) : undefined;
  const contributingGoal = contributingId ? goals?.find((g) => g.id === contributingId) : undefined;
  const activeGoals = goals?.filter((goal) => goal.status === 'active') ?? [];
  const totalSuggestedMonthlyContribution = activeGoals.reduce((total, goal) => {
    const plan = getGoalPlan(goal.targetAmount, goal.currentAmount, goal.targetDate);
    return plan.status === 'planned' ? total + plan.recommendedMonthlyContribution : total;
  }, 0);

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Metas</h1>
        <Button onClick={() => setCreating(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nova meta
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assistente inteligente de metas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {activeGoals.length > 0
              ? `Para manter suas metas ativas no prazo, o aporte sugerido total é de ${formatCurrency(totalSuggestedMonthlyContribution)} por mês.`
              : 'Crie metas para receber cálculos inteligentes de aporte mensal e ritmo necessário.'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listagem</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : goals && goals.length > 0 ? (
            <ul className="space-y-4">
              {goals.map((g) => {
                const pct =
                  g.targetAmount > 0
                    ? Math.min(100, (g.currentAmount / g.targetAmount) * 100)
                    : 0;
                const goalPlan = getGoalPlan(g.targetAmount, g.currentAmount, g.targetDate);
                return (
                  <li
                    key={g.id}
                    className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {g.status === 'achieved' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Target className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className="font-medium">{g.name}</span>
                        <span
                          className={`text-xs ${
                            g.status === 'overdue'
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {STATUS_LABELS[g.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatCurrency(g.currentAmount)} /{' '}
                        {formatCurrency(g.targetAmount)} · Alvo:{' '}
                        {format(new Date(g.targetDate), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                      <div className="mt-2 h-2 w-full max-w-xs rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {goalPlan.status === 'achieved'
                          ? 'Meta concluída. Agora é manter o resultado.'
                          : goalPlan.status === 'overdue'
                            ? `Meta vencida. Para recuperar, faltam ${formatCurrency(goalPlan.remainingAmount)}.`
                            : `Sugestão inteligente: aportar cerca de ${formatCurrency(goalPlan.recommendedMonthlyContribution)}/mês pelos próximos ${goalPlan.monthsRemaining} mês(es).`}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {g.status !== 'achieved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setContributingId(g.id)}
                          aria-label="Adicionar valor"
                        >
                          <Wallet className="mr-1 h-4 w-4" />
                          Adicionar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingId(g.id)}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingId(g.id)}
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground">Nenhuma meta cadastrada.</p>
          )}
        </CardContent>
      </Card>

      {creating && (
        <GoalFormDialog
          open={creating}
          onOpenChange={setCreating}
          onSuccess={() => {
            setCreating(false);
            queryClient.invalidateQueries({ queryKey: ['goals'] });
          }}
        />
      )}

      {editingGoal && (
        <GoalFormDialog
          open={!!editingId}
          onOpenChange={(open) => !open && setEditingId(null)}
          goal={editingGoal}
          onSuccess={() => {
            setEditingId(null);
            queryClient.invalidateQueries({ queryKey: ['goals'] });
          }}
        />
      )}

      {contributingGoal && (
        <GoalContributeDialog
          open={!!contributingId}
          onOpenChange={(open) => !open && setContributingId(null)}
          goal={contributingGoal}
          onSuccess={() => setContributingId(null)}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta</AlertDialogTitle>
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

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGoals, deleteGoal } from '@/shared/services/goals.service';
import type { Goal } from '@/entities/goal/types';
import { GoalFormDialog } from '@/features/goals/goal-form-dialog';
import { formatCurrency } from '@/shared/lib/format';
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
import { Plus, Pencil, Trash2, Target, CheckCircle } from 'lucide-react';
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Metas</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova meta
        </Button>
      </div>

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
                    </div>
                    <div className="flex gap-1">
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

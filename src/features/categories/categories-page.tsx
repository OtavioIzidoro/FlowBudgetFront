import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCategories,
  deleteCategory,
} from '@/shared/services/categories.service';
import { CategoryFormDialog } from '@/features/categories/category-form-dialog';
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
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toServiceError } from '@/shared/lib/errors';
import { appLogger } from '@/shared/logger';
import { getCategoryIcon } from '@/shared/lib/category-icons';

const ICON_OPTIONS = ['utensils', 'car', 'heart', 'briefcase', 'film', 'home', 'shopping-bag'];

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeletingId(null);
    },
    onError: (error: unknown) => {
      const err = toServiceError(error);
      appLogger.error('Erro ao remover categoria', {
        domain: 'category',
        event: 'category.delete.error',
        code: err.code,
        error: err.message,
      });
    },
  });

  const editingCategory = editingId
    ? categories?.find((c) => c.id === editingId)
    : undefined;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categorias</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova categoria
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listagem</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : categories && categories.length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => {
                const Icon = getCategoryIcon(c.icon);

                return (
                  <li key={c.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: c.color }}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                    <div>
                      <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.icon}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingId(c.id)}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingId(c.id)}
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
            <p className="text-muted-foreground">Nenhuma categoria cadastrada.</p>
          )}
        </CardContent>
      </Card>

      {creating && (
        <CategoryFormDialog
          open={creating}
          onOpenChange={setCreating}
          iconOptions={ICON_OPTIONS}
          onSuccess={() => {
            setCreating(false);
            queryClient.invalidateQueries({ queryKey: ['categories'] });
          }}
        />
      )}

      {editingCategory && (
        <CategoryFormDialog
          open={!!editingId}
          onOpenChange={(open) => !open && setEditingId(null)}
          category={editingCategory}
          iconOptions={ICON_OPTIONS}
          onSuccess={() => {
            setEditingId(null);
            queryClient.invalidateQueries({ queryKey: ['categories'] });
          }}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
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

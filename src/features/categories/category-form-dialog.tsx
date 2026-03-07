import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { createCategory, updateCategory } from '@/shared/services/categories.service';
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

const categorySchema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  color: z.string().min(1, 'Selecione a cor'),
  icon: z.string().min(1, 'Selecione o ícone'),
});

type CategoryFormData = z.infer<typeof categorySchema>;

const COLOR_OPTIONS = [
  '#22c55e',
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#8b5cf6',
  '#f59e0b',
  '#ec4899',
  '#6366f1',
];

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
  iconOptions: string[];
  onSuccess: () => void;
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  iconOptions,
  onSuccess,
}: CategoryFormDialogProps) {
  const isEdit = !!category;

  const mutation = useMutation({
    mutationFn: (data: CategoryFormData) =>
      isEdit
        ? updateCategory({ id: category.id, ...data })
        : createCategory(data),
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const err = toServiceError(error);
      appLogger.warn('Erro ao salvar categoria', {
        domain: 'category',
        event: 'category.save.error',
        code: err.code,
        error: err.message,
      });
    },
  });

  const { register, handleSubmit, control, formState: { errors } } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: category
      ? { name: category.name, color: category.color, icon: category.icon }
      : { name: '', color: COLOR_OPTIONS[0], icon: iconOptions[0] },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={true}>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar categoria' : 'Nova categoria'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="Ex: Alimentação" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <Controller
                name="color"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map((color) => (
                        <SelectItem key={color} value={color}>
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block h-4 w-4 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            {color}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Ícone</Label>
              <Controller
                name="icon"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((icon) => (
                        <SelectItem key={icon} value={icon}>
                          {icon}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { createNotification } from '@/shared/services/notifications.service';
import type { NotificationType } from '@/entities/notification/types';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Spinner } from '@/shared/ui/spinner';
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

const alertSchema = z.object({
  type: z.enum(['budget', 'due_date', 'goal', 'info']),
  title: z.string().min(1, 'Informe o título'),
  message: z.string().min(1, 'Informe a mensagem'),
});

type AlertFormData = z.infer<typeof alertSchema>;

const TYPE_OPTIONS: { value: NotificationType; label: string }[] = [
  { value: 'due_date', label: 'Vencimento' },
  { value: 'budget', label: 'Orçamento' },
  { value: 'goal', label: 'Meta' },
  { value: 'info', label: 'Informação' },
];

interface CreateAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateAlertDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateAlertDialogProps) {
  const mutation = useMutation({
    mutationFn: (data: AlertFormData) =>
      createNotification({
        type: data.type,
        title: data.title,
        message: data.message,
      }),
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
      useToastStore.getState().success('Alerta criado.');
    },
    onError: (error: unknown) => {
      const err = toServiceError(error);
      appLogger.warn('Erro ao criar alerta', {
        domain: 'notification',
        event: 'alert.create.error',
        code: err.code,
        error: err.message,
      });
      useToastStore.getState().error(err.message);
    },
  });

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<AlertFormData>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      type: 'info',
      title: '',
      message: '',
    },
  });

  const onSubmit = (data: AlertFormData) => {
    mutation.mutate(data);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showClose={true}>
        <DialogHeader>
          <DialogTitle>Novo alerta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
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
                      {TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input placeholder="Ex: Conta próxima do vencimento" {...register('title')} />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Ex: Conta de luz vence em 3 dias."
                {...register('message')}
              />
              {errors.message && (
                <p className="text-sm text-destructive">{errors.message.message}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Criando...
                </>
              ) : (
                'Criar alerta'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

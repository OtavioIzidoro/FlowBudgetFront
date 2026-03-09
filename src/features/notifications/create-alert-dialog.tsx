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
import { Switch } from '@/shared/ui/switch';

const alertSchema = z.object({
  type: z.enum(['budget', 'due_date', 'goal', 'info']),
  title: z.string().min(1, 'Informe o título'),
  message: z.string().min(1, 'Informe a mensagem'),
  scheduleEnabled: z.boolean().optional(),
  scheduleDate: z.string().optional(),
  scheduleTime: z.string().optional(),
  repeatCount: z.coerce.number().int().min(1).max(10),
  repeatInterval: z.enum(['30m', '1h', '6h', '1d']),
}).superRefine((data, ctx) => {
  if (!data.scheduleEnabled) {
    return;
  }

  if (!data.scheduleDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['scheduleDate'],
      message: 'Informe a data do alerta',
    });
  }

  if (!data.scheduleTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['scheduleTime'],
      message: 'Informe o horário do alerta',
    });
  }
});

type AlertFormData = z.infer<typeof alertSchema>;

const TYPE_OPTIONS: { value: NotificationType; label: string }[] = [
  { value: 'due_date', label: 'Vencimento' },
  { value: 'budget', label: 'Orçamento' },
  { value: 'goal', label: 'Meta' },
  { value: 'info', label: 'Informação' },
];

const REPEAT_INTERVAL_OPTIONS = [
  { value: '30m', label: 'A cada 30 minutos' },
  { value: '1h', label: 'A cada 1 hora' },
  { value: '6h', label: 'A cada 6 horas' },
  { value: '1d', label: 'A cada 1 dia' },
] as const;

function getRepeatIntervalMinutes(value: AlertFormData['repeatInterval']): number {
  switch (value) {
    case '30m':
      return 30;
    case '1h':
      return 60;
    case '6h':
      return 360;
    case '1d':
      return 1440;
  }
}

function buildScheduleFor(data: AlertFormData): string | undefined {
  if (!data.scheduleEnabled || !data.scheduleDate || !data.scheduleTime) {
    return undefined;
  }

  const scheduledDate = new Date(`${data.scheduleDate}T${data.scheduleTime}:00`);
  if (Number.isNaN(scheduledDate.getTime())) {
    return undefined;
  }

  return scheduledDate.toISOString();
}

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
    mutationFn: async (data: AlertFormData) => {
      const scheduleFor = buildScheduleFor(data);
      const repeatCount = data.scheduleEnabled ? Math.max(1, data.repeatCount || 1) : undefined;

      await createNotification({
        type: data.type,
        title: data.title,
        message: data.message,
        scheduleFor,
        repeatCount,
        repeatIntervalMinutes:
          data.scheduleEnabled && repeatCount && repeatCount > 1
            ? getRepeatIntervalMinutes(data.repeatInterval)
            : undefined,
      });

      return repeatCount ?? 1;
    },
    onSuccess: (repeatCount) => {
      onSuccess();
      onOpenChange(false);
      useToastStore.getState().success(
        repeatCount > 1 ? 'Alerta agendado com repetições.' : 'Alerta criado.'
      );
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

  const { register, handleSubmit, control, formState: { errors }, reset, watch } = useForm<AlertFormData>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      type: 'info',
      title: '',
      message: '',
      scheduleEnabled: false,
      scheduleDate: '',
      scheduleTime: '09:00',
      repeatCount: 1,
      repeatInterval: '1d',
    },
  });

  const scheduleEnabled = watch('scheduleEnabled');
  const repeatCount = watch('repeatCount');

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
            <div className="flex items-center gap-2">
              <Controller
                name="scheduleEnabled"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="scheduleEnabled"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="scheduleEnabled" className="cursor-pointer font-normal">
                Agendar alerta
              </Label>
            </div>
            {scheduleEnabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input type="date" {...register('scheduleDate')} />
                    {errors.scheduleDate && (
                      <p className="text-sm text-destructive">{errors.scheduleDate.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Horário</Label>
                    <Input type="time" {...register('scheduleTime')} />
                    {errors.scheduleTime && (
                      <p className="text-sm text-destructive">{errors.scheduleTime.message}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantas vezes avisar</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      {...register('repeatCount', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Intervalo entre avisos</Label>
                    <Controller
                      name="repeatInterval"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {REPEAT_INTERVAL_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {repeatCount > 1
                    ? `O backend criará ${repeatCount} ocorrências automaticamente.`
                    : 'Será criado 1 aviso no dia e horário escolhidos.'}
                </p>
              </>
            )}
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

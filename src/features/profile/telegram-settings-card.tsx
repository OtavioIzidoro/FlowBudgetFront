import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { BellRing, Send, Unplug } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { Spinner } from '@/shared/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { toServiceError } from '@/shared/lib/errors';
import { useToastStore } from '@/shared/store/toast-store';
import {
  disconnectTelegram,
  getTelegramPreferences,
  sendTelegramTestMessage,
  updateTelegramPreferences,
  type UpdateTelegramPreferencesInput,
} from '@/shared/services/telegram.service';

const telegramSchema = z.object({
  notifyNewExpense: z.boolean(),
  notifyNewIncome: z.boolean(),
  notifyLowBalance: z.boolean(),
  lowBalanceThreshold: z.string(),
  notifyDailySummary: z.boolean(),
  dailySummaryTime: z.string(),
  notifyAiInsights: z.boolean(),
});

type TelegramFormData = z.infer<typeof telegramSchema>;

function parseCurrencyToCents(value: string): number | null {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

function formatCentsToInput(value: number | null): string {
  if (value == null || value <= 0) return '';
  return (value / 100).toFixed(2).replace('.', ',');
}

export function TelegramSettingsCard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['telegram', 'preferences'],
    queryFn: getTelegramPreferences,
  });

  const { register, handleSubmit, control, reset, watch } = useForm<TelegramFormData>({
    resolver: zodResolver(telegramSchema),
    defaultValues: {
      notifyNewExpense: false,
      notifyNewIncome: false,
      notifyLowBalance: false,
      lowBalanceThreshold: '',
      notifyDailySummary: false,
      dailySummaryTime: '09:00',
      notifyAiInsights: false,
    },
  });

  useEffect(() => {
    if (!data) return;
    reset({
      notifyNewExpense: data.notifyNewExpense,
      notifyNewIncome: data.notifyNewIncome,
      notifyLowBalance: data.notifyLowBalance,
      lowBalanceThreshold: formatCentsToInput(data.lowBalanceThresholdCents),
      notifyDailySummary: data.notifyDailySummary,
      dailySummaryTime: data.dailySummaryTime ?? '09:00',
      notifyAiInsights: data.notifyAiInsights,
    });
  }, [data, reset]);

  const saveMutation = useMutation({
    mutationFn: (input: UpdateTelegramPreferencesInput) =>
      updateTelegramPreferences(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['telegram', 'preferences'] });
      useToastStore.getState().success('Preferências do Telegram salvas.');
    },
    onError: (error: unknown) => {
      useToastStore.getState().error(toServiceError(error).message);
    },
  });

  const testMutation = useMutation({
    mutationFn: () => sendTelegramTestMessage('Teste de integração do FlowBudget.'),
    onSuccess: () => {
      useToastStore.getState().success('Mensagem de teste enviada.');
    },
    onError: (error: unknown) => {
      useToastStore.getState().error(toServiceError(error).message);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectTelegram,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['telegram', 'preferences'] });
      useToastStore.getState().success('Telegram desvinculado.');
    },
    onError: (error: unknown) => {
      useToastStore.getState().error(toServiceError(error).message);
    },
  });

  const notifyLowBalance = watch('notifyLowBalance');
  const notifyDailySummary = watch('notifyDailySummary');

  const onSubmit = (formData: TelegramFormData) => {
    const payload: UpdateTelegramPreferencesInput = {
      notifyNewExpense: formData.notifyNewExpense,
      notifyNewIncome: formData.notifyNewIncome,
      notifyLowBalance: formData.notifyLowBalance,
      lowBalanceThresholdCents: formData.notifyLowBalance
        ? parseCurrencyToCents(formData.lowBalanceThreshold)
        : null,
      notifyDailySummary: formData.notifyDailySummary,
      dailySummaryTime: formData.notifyDailySummary ? formData.dailySummaryTime : null,
      notifyAiInsights: formData.notifyAiInsights,
    };
    saveMutation.mutate(payload);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Telegram</CardTitle>
        <CardDescription>Controle alertas e resumos enviados para o seu chat.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner size="sm" />
            Carregando integração...
          </div>
        ) : (
          <>
            <Alert variant={data?.connected ? 'success' : 'warning'}>
              <BellRing className="h-4 w-4" />
              <AlertTitle>
                {data?.connected ? 'Telegram conectado' : 'Telegram não conectado'}
              </AlertTitle>
              <AlertDescription>
                {data?.connected
                  ? `Chat vinculado: ${data.chatIdMasked ?? 'indisponível'}`
                  : 'Conecte seu Telegram no backend para ativar notificações e resumos.'}
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="notifyNewExpense" className="font-normal">
                  Avisar novas despesas
                </Label>
                <Controller
                  name="notifyNewExpense"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="notifyNewExpense"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!data?.connected}
                    />
                  )}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="notifyNewIncome" className="font-normal">
                  Avisar novas entradas
                </Label>
                <Controller
                  name="notifyNewIncome"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="notifyNewIncome"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!data?.connected}
                    />
                  )}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="notifyLowBalance" className="font-normal">
                  Avisar saldo baixo
                </Label>
                <Controller
                  name="notifyLowBalance"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="notifyLowBalance"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!data?.connected}
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lowBalanceThreshold">Limite de saldo baixo (R$)</Label>
                <Input
                  id="lowBalanceThreshold"
                  placeholder="Ex: 50,00"
                  disabled={!data?.connected || !notifyLowBalance}
                  {...register('lowBalanceThreshold')}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="notifyDailySummary" className="font-normal">
                  Resumo diário
                </Label>
                <Controller
                  name="notifyDailySummary"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="notifyDailySummary"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!data?.connected}
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dailySummaryTime">Horário do resumo</Label>
                <Input
                  id="dailySummaryTime"
                  type="time"
                  disabled={!data?.connected || !notifyDailySummary}
                  {...register('dailySummaryTime')}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="notifyAiInsights" className="font-normal">
                  Dicas financeiras com IA
                </Label>
                <Controller
                  name="notifyAiInsights"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="notifyAiInsights"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!data?.connected}
                    />
                  )}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={!data?.connected || saveMutation.isPending}
                >
                  {saveMutation.isPending ? 'Salvando...' : 'Salvar preferências'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!data?.connected || testMutation.isPending}
                  onClick={() => testMutation.mutate()}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Testar mensagem
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!data?.connected || disconnectMutation.isPending}
                  onClick={() => disconnectMutation.mutate()}
                >
                  <Unplug className="mr-2 h-4 w-4" />
                  Desconectar
                </Button>
              </div>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}

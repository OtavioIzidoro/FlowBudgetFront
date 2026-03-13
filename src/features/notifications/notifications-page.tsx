import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/shared/services/notifications.service';
import { useNotificationStore } from '@/shared/store/notification-store';
import { useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { BellOff, CheckCheck, Plus } from 'lucide-react';
import { CreateAlertDialog } from '@/features/notifications/create-alert-dialog';
import { toServiceError } from '@/shared/lib/errors';
import { useToastStore } from '@/shared/store/toast-store';
import { appLogger } from '@/shared/logger';

const TYPE_LABELS: Record<string, string> = {
  due_date: 'Vencimento',
  budget: 'Orçamento',
  goal: 'Meta',
  info: 'Informação',
};

function formatTimestamp(value: string): string {
  return format(new Date(value), 'dd/MM/yyyy HH:mm', {
    locale: ptBR,
  });
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const { setNotifications } = useNotificationStore();
  const [creating, setCreating] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  });

  const unreadNotifications = notifications?.filter((notification) => !notification.read) ?? [];

  const markOneAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      useToastStore.getState().success('Notificação marcada como lida.');
    },
    onError: (error: unknown) => {
      const err = toServiceError(error);
      appLogger.warn('Erro ao marcar notificação como lida', {
        domain: 'notification',
        event: 'notification.read.error',
        code: err.code,
        error: err.message,
      });
      useToastStore.getState().error(err.message);
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      useToastStore.getState().success('Todas as notificações foram marcadas como lidas.');
    },
    onError: (error: unknown) => {
      const err = toServiceError(error);
      appLogger.warn('Erro ao marcar todas as notificações como lidas', {
        domain: 'notification',
        event: 'notification.read_all.error',
        code: err.code,
        error: err.message,
      });
      useToastStore.getState().error(err.message);
    },
  });

  useEffect(() => {
    if (notifications) {
      setNotifications(notifications);
    }
  }, [notifications, setNotifications]);

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Notificações</h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setCreating(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Novo alerta
          </Button>
          <Button
            variant="outline"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending || unreadNotifications.length === 0}
            className="w-full sm:w-auto"
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            {markAllAsReadMutation.isPending ? 'Marcando...' : 'Marcar todas como lidas'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Centro de notificações</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications && notifications.length > 0 ? (
            <ul className="space-y-3">
              {notifications.map((n) => (
                <li key={n.id}>
                  <Alert
                    variant={n.read ? 'default' : 'warning'}
                    className={n.read ? 'opacity-75' : ''}
                  >
                    <AlertTitle className="flex items-center justify-between">
                      <span>
                        {TYPE_LABELS[n.type] ?? n.type} · {n.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="text-right text-xs font-normal text-muted-foreground">
                          <div>Criada: {formatTimestamp(n.createdAt)}</div>
                          {n.scheduleFor && (
                            <div>Agendada: {formatTimestamp(n.scheduleFor)}</div>
                          )}
                          {n.sentAt && (
                            <div>Enviada: {formatTimestamp(n.sentAt)}</div>
                          )}
                        </div>
                        {!n.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markOneAsReadMutation.mutate(n.id)}
                            disabled={
                              markOneAsReadMutation.isPending &&
                              markOneAsReadMutation.variables === n.id
                            }
                          >
                            <BellOff className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </AlertTitle>
                    <AlertDescription>{n.message}</AlertDescription>
                  </Alert>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">
              Nenhuma notificação.
            </p>
          )}
        </CardContent>
      </Card>

      {creating && (
        <CreateAlertDialog
          open={creating}
          onOpenChange={setCreating}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }}
        />
      )}
    </div>
  );
}

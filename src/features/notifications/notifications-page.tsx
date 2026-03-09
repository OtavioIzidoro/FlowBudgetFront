import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getNotifications } from '@/shared/services/notifications.service';
import { useNotificationStore } from '@/shared/store/notification-store';
import { useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { BellOff, CheckCheck, Plus } from 'lucide-react';
import { CreateAlertDialog } from '@/features/notifications/create-alert-dialog';

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
  const { markAsRead, markAllAsRead, setNotifications } = useNotificationStore();
  const [creating, setCreating] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  });

  useEffect(() => {
    if (notifications) {
      setNotifications(notifications);
    }
  }, [notifications, setNotifications]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notificações</h1>
        <div className="flex gap-2">
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo alerta
          </Button>
          <Button variant="outline" onClick={() => markAllAsRead()}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Marcar todas como lidas
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
                            onClick={() => markAsRead(n.id)}
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

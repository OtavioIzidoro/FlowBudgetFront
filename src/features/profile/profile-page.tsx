import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/shared/store/auth-store';
import { Link } from '@tanstack/react-router';
import { useUserPreferencesStore } from '@/shared/store/user-preferences-store';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { useEffect } from 'react';
import { useTheme } from '@/shared/hooks/use-theme';
import { Download, KeyRound, RefreshCw } from 'lucide-react';
import type { UserPreferences } from '@/entities/user/types';
import { TelegramSettingsCard } from '@/features/profile/telegram-settings-card';
import { PasskeySettingsCard } from '@/features/profile/passkey-settings-card';
import { updateCurrentUser } from '@/shared/services/users.service';
import { useToastStore } from '@/shared/store/toast-store';
import { toServiceError } from '@/shared/lib/errors';
import { useAppUpdates } from '@/shared/hooks/use-app-updates';

const profileSchema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  email: z.string().min(1, 'Informe o e-mail').email('E-mail inválido'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const { theme, setTheme, notificationsEnabled, setNotificationsEnabled } =
    useUserPreferencesStore();
  const { setTheme: applyTheme } = useTheme();
  const {
    canCheckForUpdates,
    checkForUpdates,
    isCheckingForUpdates,
    isUpdateReady,
  } = useAppUpdates();

  const mutation = useMutation({
    mutationFn: (data: ProfileFormData) =>
      updateCurrentUser({
        name: data.name,
      }),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      useToastStore.getState().success('Perfil atualizado.');
    },
    onError: (error: unknown) => {
      useToastStore.getState().error(toServiceError(error).message);
    },
  });

  const { register, handleSubmit, reset } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  });

  useEffect(() => {
    if (user) {
      reset({ name: user.name, email: user.email });
    }
  }, [user, reset]);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Perfil</h1>

      <Card>
        <CardHeader>
          <CardTitle>Dados do usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((data) => mutation.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" {...register('name')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" disabled {...register('email')} />
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
          <CardDescription>Altere sua senha de acesso.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link to={'/change-password' as '/'}>
              <KeyRound className="mr-2 h-4 w-4" />
              Trocar senha
            </Link>
          </Button>
        </CardContent>
      </Card>

      <PasskeySettingsCard />

      <Card>
        <CardHeader>
          <CardTitle>Preferências</CardTitle>
          <CardDescription>Tema e notificações.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Tema</Label>
            <Select
              value={theme}
              onValueChange={(v) => {
                const value = v as UserPreferences['theme'];
                setTheme(value);
                applyTheme(value);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="dark">Escuro</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="notifications"
              checked={notificationsEnabled}
              onCheckedChange={(checked) => setNotificationsEnabled(checked)}
            />
            <Label htmlFor="notifications" className="font-normal">
              Habilitar notificações
            </Label>
          </div>
          {canCheckForUpdates && (
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Atualizações do aplicativo</p>
                <p className="text-sm text-muted-foreground">
                  Verifique manualmente se existe uma nova versão e instale quando ela estiver
                  pronta.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void checkForUpdates()}
                disabled={isCheckingForUpdates}
                className="shrink-0"
              >
                {isCheckingForUpdates ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : isUpdateReady ? (
                  <Download className="mr-2 h-4 w-4" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {isCheckingForUpdates
                  ? 'Procurando...'
                  : isUpdateReady
                    ? 'Instalar atualização'
                    : 'Verificar atualização'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <TelegramSettingsCard />
    </div>
  );
}

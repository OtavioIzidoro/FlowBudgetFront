import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { changePassword } from '@/shared/services/auth.service';
import { useAuthStore } from '@/shared/store/auth-store';
import { useToastStore } from '@/shared/store/toast-store';
import { appLogger } from '@/shared/logger';
import { toServiceError } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { Spinner } from '@/shared/ui/spinner';
import { KeyRound } from 'lucide-react';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: z
      .string()
      .min(6, 'A nova senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const updateUser = useAuthStore((s) => s.updateUser);
  const user = useAuthStore((s) => s.user);
  const isRequired = user?.passwordChangeRequired ?? false;

  const mutation = useMutation({
    mutationFn: (data: ChangePasswordFormData) =>
      changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      useToastStore.getState().success('Senha alterada com sucesso.');
      navigate({ to: '/dashboard' as '/' });
    },
    onError: (error: unknown) => {
      const err = toServiceError(error);
      appLogger.warn('Erro ao alterar senha', {
        domain: 'auth',
        event: 'auth.change_password.error',
        code: err.code,
        error: err.message,
      });
      useToastStore.getState().error(err.message);
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Trocar senha
          </CardTitle>
          <CardDescription>
            {isRequired
              ? 'Para sua segurança, é obrigatório alterar a senha no primeiro acesso.'
              : 'Informe a senha atual e defina uma nova senha.'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha atual</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('currentPassword')}
              />
              {errors.currentPassword && (
                <p className="text-sm text-destructive">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                {...register('newPassword')}
              />
              {errors.newPassword && (
                <p className="text-sm text-destructive">
                  {errors.newPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Alterando...
                </>
              ) : (
                'Alterar senha'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

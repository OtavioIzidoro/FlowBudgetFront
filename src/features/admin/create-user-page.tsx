import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { registerUser } from '@/shared/services/auth.service';
import { useAuthStore } from '@/shared/store/auth-store';
import { isSuperAdmin } from '@/shared/lib/auth';
import { useToastStore } from '@/shared/store/toast-store';
import { appLogger } from '@/shared/logger';
import { toServiceError } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Spinner } from '@/shared/ui/spinner';
import { UserPlus } from 'lucide-react';

const createUserSchema = z.object({
  name: z.string().min(1, 'Informe o nome'),
  email: z.string().min(1, 'Informe o e-mail').email('E-mail inválido'),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

export function CreateUserPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user && !isSuperAdmin(user)) {
      navigate({ to: '/dashboard' as '/' });
    }
  }, [user, navigate]);

  const mutation = useMutation({
    mutationFn: (data: CreateUserFormData) =>
      registerUser({ name: data.name, email: data.email }),
    onSuccess: () => {
      useToastStore.getState().success(
        'Usuário criado. A senha foi enviada por e-mail.'
      );
      reset({ name: '', email: '' });
    },
    onError: (error: unknown) => {
      const err = toServiceError(error);
      appLogger.warn('Erro ao criar usuário', {
        domain: 'auth',
        event: 'user.create.error',
        code: err.code,
        error: err.message,
      });
      useToastStore.getState().error(err.message);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: '', email: '' },
  });

  if (user && !isSuperAdmin(user)) {
    return null;
  }

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <h1 className="text-xl font-bold sm:text-2xl">Criar usuário</h1>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Novo usuário
          </CardTitle>
          <CardDescription>
            Informe nome e e-mail. O sistema gerará uma senha aleatória e
            enviará por e-mail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((data) => mutation.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="João Silva"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="joao@email.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Criando...
                </>
              ) : (
                'Criar usuário'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

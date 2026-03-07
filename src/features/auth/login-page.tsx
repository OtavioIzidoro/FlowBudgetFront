import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { login, loginWithBiometric } from '@/shared/services/auth.service';
import { useAuthStore } from '@/shared/store/auth-store';
import { appLogger } from '@/shared/logger';
import { toServiceError, normalizeZodError } from '@/shared/lib/errors';
import { APP_TITLE, COMPANY_NAME } from '@/shared/config/constants';
import { useToastStore } from '@/shared/store/toast-store';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Spinner } from '@/shared/ui/spinner';
import { Fingerprint } from 'lucide-react';
import {
  isBiometricSupported,
  hasBiometricCredential,
} from '@/shared/services/biometric-auth.service';

const loginSchema = z.object({
  email: z.string().min(1, 'Informe o e-mail').email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
  remember: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

const REMEMBERED_EMAIL_KEY = 'flowbudget-remembered-email';

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [formError, setFormError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [initialEmail] = useState(() => {
    try {
      return typeof window !== 'undefined'
        ? localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? ''
        : '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    if (isAuthenticated) {
      const next = user?.passwordChangeRequired ? '/change-password' : '/dashboard';
      navigate({ to: next as '/' });
    }
  }, [isAuthenticated, user?.passwordChangeRequired, navigate]);

  useEffect(() => {
    setBiometricAvailable(isBiometricSupported());
  }, []);

  const mutation = useMutation({
    mutationFn: (data: LoginFormData) =>
      login({
        email: data.email,
        password: data.password,
        remember: data.remember,
      }),
    onSuccess: (data, variables) => {
      setAuth(data.user, data.token);
      useToastStore.getState().success('Login realizado com sucesso.');
      try {
        if (variables.remember && variables.email) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, variables.email);
        } else {
          localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }
      } catch {
        //
      }
      const next = data.user.passwordChangeRequired ? '/change-password' : '/dashboard';
      navigate({ to: next as '/' });
    },
    onError: (error: unknown) => {
      const err = toServiceError(error);
      appLogger.warn('Erro no login', {
        domain: 'auth',
        event: 'login.error',
        code: err.code,
        error: err.message,
      });
      setFormError(err.message);
      useToastStore.getState().error(err.message);
    },
  });

  const biometricMutation = useMutation({
    mutationFn: loginWithBiometric,
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      useToastStore.getState().success('Login por biometria realizado com sucesso.');
      const next = data.user.passwordChangeRequired ? '/change-password' : '/dashboard';
      navigate({ to: next as '/' });
    },
    onError: (error: unknown) => {
      const err = toServiceError(error);
      if (err.code !== 'CANCELLED') {
        appLogger.warn('Erro no login por biometria', {
          domain: 'auth',
          event: 'biometric.login.error',
          code: err.code,
          error: err.message,
        });
        const isWebAuthnError =
          err.message.includes('timed out') ||
          err.message.includes('not allowed') ||
          err.message.includes('webauthn') ||
          err.message.includes('privacy-considerations');
        const friendlyMessage = isWebAuthnError
          ? 'A autenticação biométrica falhou (timeout ou restrição). Use e-mail e senha para entrar.'
          : err.message;
        setFormError(friendlyMessage);
        useToastStore.getState().error(friendlyMessage);
      }
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: initialEmail,
      password: '',
      remember: !!initialEmail,
    },
  });

  const onSubmit = (data: LoginFormData) => {
    setFormError(null);
    const result = loginSchema.safeParse(data);
    if (!result.success) {
      const normalized = normalizeZodError(result.error);
      for (const [field, message] of Object.entries(normalized)) {
        setError(field as keyof LoginFormData, { message });
      }
      appLogger.debug('Validação de login falhou', {
        domain: 'auth',
        event: 'login.validation_failed',
        errors: normalized,
      });
      return;
    }
    mutation.mutate(data);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div
        className="absolute inset-0 animate-gradient-shift"
        style={{
          background: 'linear-gradient(135deg, hsl(221.2 83.2% 53.3% / 0.08) 0%, hsl(262 83% 58% / 0.06) 25%, hsl(221.2 83.2% 53.3% / 0.05) 50%, hsl(200 83% 50% / 0.08) 75%, hsl(221.2 83.2% 53.3% / 0.06) 100%)',
          backgroundSize: '400% 400%',
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,black_70%,transparent_100%)] opacity-30" />
      <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl animate-float-slow" />
      <Card className="relative w-full max-w-md border-0 bg-card/80 shadow-xl backdrop-blur-xl animate-card-enter transition-all duration-300 hover:shadow-2xl hover:bg-card/90">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="relative">
              <img
                src="/assets/logo.png"
                alt="FlowBudget"
                className="h-16 w-16 object-contain drop-shadow-lg transition-transform duration-300 hover:scale-110"
              />
              <div className="absolute -inset-2 -z-10 rounded-full bg-primary/20 blur-xl animate-glow-pulse" />
            </div>
          </div>
          <CardTitle className="text-2xl font-heading tracking-tight">{APP_TITLE}</CardTitle>
          <CardDescription className="text-muted-foreground">
            Controle financeiro inteligente por {COMPANY_NAME}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertTitle>Erro ao entrar</AlertTitle>
                <AlertDescription>
                  {formError}
                  {formError.includes('e-mail e senha') && (
                    <span className="mt-2 block text-sm">
                      Preencha os campos abaixo e clique em Entrar.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Controller
                name="remember"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="remember"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="remember" className="font-normal">
                Lembrar sessão
              </Label>
            </div>
            <button
              type="button"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Recuperar senha
            </button>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button
              type="submit"
              className="w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
            {biometricAvailable && (
              <Button
                type="button"
                variant="outline"
                className="w-full transition-all duration-200 hover:scale-[1.02] hover:border-primary/50 active:scale-[0.98]"
                disabled={biometricMutation.isPending}
                onClick={() => biometricMutation.mutate()}
              >
                {biometricMutation.isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Autenticando...
                  </>
                ) : (
                  <>
                    <Fingerprint className="mr-2 h-4 w-4" />
                    {hasBiometricCredential()
                      ? 'Entrar com biometria'
                      : 'Registrar e entrar com biometria'}
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

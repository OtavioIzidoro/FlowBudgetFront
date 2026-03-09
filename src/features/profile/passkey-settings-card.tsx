import { useMutation } from '@tanstack/react-query';
import { Fingerprint } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Spinner } from '@/shared/ui/spinner';
import { useToastStore } from '@/shared/store/toast-store';
import { toServiceError } from '@/shared/lib/errors';
import { useAuthStore } from '@/shared/store/auth-store';
import {
  getDefaultPasskeyDeviceName,
  isPasskeySupported,
  registerPasskey,
  rememberPasskeyForEmail,
} from '@/shared/services/passkeys.service';

export function PasskeySettingsCard() {
  const user = useAuthStore((s) => s.user);
  const deviceName = getDefaultPasskeyDeviceName();
  const supported = isPasskeySupported();

  const mutation = useMutation({
    mutationFn: () => registerPasskey(deviceName),
    onSuccess: () => {
      if (user?.email) {
        rememberPasskeyForEmail(user.email);
      }
      useToastStore.getState().success('Passkey cadastrada com sucesso.');
    },
    onError: (error: unknown) => {
      const err = toServiceError(error);
      if (err.code !== 'CANCELLED') {
        useToastStore.getState().error(err.message);
      }
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Passkeys</CardTitle>
        <CardDescription>
          Ative este dispositivo para entrar com biometria, Face ID ou PIN.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!supported ? (
          <Alert variant="warning">
            <Fingerprint className="h-4 w-4" />
            <AlertTitle>Passkeys não suportadas</AlertTitle>
            <AlertDescription>
              Este dispositivo ou navegador não oferece suporte a passkeys.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert>
              <Fingerprint className="h-4 w-4" />
              <AlertTitle>Dispositivo pronto para cadastro</AlertTitle>
              <AlertDescription>{deviceName}</AlertDescription>
            </Alert>
            <Button
              type="button"
              variant="outline"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Cadastrando...
                </>
              ) : (
                <>
                  <Fingerprint className="mr-2 h-4 w-4" />
                  Ativar neste dispositivo
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

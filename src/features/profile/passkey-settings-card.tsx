import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Fingerprint } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Spinner } from '@/shared/ui/spinner';
import { useToastStore } from '@/shared/store/toast-store';
import { toServiceError } from '@/shared/lib/errors';
import { isPasskeySupported, registerPasskey } from '@/shared/services/passkeys.service';

function getDefaultDeviceName(): string {
  if (typeof window === 'undefined') return 'Este dispositivo';
  const nav = window.navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const platform = nav.userAgentData?.platform ?? window.navigator.platform ?? '';
  return platform ? `Passkey ${platform}` : 'Este dispositivo';
}

export function PasskeySettingsCard() {
  const [deviceName, setDeviceName] = useState(getDefaultDeviceName());
  const supported = isPasskeySupported();

  const mutation = useMutation({
    mutationFn: () => registerPasskey(deviceName.trim() || 'Este dispositivo'),
    onSuccess: () => {
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
          Cadastre este dispositivo para entrar sem senha com biometria ou PIN.
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
            <div className="space-y-2">
              <Label htmlFor="passkey-device-name">Nome do dispositivo</Label>
              <Input
                id="passkey-device-name"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="Ex: MacBook Air"
              />
            </div>
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
                  Cadastrar passkey
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

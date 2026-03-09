const brlCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

interface CurrencyInputOptions {
  emptyWhenZero?: boolean;
}

function getCurrencyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatCurrency(valueInCents: number): string {
  return brlCurrencyFormatter.format(valueInCents / 100);
}

export function parseCurrencyInputToCents(value: string): number {
  const digits = getCurrencyDigits(value);
  return digits ? Number(digits) : 0;
}

export function formatCentsToCurrencyInput(
  valueInCents: number | null | undefined,
  options?: CurrencyInputOptions
): string {
  const cents = Math.max(0, Math.trunc(valueInCents ?? 0));
  if (options?.emptyWhenZero && cents === 0) {
    return '';
  }
  return formatCurrency(cents);
}

export function formatCurrencyInput(value: string, options?: CurrencyInputOptions): string {
  return formatCentsToCurrencyInput(parseCurrencyInputToCents(value), options);
}

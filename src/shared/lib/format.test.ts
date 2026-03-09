import { describe, it, expect } from 'vitest';
import {
  formatCentsToCurrencyInput,
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInputToCents,
} from '@/shared/lib/format';

describe('formatCurrency', () => {
  it('formata valor em centavos para BRL', () => {
    expect(formatCurrency(100000)).toMatch(/R\$\s*1\.000,00/);
    expect(formatCurrency(0)).toMatch(/R\$\s*0,00/);
    expect(formatCurrency(12550)).toMatch(/R\$\s*125,50/);
  });
});

describe('currency input helpers', () => {
  it('converte texto mascarado para centavos', () => {
    expect(parseCurrencyInputToCents('R$ 1.234,56')).toBe(123456);
    expect(parseCurrencyInputToCents('abc')).toBe(0);
  });

  it('aplica mascara monetaria com real', () => {
    expect(formatCurrencyInput('123456', { emptyWhenZero: true })).toMatch(/R\$\s*1\.234,56/);
    expect(formatCurrencyInput('', { emptyWhenZero: true })).toBe('');
  });

  it('formata centavos para uso em input', () => {
    expect(formatCentsToCurrencyInput(987, { emptyWhenZero: true })).toMatch(/R\$\s*9,87/);
    expect(formatCentsToCurrencyInput(0, { emptyWhenZero: true })).toBe('');
  });
});

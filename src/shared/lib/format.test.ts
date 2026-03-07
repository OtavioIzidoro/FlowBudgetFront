import { describe, it, expect } from 'vitest';
import { formatCurrency } from '@/shared/lib/format';

describe('formatCurrency', () => {
  it('formata valor em centavos para BRL', () => {
    expect(formatCurrency(100000)).toMatch(/R\$\s*1\.000,00/);
    expect(formatCurrency(0)).toMatch(/R\$\s*0,00/);
    expect(formatCurrency(12550)).toMatch(/R\$\s*125,50/);
  });
});

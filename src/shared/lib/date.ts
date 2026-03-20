/**
 * Converte data no formato YYYY-MM-DD (ou início de ISO) para Date em fuso local.
 * Evita o parse UTC de `new Date('2026-03-01')`, que no Brasil vira 28/fev e desloca mês/dia.
 */
export function parseLocalDateYmd(isoDate: string): Date {
  const dayPart = isoDate.split('T')[0] ?? '';
  const parts = dayPart.split('-').map((p) => Number.parseInt(p, 10));
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) {
    return new Date(NaN);
  }
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  return new Date(y, m - 1, d);
}

/** Primeiro dia do mês a partir da chave yyyy-MM (sempre local). */
export function startOfMonthFromYearMonthKey(monthKey: string): Date {
  const seg = monthKey.split('-');
  const y = Number.parseInt(seg[0] ?? '', 10);
  const m = Number.parseInt(seg[1] ?? '', 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return new Date(NaN);
  }
  return new Date(y, m - 1, 1);
}

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

/**
 * Chave yyyy-MM para agrupar contas pelo mês de vencimento.
 * Aceita ISO (data ou datetime), yyyy-MM-dd e dd/MM/yyyy.
 */
export function getYearMonthKeyFromTransactionDate(raw: string | undefined | null): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;

  const isoHead = s.match(/^(\d{4})-(\d{2})/);
  if (isoHead?.[1] && isoHead[2]) {
    return `${isoHead[1]}-${isoHead[2]}`;
  }

  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br?.[2] && br[3]) {
    const mm = br[2].padStart(2, '0');
    return `${br[3]}-${mm}`;
  }

  const d = parseLocalDateYmd(s);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  return null;
}

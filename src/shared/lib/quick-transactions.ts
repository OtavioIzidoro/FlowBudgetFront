const STORAGE_KEY = 'flowbudget-quick-transactions';

export interface QuickTransaction {
  id: string;
  description: string;
  value: number;
  categoryId: string;
  type: 'income' | 'expense';
}

export function getQuickTransactions(): QuickTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QuickTransaction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveQuickTransaction(item: Omit<QuickTransaction, 'id'>): void {
  const list = getQuickTransactions();
  const newItem: QuickTransaction = {
    ...item,
    id: `qt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  };
  list.unshift(newItem);
  const trimmed = list.slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function removeQuickTransaction(id: string): void {
  const list = getQuickTransactions().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export type TransactionType = 'income' | 'expense';

export type TransactionStatus = 'pending' | 'completed' | 'cancelled';

export type InstallmentsScope = 'one' | 'all';

export interface Transaction {
  id: string;
  type: TransactionType;
  value: number;
  categoryId: string;
  date: string;
  status: TransactionStatus;
  description?: string;
  installmentGroupId?: string | null;
  installmentNumber?: number | null;
  installmentsTotal?: number | null;
}

export interface DeleteTransactionResponse {
  success: true;
  deletedCount: number;
  installmentGroupId?: string | null;
}

export function isInstallmentTransaction(
  tx: Pick<Transaction, 'installmentGroupId' | 'installmentsTotal'>
): boolean {
  return tx.installmentGroupId != null && (tx.installmentsTotal ?? 0) > 1;
}

export type TransactionType = 'income' | 'expense';

export type TransactionStatus = 'pending' | 'completed' | 'cancelled';

export interface Transaction {
  id: string;
  type: TransactionType;
  value: number;
  categoryId: string;
  date: string;
  status: TransactionStatus;
  description?: string;
  installmentGroupId?: string;
  installmentNumber?: number;
  installmentsTotal?: number;
}

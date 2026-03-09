export interface RecurringTemplate {
  id: string;
  userId?: string;
  type: 'income' | 'expense';
  value: number;
  categoryId: string;
  description?: string;
  dayOfMonth: number;
  autoCreateOnDueDate?: boolean;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

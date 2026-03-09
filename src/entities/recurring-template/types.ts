export interface RecurringTemplate {
  id: string;
  type: 'income' | 'expense';
  value: number;
  categoryId: string;
  description?: string;
  dayOfMonth: number;
}

import type { RecurringTemplate } from '@/entities/recurring-template/types';
import { apiRequest } from '@/shared/services/api-client';
import { createTransaction } from '@/shared/services/transactions.service';
import type { Transaction } from '@/entities/transaction/types';

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getRecurringExecutionDay(
  year: number,
  month: number,
  dayOfMonth: number
): number {
  return Math.min(dayOfMonth, getLastDayOfMonth(year, month));
}

export async function getRecurringTemplates(): Promise<RecurringTemplate[]> {
  const res = await apiRequest<RecurringTemplate[] | { data: RecurringTemplate[] }>(
    '/recurring-templates'
  );
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object' && 'data' in res && Array.isArray((res as { data: RecurringTemplate[] }).data)) {
    return (res as { data: RecurringTemplate[] }).data;
  }
  return [];
}

export interface CreateRecurringTemplateInput {
  type: RecurringTemplate['type'];
  value: number;
  categoryId: string;
  description?: string;
  dayOfMonth: number;
  autoCreateOnDueDate?: boolean;
  active?: boolean;
}

export async function createRecurringTemplate(
  input: CreateRecurringTemplateInput
): Promise<RecurringTemplate> {
  const data = await apiRequest<RecurringTemplate>('/recurring-templates', {
    method: 'POST',
    body: input,
  });
  return data;
}

export interface UpdateRecurringTemplateInput extends Partial<CreateRecurringTemplateInput> {
  id: string;
}

export async function updateRecurringTemplate(
  input: UpdateRecurringTemplateInput
): Promise<RecurringTemplate> {
  const { id, ...body } = input;
  const data = await apiRequest<RecurringTemplate>(`/recurring-templates/${id}`, {
    method: 'PATCH',
    body,
  });
  return data;
}

export async function deleteRecurringTemplate(id: string): Promise<void> {
  await apiRequest<{ success?: boolean }>(`/recurring-templates/${id}`, {
    method: 'DELETE',
  });
}

export async function confirmRecurringForMonth(
  template: RecurringTemplate,
  yearMonth: string,
  options?: { status?: Transaction['status'] }
): Promise<Transaction> {
  const [yearPart, monthPart] = yearMonth.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = getRecurringExecutionDay(year, month, template.dayOfMonth);
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return createTransaction({
    type: template.type,
    value: template.value,
    categoryId: template.categoryId,
    date: dateStr,
    status: options?.status ?? 'pending',
    description: template.description,
  });
}

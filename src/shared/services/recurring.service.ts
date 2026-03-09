import type { RecurringTemplate } from '@/entities/recurring-template/types';
import { apiRequest } from '@/shared/services/api-client';
import { createTransaction } from '@/shared/services/transactions.service';

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

export async function deleteRecurringTemplate(id: string): Promise<void> {
  await apiRequest<{ success?: boolean }>(`/recurring-templates/${id}`, {
    method: 'DELETE',
  });
}

export async function confirmRecurringForMonth(
  template: RecurringTemplate,
  yearMonth: string
): Promise<void> {
  const [year, month] = yearMonth.split('-').map(Number);
  const day = Math.min(template.dayOfMonth, 28);
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  await createTransaction({
    type: template.type,
    value: template.value,
    categoryId: template.categoryId,
    date: dateStr,
    status: 'pending',
    description: template.description,
  });
}

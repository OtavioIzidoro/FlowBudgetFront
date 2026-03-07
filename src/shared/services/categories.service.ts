import type { Category } from '@/entities/category/types';
import { apiRequest } from '@/shared/services/api-client';

export async function getCategories(): Promise<Category[]> {
  const res = await apiRequest<Category[]>('/categories');
  return Array.isArray(res) ? res : [];
}

export async function getCategoryById(id: string): Promise<Category | null> {
  try {
    const categories = await getCategories();
    return categories.find((c) => c.id === id) ?? null;
  } catch {
    return null;
  }
}

export interface CreateCategoryInput {
  name: string;
  color: string;
  icon: string;
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const data = await apiRequest<Category>('/categories', {
    method: 'POST',
    body: input,
  });
  return data;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
  id: string;
}

export async function updateCategory(input: UpdateCategoryInput): Promise<Category> {
  const { id, ...body } = input;
  const data = await apiRequest<Category>(`/categories/${id}`, {
    method: 'PATCH',
    body,
  });
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiRequest<{ success?: boolean }>(`/categories/${id}`, {
    method: 'DELETE',
  });
}

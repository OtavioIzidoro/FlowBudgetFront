import type { Goal } from '@/entities/goal/types';
import { apiRequest } from '@/shared/services/api-client';

export async function getGoals(): Promise<Goal[]> {
  const res = await apiRequest<Goal[]>('/goals');
  return Array.isArray(res) ? res : [];
}

export async function getGoalById(id: string): Promise<Goal | null> {
  try {
    const goals = await getGoals();
    return goals.find((g) => g.id === id) ?? null;
  } catch {
    return null;
  }
}

export interface CreateGoalInput {
  name: string;
  targetAmount: number;
  targetDate: string;
  currentAmount?: number;
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const data = await apiRequest<Goal>('/goals', {
    method: 'POST',
    body: {
      name: input.name,
      targetAmount: input.targetAmount,
      currentAmount: input.currentAmount ?? 0,
      targetDate: input.targetDate,
    },
  });
  return data;
}

export interface UpdateGoalInput extends Partial<CreateGoalInput> {
  id: string;
}

export async function updateGoal(input: UpdateGoalInput): Promise<Goal> {
  const { id, ...body } = input;
  const data = await apiRequest<Goal>(`/goals/${id}`, {
    method: 'PATCH',
    body,
  });
  return data;
}

export async function deleteGoal(id: string): Promise<void> {
  await apiRequest<{ success?: boolean }>(`/goals/${id}`, {
    method: 'DELETE',
  });
}

import type { User } from '@/entities/user/types';
import { apiRequest } from '@/shared/services/api-client';

export interface UpdateCurrentUserInput {
  name?: string;
}

export async function getCurrentProfile(): Promise<User> {
  return apiRequest<User>('/users/me');
}

export async function updateCurrentUser(
  input: UpdateCurrentUserInput
): Promise<User> {
  return apiRequest<User>('/users/me', {
    method: 'PATCH',
    body: input,
  });
}

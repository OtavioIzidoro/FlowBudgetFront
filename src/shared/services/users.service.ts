import type { User } from '@/entities/user/types';
import { apiRequest } from '@/shared/services/api-client';

export interface UpdateCurrentUserInput {
  name?: string;
}

export interface ListUsersParams {
  search?: string;
  role?: User['role'] | 'all';
  status?: User['status'] | 'all';
  page?: number;
  limit?: number;
}

export interface ListUsersResponse {
  data: User[];
  page: number;
  limit: number;
  total: number;
}

export interface UpdateUserStatusInput {
  id: string;
  status: NonNullable<User['status']>;
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

export async function listUsers(params?: ListUsersParams): Promise<ListUsersResponse> {
  return apiRequest<ListUsersResponse>('/users', {
    unwrapData: false,
    params: {
      search: params?.search || undefined,
      role: params?.role && params.role !== 'all' ? params.role : undefined,
      status: params?.status && params.status !== 'all' ? params.status : undefined,
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
    },
  });
}

export async function updateUserStatus(
  input: UpdateUserStatusInput
): Promise<User> {
  const { id, status } = input;

  return apiRequest<User>(`/users/${id}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

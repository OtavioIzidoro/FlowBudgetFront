import type { Transaction, TransactionType } from '@/entities/transaction/types';
import { apiRequest } from '@/shared/services/api-client';
import { appLogger } from '@/shared/logger';

export async function getTransactions(params?: {
  type?: TransactionType;
  search?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}): Promise<Transaction[]> {
  const res = await apiRequest<Transaction[]>('/transactions', {
    params: {
      type: params?.type,
      search: params?.search,
      categoryId: params?.categoryId,
      page: params?.page ?? 1,
      limit: params?.limit ?? 100,
    },
  });
  return Array.isArray(res) ? res : [];
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  try {
    const data = await apiRequest<Transaction>(`/transactions/${id}`);
    return data;
  } catch (e) {
    const err = e as { code?: string };
    if (err?.code === 'TRANSACTION_NOT_FOUND') return null;
    throw e;
  }
}

export interface CreateTransactionInput {
  type: TransactionType;
  value: number;
  categoryId: string;
  date: string;
  status?: Transaction['status'];
  description?: string;
  installmentsTotal?: number;
}

export async function createTransaction(
  input: CreateTransactionInput
): Promise<Transaction> {
  const data = await apiRequest<Transaction>('/transactions', {
    method: 'POST',
    body: {
      type: input.type,
      value: input.value,
      categoryId: input.categoryId,
      date: input.date,
      status: input.status ?? 'completed',
      description: input.description ?? undefined,
      installmentsTotal: input.installmentsTotal ?? 1,
    },
  });
  appLogger.info('Transação criada', {
    domain: 'transaction',
    event: 'transaction.created',
    transactionId: data.id,
    type: data.type,
  });
  return data;
}

export interface UpdateTransactionInput extends Partial<CreateTransactionInput> {
  id: string;
}

export async function updateTransaction(
  input: UpdateTransactionInput
): Promise<Transaction> {
  const { id, ...body } = input;
  const data = await apiRequest<Transaction>(`/transactions/${id}`, {
    method: 'PATCH',
    body,
  });
  appLogger.info('Transação editada', {
    domain: 'transaction',
    event: 'transaction.updated',
    transactionId: id,
  });
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  await apiRequest<{ success: boolean }>(`/transactions/${id}`, {
    method: 'DELETE',
  });
  appLogger.info('Transação removida', {
    domain: 'transaction',
    event: 'transaction.deleted',
    transactionId: id,
  });
}

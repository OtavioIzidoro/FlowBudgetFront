import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { Transaction } from '@/entities/transaction/types';

function normalizeText(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function transactionMatchesQuery(transaction: Transaction, queryKey: QueryKey): boolean {
  const [, search, type, categoryId] = Array.isArray(queryKey) ? queryKey : [];

  if (typeof type === 'string' && transaction.type !== type) {
    return false;
  }

  if (typeof categoryId === 'string' && transaction.categoryId !== categoryId) {
    return false;
  }

  if (typeof search === 'string' && search.trim()) {
    const haystack = `${transaction.description ?? ''} ${transaction.date} ${transaction.type}`.toLowerCase();
    if (!haystack.includes(normalizeText(search))) {
      return false;
    }
  }

  return true;
}

export function upsertTransactionInQueries(queryClient: QueryClient, transaction: Transaction) {
  const queries = queryClient.getQueriesData<Transaction[]>({
    queryKey: ['transactions'],
  });

  queries.forEach(([queryKey, queryData]) => {
    if (!queryData) {
      return;
    }

    const withoutCurrent = queryData.filter((item) => item.id !== transaction.id);

    queryClient.setQueryData(
      queryKey,
      transactionMatchesQuery(transaction, queryKey)
        ? [transaction, ...withoutCurrent]
        : withoutCurrent
    );
  });
}

export function removeTransactionFromQueries(queryClient: QueryClient, transactionId: string) {
  const queries = queryClient.getQueriesData<Transaction[]>({
    queryKey: ['transactions'],
  });

  queries.forEach(([queryKey, queryData]) => {
    if (!queryData) {
      return;
    }

    queryClient.setQueryData(
      queryKey,
      queryData.filter((item) => item.id !== transactionId)
    );
  });
}

export async function invalidateTransactionRelatedQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'evolution'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'categorySpend'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'savingsEvolution'] }),
    queryClient.invalidateQueries({ queryKey: ['projections'] }),
  ]);

  await Promise.all([
    queryClient.refetchQueries({ queryKey: ['transactions'], type: 'active' }),
    queryClient.refetchQueries({ queryKey: ['dashboard', 'summary'], type: 'active' }),
    queryClient.refetchQueries({ queryKey: ['dashboard', 'evolution'], type: 'active' }),
    queryClient.refetchQueries({ queryKey: ['dashboard', 'categorySpend'], type: 'active' }),
    queryClient.refetchQueries({ queryKey: ['dashboard', 'savingsEvolution'], type: 'active' }),
    queryClient.refetchQueries({ queryKey: ['projections'], type: 'active' }),
  ]);
}

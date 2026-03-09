import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RecurringTemplate } from '@/entities/recurring-template/types';
import { getTransactions } from '@/shared/services/transactions.service';
import {
  confirmRecurringForMonth,
  getRecurringExecutionDay,
  getRecurringTemplates,
} from '@/shared/services/recurring.service';
import { invalidateTransactionRelatedQueries } from '@/shared/lib/query-invalidation';
import { useAuthStore } from '@/shared/store/auth-store';
import { appLogger } from '@/shared/logger';

const SYNC_INTERVAL_MS = 60_000;

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function isRecurringAlreadyCreatedForMonth(
  template: RecurringTemplate,
  yearMonth: string,
  transactions: Array<{ date: string; categoryId: string; type: string; value: number }>
): boolean {
  return transactions.some(
    (transaction) =>
      transaction.date.startsWith(yearMonth) &&
      transaction.categoryId === template.categoryId &&
      transaction.type === template.type &&
      transaction.value === template.value
  );
}

export function useRecurringAutomation() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const processingKeysRef = useRef(new Set<string>());
  const syncingRef = useRef(false);

  const syncRecurringTemplates = useCallback(async () => {
    if (!isAuthenticated || syncingRef.current) {
      return;
    }

    syncingRef.current = true;

    try {
      const [templates, transactions] = await Promise.all([
        getRecurringTemplates(),
        getTransactions({ limit: 500 }),
      ]);

      const now = new Date();
      const currentMonth = getMonthKey(now);
      const currentDay = now.getDate();
      let hasCreatedTransactions = false;

      for (const template of templates) {
        if (!template.autoCreateOnDueDate) {
          continue;
        }

        const executionDay = getRecurringExecutionDay(
          now.getFullYear(),
          now.getMonth() + 1,
          template.dayOfMonth
        );

        if (currentDay < executionDay) {
          continue;
        }

        const processingKey = `${template.id}:${currentMonth}`;

        if (
          processingKeysRef.current.has(processingKey) ||
          isRecurringAlreadyCreatedForMonth(template, currentMonth, transactions)
        ) {
          processingKeysRef.current.add(processingKey);
          continue;
        }

        processingKeysRef.current.add(processingKey);

        try {
          await confirmRecurringForMonth(template, currentMonth, {
            status: 'completed',
          });
          hasCreatedTransactions = true;
          appLogger.info('Recorrência efetivada automaticamente', {
            domain: 'recurring',
            event: 'recurring.auto_create.success',
            recurringTemplateId: template.id,
            yearMonth: currentMonth,
          });
        } catch (error) {
          processingKeysRef.current.delete(processingKey);
          appLogger.warn('Erro ao efetivar recorrência automaticamente', {
            domain: 'recurring',
            event: 'recurring.auto_create.error',
            recurringTemplateId: template.id,
            yearMonth: currentMonth,
            error: error instanceof Error ? error.message : 'unknown',
          });
        }
      }

      if (hasCreatedTransactions) {
        await invalidateTransactionRelatedQueries(queryClient);
      }
    } finally {
      syncingRef.current = false;
    }
  }, [isAuthenticated, queryClient]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void syncRecurringTemplates();

    const intervalId = window.setInterval(() => {
      void syncRecurringTemplates();
    }, SYNC_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, syncRecurringTemplates]);
}

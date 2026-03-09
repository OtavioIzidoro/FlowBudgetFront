import { apiRequest } from '@/shared/services/api-client';

export interface TelegramPreferences {
  connected: boolean;
  chatIdMasked: string | null;
  notifyNewExpense: boolean;
  notifyNewIncome: boolean;
  notifyLowBalance: boolean;
  lowBalanceThresholdCents: number | null;
  notifyDailySummary: boolean;
  dailySummaryTime: string | null;
  notifyAiInsights: boolean;
}

export interface UpdateTelegramPreferencesInput {
  notifyNewExpense?: boolean;
  notifyNewIncome?: boolean;
  notifyLowBalance?: boolean;
  lowBalanceThresholdCents?: number | null;
  notifyDailySummary?: boolean;
  dailySummaryTime?: string | null;
  notifyAiInsights?: boolean;
}

export async function getTelegramPreferences(): Promise<TelegramPreferences> {
  return apiRequest<TelegramPreferences>('/telegram/me');
}

export async function updateTelegramPreferences(
  input: UpdateTelegramPreferencesInput
): Promise<TelegramPreferences> {
  return apiRequest<TelegramPreferences>('/telegram/preferences', {
    method: 'PATCH',
    body: input,
  });
}

export async function sendTelegramTestMessage(message: string): Promise<void> {
  await apiRequest<{ success: boolean }>('/telegram/test-message', {
    method: 'POST',
    body: { message },
  });
}

export async function disconnectTelegram(): Promise<void> {
  await apiRequest<{ success: boolean }>('/telegram/disconnect', {
    method: 'POST',
  });
}

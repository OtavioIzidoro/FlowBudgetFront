import { apiRequest } from '@/shared/services/api-client';

export type FinancialInsightReason =
  | 'disabled'
  | 'insufficient_data'
  | 'quota_exceeded'
  | 'unavailable'
  | null;

export interface FinancialInsightPayload {
  headline: string;
  advice: string;
}

export interface FinancialInsightResponse {
  enabled: boolean;
  cached: boolean;
  generatedAt: string | null;
  insight: FinancialInsightPayload | null;
  reason: FinancialInsightReason;
}

export async function getFinancialInsight(): Promise<FinancialInsightResponse> {
  return apiRequest<FinancialInsightResponse>('/financial-ai/insight');
}

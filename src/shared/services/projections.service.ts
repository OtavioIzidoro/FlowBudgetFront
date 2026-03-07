import { MOCK_DELAY_MS } from '@/shared/config/constants';

export interface ProjectionPoint {
  date: string;
  balance: number;
}

export interface ProjectionScenario {
  id: string;
  name: string;
  description: string;
  points: ProjectionPoint[];
}

const MOCK_PROJECTION: ProjectionPoint[] = [
  { date: '2025-03', balance: 125000 },
  { date: '2025-04', balance: 220000 },
  { date: '2025-05', balance: 315000 },
  { date: '2025-06', balance: 410000 },
  { date: '2025-07', balance: 505000 },
  { date: '2025-08', balance: 600000 },
  { date: '2025-09', balance: 695000 },
  { date: '2025-10', balance: 790000 },
  { date: '2025-11', balance: 885000 },
  { date: '2025-12', balance: 980000 },
];

const MOCK_SCENARIOS: ProjectionScenario[] = [
  {
    id: 's1',
    name: 'Cenário base',
    description: 'Manutenção dos gastos atuais',
    points: MOCK_PROJECTION,
  },
  {
    id: 's2',
    name: 'Cenário otimista',
    description: 'Redução de 10% nas despesas',
    points: MOCK_PROJECTION.map((p, i) => ({
      ...p,
      balance: p.balance + (i + 1) * 15000,
    })),
  },
  {
    id: 's3',
    name: 'Cenário conservador',
    description: 'Aumento de 10% nas despesas',
    points: MOCK_PROJECTION.map((p, i) => ({
      ...p,
      balance: Math.max(0, p.balance - (i + 1) * 12000),
    })),
  },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getBalanceProjection(): Promise<ProjectionPoint[]> {
  await delay(MOCK_DELAY_MS);
  return [...MOCK_PROJECTION];
}

export async function getProjectionScenarios(): Promise<ProjectionScenario[]> {
  await delay(MOCK_DELAY_MS);
  return [...MOCK_SCENARIOS];
}

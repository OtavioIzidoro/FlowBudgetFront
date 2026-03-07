export type GoalStatus = 'active' | 'achieved' | 'overdue';

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  status: GoalStatus;
}

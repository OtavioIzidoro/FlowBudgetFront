export type NotificationType = 'budget' | 'due_date' | 'goal' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  scheduleFor?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

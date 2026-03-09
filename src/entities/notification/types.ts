export type NotificationType = 'budget' | 'due_date' | 'goal' | 'info';

export interface Notification {
  id: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  scheduleFor?: string | null;
  sentAt?: string | null;
  repeatCount?: number | null;
  repeatIntervalMinutes?: number | null;
  parentNotificationId?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
}

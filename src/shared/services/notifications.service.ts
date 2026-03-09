import type { Notification } from '@/entities/notification/types';
import { apiRequest } from '@/shared/services/api-client';

export interface CreateNotificationInput {
  type: Notification['type'];
  title: string;
  message: string;
  scheduleFor?: string;
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<Notification> {
  const data = await apiRequest<Notification>('/notifications', {
    method: 'POST',
    body: input,
  });
  return data;
}

export async function getNotifications(): Promise<Notification[]> {
  const res = await apiRequest<Notification[]>('/notifications');
  const list = Array.isArray(res) ? res : [];
  return list.sort(
    (a, b) =>
      new Date(b.sentAt ?? b.createdAt).getTime() -
      new Date(a.sentAt ?? a.createdAt).getTime()
  );
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await apiRequest<Notification>(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const list = await getNotifications();
  await Promise.all(
    list.filter((n) => !n.read).map((n) => markNotificationAsRead(n.id))
  );
}

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Notification } from '@/entities/notification/types';
import { getNotifications } from '@/shared/services/notifications.service';
import { useAuthStore } from '@/shared/store/auth-store';

const STORAGE_KEY = 'flowbudget-desktop-notifications-shown';
const MAX_STORED_IDS = 200;
const POLL_INTERVAL_MS = 60_000;

function getStorageKeyForUser(userId: string): string {
  return `${STORAGE_KEY}:${userId}`;
}

function readShownIds(userId: string): string[] {
  try {
    const raw = localStorage.getItem(getStorageKeyForUser(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}

function writeShownIds(userId: string, ids: string[]): void {
  try {
    localStorage.setItem(
      getStorageKeyForUser(userId),
      JSON.stringify(ids.slice(-MAX_STORED_IDS))
    );
  } catch {
    //
  }
}

function isDue(notification: Notification): boolean {
  const reference = notification.scheduleFor ?? notification.sentAt ?? notification.createdAt;
  return new Date(reference).getTime() <= Date.now();
}

export function useDesktopNotifications() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const query = useQuery({
    queryKey: ['desktop-notifications', user?.id],
    queryFn: getNotifications,
    enabled: Boolean(user?.id && isAuthenticated && window.electronAPI?.showNotification),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    const electronAPI = window.electronAPI;

    if (!user?.id || !query.data?.length || !electronAPI?.showNotification) {
      return;
    }

    const shownIds = new Set(readShownIds(user.id));
    const dueNotifications = query.data.filter(
      (notification) => !notification.read && !shownIds.has(notification.id) && isDue(notification)
    );

    if (!dueNotifications.length) {
      return;
    }

    void (async () => {
      const displayedIds: string[] = [];
      for (const notification of dueNotifications) {
        const displayed = await electronAPI.showNotification({
          title: notification.title,
          body: notification.message,
        });
        if (displayed) {
          displayedIds.push(notification.id);
        }
      }

      if (displayedIds.length) {
        writeShownIds(user.id, [...shownIds, ...displayedIds]);
      }
    })();
  }, [query.data, user?.id]);
}

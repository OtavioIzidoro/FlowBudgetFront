import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Notification } from '@/entities/notification/types';
import { getNotifications } from '@/shared/services/notifications.service';
import { useAuthStore } from '@/shared/store/auth-store';
import { useUserPreferencesStore } from '@/shared/store/user-preferences-store';

const STORAGE_KEY = 'flowbudget-desktop-notifications-shown';
const MAX_STORED_IDS = 200;
const POLL_INTERVAL_MS = 15_000;

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

function canShowSystemNotifications(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return Boolean(window.electronAPI?.showNotification || 'Notification' in window);
}

async function showSystemNotification(notification: Notification): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  if (window.electronAPI?.showNotification) {
    return window.electronAPI.showNotification({
      title: notification.title,
      body: notification.message,
    });
  }

  if (!('Notification' in window)) {
    return false;
  }

  if (window.Notification.permission === 'default') {
    const permission = await window.Notification.requestPermission();
    if (permission !== 'granted') {
      return false;
    }
  }

  if (window.Notification.permission !== 'granted') {
    return false;
  }

  new window.Notification(notification.title, {
    body: notification.message,
  });

  return true;
}

function getNotificationTimestamp(notification: Notification): number {
  const reference = notification.scheduleFor ?? notification.sentAt ?? notification.createdAt;
  return new Date(reference).getTime();
}

export function useDesktopNotifications() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const notificationsEnabled = useUserPreferencesStore((state) => state.notificationsEnabled);

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    enabled: Boolean(user?.id && isAuthenticated && notificationsEnabled && canShowSystemNotifications()),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!user?.id || !notificationsEnabled || !query.data?.length || !canShowSystemNotifications()) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;

    const displayDueNotifications = async () => {
      if (cancelled) {
        return;
      }

      const shownIds = new Set(readShownIds(user.id));
      const dueNotifications = query.data.filter(
        (notification) =>
          !notification.read &&
          !notification.cancelledAt &&
          !shownIds.has(notification.id) &&
          isDue(notification)
      );

      if (!dueNotifications.length) {
        return;
      }

      const displayedIds: string[] = [];

      for (const notification of dueNotifications) {
        const displayed = await showSystemNotification(notification);
        if (displayed) {
          displayedIds.push(notification.id);
        }
      }

      if (!cancelled && displayedIds.length) {
        writeShownIds(user.id, [...shownIds, ...displayedIds]);
      }
    };

    const scheduleNextNotification = () => {
      const shownIds = new Set(readShownIds(user.id));
      const nextTimestamp = query.data
        .filter(
          (notification) =>
            !notification.read && !notification.cancelledAt && !shownIds.has(notification.id)
        )
        .map(getNotificationTimestamp)
        .filter((timestamp) => Number.isFinite(timestamp) && timestamp > Date.now())
        .sort((a, b) => a - b)[0];

      if (!nextTimestamp) {
        return;
      }

      timeoutId = window.setTimeout(() => {
        void displayDueNotifications().then(() => {
          if (!cancelled) {
            scheduleNextNotification();
          }
        });
      }, Math.max(0, nextTimestamp - Date.now()) + 250);
    };

    void displayDueNotifications().then(() => {
      if (!cancelled) {
        scheduleNextNotification();
      }
    });

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [notificationsEnabled, query.data, user?.id]);
}

import type { User } from '@/entities/user/types';
import { SUPER_ADMIN_EMAILS } from '@/shared/config/constants';

export function isAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'super_admin') return true;
  return SUPER_ADMIN_EMAILS.includes(user.email);
}

export function isSuperAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  return SUPER_ADMIN_EMAILS.includes(user.email);
}

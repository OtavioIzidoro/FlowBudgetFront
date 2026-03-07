import type { User } from '@/entities/user/types';
import { SUPER_ADMIN_EMAILS } from '@/shared/config/constants';

export function isSuperAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  return SUPER_ADMIN_EMAILS.includes(user.email);
}

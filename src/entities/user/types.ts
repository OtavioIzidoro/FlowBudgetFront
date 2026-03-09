export interface User {
  id: string;
  name: string;
  email: string;
  role?: 'user' | 'admin' | 'super_admin';
  status?: 'active' | 'inactive';
  passwordChangeRequired?: boolean;
  createdAt?: string;
  updatedAt?: string;
}


export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
}

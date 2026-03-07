export interface User {
  id: string;
  name: string;
  email: string;
  role?: 'user' | 'super_admin';
  passwordChangeRequired?: boolean;
}


export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
}

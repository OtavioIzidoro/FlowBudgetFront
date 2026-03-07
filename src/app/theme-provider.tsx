import { useTheme } from '@/shared/hooks/use-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useTheme();
  return <>{children}</>;
}

import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from '@/app/router';
import { AuthSessionBootstrap } from '@/app/auth-session-bootstrap';
import { ThemeProvider } from '@/app/theme-provider';
import { Toaster } from '@/shared/ui/toaster';
import { PwaSplashScreen } from '@/shared/components/pwa-splash-screen';
import { PwaUpdatePrompt } from '@/shared/components/pwa-update-prompt';
import '@/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <PwaSplashScreen>
          <AuthSessionBootstrap />
          <RouterProvider router={router} />
          <Toaster />
          <PwaUpdatePrompt />
        </PwaSplashScreen>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);

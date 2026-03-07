import { createRouter } from '@tanstack/react-router';
import { routeTree } from '@/routes/route-tree';
import { useAuthStore } from '@/shared/store/auth-store';

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const router = createRouter({
  routeTree,
  context: {
    auth: useAuthStore.getState(),
  },
});

export { router };

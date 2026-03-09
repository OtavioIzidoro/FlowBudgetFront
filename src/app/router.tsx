import { createHashHistory, createRouter } from '@tanstack/react-router';
import { routeTree } from '@/routes/route-tree';
import { useAuthStore } from '@/shared/store/auth-store';

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const history =
  typeof window !== 'undefined' && window.location.protocol === 'file:'
    ? createHashHistory()
    : undefined;

const router = createRouter({
  routeTree,
  history,
  context: {
    auth: useAuthStore.getState(),
  },
});

export { router };

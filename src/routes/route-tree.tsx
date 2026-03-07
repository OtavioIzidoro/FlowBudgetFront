import {
  createRootRouteWithContext,
  createRoute,
  Outlet,
} from '@tanstack/react-router';
import { LoginPage } from '@/features/auth/login-page';
import { IndexRedirect, AuthenticatedLayout } from '@/routes/authenticated-layout';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { TransactionsPage } from '@/features/transactions/transactions-page';
import { CategoriesPage } from '@/features/categories/categories-page';
import { GoalsPage } from '@/features/goals/goals-page';
import { NotificationsPage } from '@/features/notifications/notifications-page';
import { ProjectionsPage } from '@/features/projections/projections-page';
import { ProfilePage } from '@/features/profile/profile-page';
import { CreateUserPage } from '@/features/admin/create-user-page';
import { ChangePasswordPage } from '@/features/auth/change-password-page';
import { useAuthStore } from '@/shared/store/auth-store';

interface RouterContext {
  auth: ReturnType<typeof useAuthStore.getState>;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexRedirect,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_authenticated',
  component: AuthenticatedLayout,
});

const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/dashboard',
  component: DashboardPage,
});

const transactionsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/transactions',
  component: TransactionsPage,
});

const categoriesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/categories',
  component: CategoriesPage,
});

const goalsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/goals',
  component: GoalsPage,
});

const notificationsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/notifications',
  component: NotificationsPage,
});

const projectionsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/projections',
  component: ProjectionsPage,
});

const profileRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/profile',
  component: ProfilePage,
});

const createUserRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/admin/users/create',
  component: CreateUserPage,
});

const changePasswordRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/change-password',
  component: ChangePasswordPage,
});

authenticatedRoute.addChildren([
  dashboardRoute,
  transactionsRoute,
  categoriesRoute,
  goalsRoute,
  notificationsRoute,
  projectionsRoute,
  profileRoute,
  createUserRoute,
  changePasswordRoute,
]);

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  authenticatedRoute,
]);

export { routeTree, rootRoute };

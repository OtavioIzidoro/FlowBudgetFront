import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from '@tanstack/react-router';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  LayoutDashboard,
  ArrowLeftRight,
  FolderTree,
  Target,
  Bell,
  TrendingUp,
  User,
  Users,
  Compass,
  UserPlus,
  CalendarCheck,
  Plus,
  Download,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useAuthStore } from '@/shared/store/auth-store';
import { isAdmin, isSuperAdmin } from '@/shared/lib/auth';
import { logout as apiLogout } from '@/shared/services/auth.service';
import { useTourStore } from '@/shared/store/tour-store';
import { Tour } from '@/shared/components/tour/tour';
import { APP_TITLE } from '@/shared/config/constants';
import { Button } from '@/shared/ui/button';
import { useInactivitySession } from '@/shared/hooks/use-inactivity-session';
import { useDesktopNotifications } from '@/shared/hooks/use-desktop-notifications';
import { useAppUpdates } from '@/shared/hooks/use-app-updates';
import { SidebarBalance } from '@/app/sidebar-balance';
import { useNewTransactionModalStore } from '@/shared/store/new-transaction-modal-store';
import { AppFooter } from '@/shared/components/app-footer';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, tourId: 'nav-dashboard' },
  { to: '/transactions', label: 'Transações', icon: ArrowLeftRight, tourId: 'nav-transactions' },
  { to: '/bills', label: 'Contas a pagar', icon: CalendarCheck, tourId: 'nav-bills' },
  { to: '/categories', label: 'Categorias', icon: FolderTree, tourId: 'nav-categories' },
  { to: '/goals', label: 'Metas', icon: Target, tourId: 'nav-goals' },
  { to: '/notifications', label: 'Notificações', icon: Bell, tourId: 'nav-notifications' },
  { to: '/projections', label: 'Projeções', icon: TrendingUp, tourId: 'nav-projections' },
  { to: '/profile', label: 'Perfil', icon: User, tourId: 'nav-profile' },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const storeLogout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const [now, setNow] = useState(() => new Date());
  const showAdmin = isAdmin(user);
  const showCreateUser = isSuperAdmin(user);
  const {
    canCheckForUpdates,
    checkForUpdates,
    isCheckingForUpdates,
    isUpdateReady,
  } = useAppUpdates();

  useInactivitySession();
  useDesktopNotifications();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const formattedNow = format(now, "EEEE, dd/MM/yyyy 'às' HH:mm:ss", {
    locale: ptBR,
  });
  const displayNow = formattedNow.charAt(0).toUpperCase() + formattedNow.slice(1);

  const handleLogout = async () => {
    await apiLogout();
    storeLogout();
  };

  return (
    <div className="flex h-screen bg-background">
      <aside
        className="flex w-56 flex-col border-r bg-card"
        data-tour="sidebar"
      >
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <img
            src="/assets/logo.png"
            alt="FlowBudget"
            className="h-8 w-8 shrink-0 object-contain"
          />
          <span className="font-semibold text-foreground truncate">{APP_TITLE}</span>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                data-tour={item.tourId}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <SidebarBalance />
        {showAdmin && (
          <div className="border-t px-2 py-2">
            <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Admin
            </p>
            <Link
              to={'/admin/users' as '/'}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                location.pathname === '/admin/users'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Users className="h-4 w-4" />
              Usuários
            </Link>
            {showCreateUser && (
              <Link
                to={'/admin/users/create' as '/'}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  location.pathname === '/admin/users/create'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <UserPlus className="h-4 w-4" />
                Criar usuário
              </Link>
            )}
          </div>
        )}
        <div className="border-t p-2 space-y-1">
          {canCheckForUpdates && (
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => void checkForUpdates()}
              disabled={isCheckingForUpdates}
            >
              {isCheckingForUpdates ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : isUpdateReady ? (
                <Download className="mr-2 h-4 w-4" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {isCheckingForUpdates
                ? 'Procurando atualização...'
                : isUpdateReady
                  ? 'Instalar atualização'
                  : 'Procurar atualização'}
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => useTourStore.getState().start()}
          >
            <Compass className="mr-2 h-4 w-4" />
            Iniciar tour
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => void handleLogout()}
          >
            Sair
          </Button>
        </div>
      </aside>
      <main className="relative flex flex-1 flex-col" data-tour="main-content">
        <div className="border-b bg-background/95 px-6 py-3 text-center text-sm font-medium text-foreground">
          {displayNow}
        </div>
        <div className="relative flex-1 overflow-auto">
          <Outlet />
          <button
            type="button"
            onClick={() => {
              useNewTransactionModalStore.getState().setOpenFromFab(true);
              void navigate({ to: '/transactions' as '/' });
            }}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
            aria-label="Nova transação"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
        <AppFooter />
      </main>
      <Tour />
    </div>
  );
}

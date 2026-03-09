import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, UserCog, UserPlus, Users } from 'lucide-react';
import { useAuthStore } from '@/shared/store/auth-store';
import { isSuperAdmin } from '@/shared/lib/auth';
import {
  listUsers,
  updateUserStatus,
  type ListUsersParams,
} from '@/shared/services/users.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Spinner } from '@/shared/ui/spinner';
import { useToastStore } from '@/shared/store/toast-store';
import { toServiceError } from '@/shared/lib/errors';
import { appLogger } from '@/shared/logger';
import type { User } from '@/entities/user/types';

const ROLE_LABELS: Record<NonNullable<User['role']>, string> = {
  user: 'Usuário',
  admin: 'Admin',
  super_admin: 'Super admin',
};

const STATUS_LABELS: Record<NonNullable<User['status']>, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
};

const adminCardClassName =
  'border-primary/10 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm';

function formatDate(value?: string): string {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return format(date, 'dd/MM/yyyy', { locale: ptBR });
}

function getStatusClassName(status?: User['status']): string {
  if (status === 'inactive') {
    return 'border-destructive/20 bg-destructive/10 text-destructive';
  }

  return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
}

export function UsersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const canAccess = isSuperAdmin(currentUser);

  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<ListUsersParams>({
    page: 1,
    limit: 20,
    role: 'all',
    status: 'all',
    search: '',
  });

  useEffect(() => {
    if (currentUser && !canAccess) {
      navigate({ to: '/dashboard' as '/' });
    }
  }, [canAccess, currentUser, navigate]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: () => listUsers(filters),
    enabled: canAccess,
  });

  const updateStatusMutation = useMutation({
    mutationFn: updateUserStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      useToastStore.getState().success('Status do usuário atualizado.');
    },
    onError: (error: unknown) => {
      const err = toServiceError(error);
      appLogger.warn('Erro ao atualizar status do usuário', {
        domain: 'user',
        event: 'admin.user.status.error',
        code: err.code,
        error: err.message,
      });
      useToastStore.getState().error(err.message);
    },
  });

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const page = data?.page ?? filters.page ?? 1;
  const limit = data?.limit ?? filters.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const summary = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        if (user.status === 'inactive') {
          acc.inactive += 1;
        } else {
          acc.active += 1;
        }

        if (user.passwordChangeRequired) {
          acc.passwordChangeRequired += 1;
        }

        return acc;
      },
      { active: 0, inactive: 0, passwordChangeRequired: 0 }
    );
  }, [users]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilters((current) => ({
      ...current,
      page: 1,
      search: searchInput.trim(),
    }));
  };

  const handleRoleChange = (value: ListUsersParams['role']) => {
    setFilters((current) => ({
      ...current,
      page: 1,
      role: value,
    }));
  };

  const handleStatusChange = (value: ListUsersParams['status']) => {
    setFilters((current) => ({
      ...current,
      page: 1,
      status: value,
    }));
  };

  const handlePageChange = (nextPage: number) => {
    setFilters((current) => ({
      ...current,
      page: nextPage,
    }));
  };

  if (currentUser && !canAccess) {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie a base de usuários, acompanhe status e primeiros acessos.
          </p>
        </div>

        {canAccess && (
          <Button asChild>
            <Link to={'/admin/users/create' as '/'}>
              <UserPlus className="mr-2 h-4 w-4" />
              Criar usuário
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className={adminCardClassName}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários nesta página</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{users.length}</span>
            <p className="mt-1 text-xs text-muted-foreground">
              Total geral: {total}
            </p>
          </CardContent>
        </Card>

        <Card className={adminCardClassName}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {summary.active} ativos / {summary.inactive} inativos
            </span>
            <p className="mt-1 text-xs text-muted-foreground">
              Contagem da página atual.
            </p>
          </CardContent>
        </Card>

        <Card className={adminCardClassName}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Troca de senha pendente</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{summary.passwordChangeRequired}</span>
            <p className="mt-1 text-xs text-muted-foreground">
              Usuários desta página que ainda precisam redefinir a senha.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className={adminCardClassName}>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px_200px_auto]"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Busca</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  className="pl-9"
                  placeholder="Buscar por nome ou e-mail"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Perfil</label>
              <Select
                value={filters.role ?? 'all'}
                onValueChange={(value) => handleRoleChange(value as ListUsersParams['role'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status ?? 'all'}
                onValueChange={(value) => handleStatusChange(value as ListUsersParams['status'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button type="submit" disabled={isFetching}>
                {isFetching ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Buscando...
                  </>
                ) : (
                  'Aplicar'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchInput('');
                  setFilters({
                    page: 1,
                    limit: 20,
                    role: 'all',
                    status: 'all',
                    search: '',
                  });
                }}
              >
                Limpar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className={adminCardClassName}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Listagem</CardTitle>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((item) => (
                <Skeleton key={item} className="h-14 w-full" />
              ))}
            </div>
          ) : users.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="px-3 py-3 font-medium">Usuário</th>
                      <th className="px-3 py-3 font-medium">Perfil</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-3 py-3 font-medium">Primeiro acesso</th>
                      <th className="px-3 py-3 font-medium">Criado em</th>
                      <th className="px-3 py-3 text-right font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const isCurrentUser = currentUser?.id === user.id;
                      const nextStatus = user.status === 'inactive' ? 'active' : 'inactive';
                      const isUpdating =
                        updateStatusMutation.isPending &&
                        updateStatusMutation.variables?.id === user.id;

                      return (
                        <tr key={user.id} className="border-b last:border-0">
                          <td className="px-3 py-3">
                            <div className="font-medium">{user.name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </td>
                          <td className="px-3 py-3">
                            {ROLE_LABELS[user.role ?? 'user']}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClassName(user.status)}`}
                            >
                              {STATUS_LABELS[user.status ?? 'active']}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {user.passwordChangeRequired ? 'Pendente' : 'Concluído'}
                          </td>
                          <td className="px-3 py-3">{formatDate(user.createdAt)}</td>
                          <td className="px-3 py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isCurrentUser || isUpdating}
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  id: user.id,
                                  status: nextStatus,
                                })
                              }
                            >
                              {isUpdating ? (
                                <>
                                  <Spinner size="sm" className="mr-2" />
                                  Salvando...
                                </>
                              ) : user.status === 'inactive' ? (
                                'Ativar'
                              ) : (
                                'Inativar'
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando {(page - 1) * limit + 1} a {Math.min(page * limit, total)} de {total} usuário(s).
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    disabled={page <= 1 || isFetching}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    disabled={page >= totalPages || isFetching}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm font-medium">Nenhum usuário encontrado.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ajuste os filtros ou limpe a busca para tentar novamente.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

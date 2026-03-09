import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '@/shared/services/dashboard.service';
import { formatCurrency } from '@/shared/lib/format';
import { Skeleton } from '@/shared/ui/skeleton';

export function SidebarBalance() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary,
  });

  if (isLoading) {
    return (
      <div className="border-t px-3 py-3 space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (!summary) return null;

  const monthlySurplus = summary.monthlyIncome - summary.monthlyExpenses;

  return (
    <div className="border-t px-3 py-3 space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Saldo atual
      </p>
      <p
        className={`text-lg font-semibold ${
          summary.currentBalance >= 0 ? 'text-green-600' : 'text-destructive'
        }`}
      >
        {formatCurrency(summary.currentBalance)}
      </p>
      <p className="text-xs text-muted-foreground">
        Sobra do mês:{' '}
        <span className={monthlySurplus >= 0 ? 'text-green-600' : 'text-destructive'}>
          {formatCurrency(monthlySurplus)}
        </span>
      </p>
    </div>
  );
}

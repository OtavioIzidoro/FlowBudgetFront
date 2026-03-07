import { cn } from '@/shared/lib/utils';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'default' | 'lg';
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  default: 'h-8 w-8 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

function Spinner({ className, size = 'default', ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className={cn(
        'inline-block animate-spin rounded-full border-primary border-t-transparent',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}

export { Spinner };

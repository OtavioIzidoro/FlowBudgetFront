import { COMPANY_NAME } from '@/shared/config/constants';
import { cn } from '@/shared/lib/utils';

interface AppFooterProps {
  className?: string;
}

export function AppFooter({ className }: AppFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={cn(
        'border-t bg-background/95 px-4 py-3 text-center text-xs text-muted-foreground',
        className
      )}
    >
      <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
        <span>Desenvolvido por</span>
        <img
          src="/assets/logoizitec.png"
          alt={COMPANY_NAME}
          className="h-8 w-auto object-contain"
        />
        <span>&copy; {currentYear} {COMPANY_NAME}. Todos os direitos reservados.</span>
      </div>
    </footer>
  );
}

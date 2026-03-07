import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppLayout } from '@/app/app-layout';

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => <div data-testid="outlet">Outlet</div>,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useLocation: () => ({ pathname: '/dashboard' }),
}));

describe('AppLayout', () => {
  it('renderiza menu e outlet', () => {
    render(<AppLayout />);
    expect(screen.getByText(/Dashboard/)).toBeInTheDocument();
    expect(screen.getByText(/Transações/)).toBeInTheDocument();
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });
});

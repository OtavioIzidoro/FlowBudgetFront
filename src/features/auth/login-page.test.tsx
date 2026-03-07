import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from '@/features/auth/login-page';
import { useAuthStore } from '@/shared/store/auth-store';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

function renderLoginPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LoginPage />
    </QueryClientProvider>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
    mockNavigate.mockClear();
  });

  it('renderiza formulário de login', () => {
    renderLoginPage();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('exibe mensagem de validação ao enviar sem e-mail', async () => {
    renderLoginPage();
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByText(/informe o e-mail/i)).toBeInTheDocument();
  });
});

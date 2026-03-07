import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('exibe formulário de login', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
    await expect(page.getByLabel(/senha/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible();
  });

  test('login com credenciais demo redireciona para dashboard', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByLabel(/e-mail/i).fill('demo@flowbudget.app');
    await page.getByLabel(/senha/i).fill('demo123');
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/Dashboard/).first()).toBeVisible();
  });
});

test.describe('Proteção de rota', () => {
  test('acesso a /dashboard sem login redireciona para /login', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/e-mail/i).fill('demo@flowbudget.app');
    await page.getByLabel(/senha/i).fill('demo123');
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('exibe saldo e cards', async ({ page }) => {
    await expect(page.getByText(/Saldo atual/)).toBeVisible();
    await expect(page.getByText(/Receitas do mês/)).toBeVisible();
  });
});

test.describe('Transações', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/e-mail/i).fill('demo@flowbudget.app');
    await page.getByLabel(/senha/i).fill('demo123');
    await page.getByRole('button', { name: /entrar/i }).click();
    await page.goto('/transactions');
  });

  test('exibe listagem e filtros', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Transações/ })).toBeVisible();
    await expect(page.getByPlaceholder(/Buscar/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Nova transação/ })).toBeVisible();
  });
});

test.describe('Metas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/e-mail/i).fill('demo@flowbudget.app');
    await page.getByLabel(/senha/i).fill('demo123');
    await page.getByRole('button', { name: /entrar/i }).click();
    await page.goto('/goals');
  });

  test('exibe página de metas', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Metas/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Nova meta/ })).toBeVisible();
  });
});

test.describe('Tema', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/e-mail/i).fill('demo@flowbudget.app');
    await page.getByLabel(/senha/i).fill('demo123');
    await page.getByRole('button', { name: /entrar/i }).click();
    await page.goto('/profile');
  });

  test('perfil permite trocar tema', async ({ page }) => {
    await expect(page.getByText(/Tema/)).toBeVisible();
    await expect(page.getByText(/Preferências/)).toBeVisible();
  });
});

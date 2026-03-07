# FlowBudget — Smart Financial Control

Plataforma de controle e gestão de gastos desenvolvida pela **Izitec**.

## Stack

- React 18 + TypeScript
- Vite
- TanStack Router
- TanStack Query
- Zustand
- React Hook Form + Zod
- Tailwind CSS + shadcn/ui (Radix)
- Recharts
- Pino (logs)
- Vitest + React Testing Library + Playwright

## Pré-requisitos

- Node.js 18+
- npm 9+

## Instalação

```bash
npm install
```

## Modo Web

Desenvolvimento:

```bash
npm run dev
```

Abre em [http://localhost:5173](http://localhost:5173).

Build de produção:

```bash
npm run build
npm run preview
```

## Modo Electron

Desenvolvimento (Vite em um terminal e Electron carregando a URL do dev server):

```bash
npm run electron:dev
```

Build da aplicação Electron (gera o pacote após o build web):

```bash
npm run electron:build
```

O script `electron:dev` usa `concurrently` e `wait-on`: sobe o Vite, espera `http://localhost:5173` e então inicia o Electron. O processo principal do Electron está em `electron/main.js` e o preload em `electron/preload.js`.

## Login (dados mockados)

- **E-mail:** `demo@flowbudget.app`
- **Senha:** `demo123`

## Scripts

| Comando           | Descrição                |
|-------------------|--------------------------|
| `npm run dev`     | Dev server (web)         |
| `npm run build`   | Build de produção        |
| `npm run preview` | Preview do build         |
| `npm run lint`    | ESLint                   |
| `npm run test`    | Vitest (watch)           |
| `npm run test:run`| Vitest (uma execução)     |
| `npm run test:e2e`| Playwright E2E            |
| `npm run electron:dev`  | Electron + Vite dev |
| `npm run electron:build`| Build Electron      |

## Estrutura (feature-based)

```
src/
  app/           # Layout, router
  routes/        # Árvore de rotas
  features/      # auth, dashboard, transactions, categories, goals, notifications, projections, profile
  entities/      # Tipos de domínio (user, transaction, category, goal, notification)
  shared/
    components/  # (se houver)
    ui/          # Componentes shadcn
    hooks/
    services/    # Services mockados (auth, transactions, categories, goals, notifications, dashboard, projections)
    store/       # Zustand (auth, userPreferences, notification)
    config/
    lib/
    types/
    logger/
  test/          # Setup de testes
```

## Licença

Proprietário — Izitec.
# FlowBudgetFront

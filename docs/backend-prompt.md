# Prompt: Construção do Backend FlowBudget

Construa o backend da aplicação FlowBudget seguindo rigorosamente este prompt. O frontend já existe e consome APIs mock. O backend deve expor APIs REST compatíveis com os contratos descritos.

---

## Stack e requisitos gerais

- **Framework:** NestJS (TypeScript strict)
- **Banco de dados:** PostgreSQL (preferencial) ou outro relacional
- **ORM:** Prisma ou TypeORM
- **Validação:** class-validator + class-transformer
- **Autenticação:** JWT + suporte a WebAuthn (biometria) quando houver implementação
- **HTTPS obrigatório** em produção
- **Variáveis sensíveis** via ambiente (nunca hardcoded)

---

## Segurança e criptografia

### 1. Dados sensíveis – obrigatório

| Dado | Tratamento |
|------|------------|
| Senha de usuário | Bcrypt ou Argon2 (hash, nunca armazenar em texto plano) |
| Tokens JWT | HMAC-SHA256 ou RS256; tempo de expiração curto; refresh token opcional |
| API keys / secrets | Variáveis de ambiente ou vault; nunca em código |
| Cookies de sessão | HttpOnly, Secure, SameSite=Strict |
| Authorization header | Nunca logar; redact em erros |

### 2. Criptografia em repouso (opcional mas recomendado)

- Campos PII (nome, e-mail) podem ser criptografados no banco com AES-256-GCM, usando chave derivada de variável de ambiente.
- Valores financeiros (valor de transação) armazenar em centavos; considerar criptografia para cenários de conformidade.

### 3. Criptografia em trânsito

- HTTPS obrigatório em produção.
- Headers de segurança: HSTS, X-Content-Type-Options, X-Frame-Options.

### 4. Outras regras

- Não logar: tokens, senhas, cookies, dados de cartão, PII em texto plano.
- Validação de entrada em todos os endpoints.
- Rate limiting em rotas de autenticação.
- CORS configurado para origens permitidas.

---

## Logs estruturados

### Formato obrigatório

Use Pino ou Winston com saída JSON. Cada log deve incluir:

```
{
  "timestamp": "ISO8601",
  "level": "info|warn|error|debug",
  "message": "string descritiva",
  "domain": "auth|transaction|category|goal|notification|dashboard|user",
  "event": "auth.login.success|transaction.created|...",
  "code": "opcional - código de erro",
  "requestId": "uuid - correlacionar requisição",
  "userId": "opcional - quando autenticado",
  "durationMs": "opcional - tempo da operação",
  "error": "opcional - stack apenas em dev"
}
```

### Convenções de events

- `auth.login.success`, `auth.login.failed`, `auth.logout`
- `transaction.created`, `transaction.updated`, `transaction.deleted`
- `category.created`, `category.updated`, `category.deleted`
- `goal.created`, `goal.updated`, `goal.deleted`
- `notification.created`, `notification.read`
- `dashboard.summary.requested`
- `user.created`, `user.updated`

### Redação obrigatória

Campos nunca logados em texto plano: `password`, `token`, `authorization`, `cookie`, `secret`, `apiKey`. Substituir por `[REDACTED]`.

---

## Arquitetura

### Feature-first por domínio

```
src/
  modules/
    auth/
      presentation/     # controller, dto, guards, pipes
      application/      # use-cases, ports (interfaces)
      domain/           # entidades, enums, regras
      infra/            # repositórios, adapters
    transaction/
    category/
    goal/
    notification/
    dashboard/
    user/
```

### Camadas

- **Controller:** valida request, chama use-case, retorna resposta.
- **Use-case:** orquestra regras; não contém lógica de persistência direta.
- **Repository:** acesso a dados; interfaces em application.
- **Domain:** entidades puras; regras de negócio.

---

## Entidades e contratos

### User
```
id: string (uuid)
name: string
email: string (unique)
passwordHash: string
createdAt: Date
updatedAt: Date
```

### Category
```
id: string (uuid)
userId: string
name: string
color: string
icon: string
```

### Transaction
```
id: string (uuid)
userId: string
type: 'income' | 'expense'
value: number (centavos)
categoryId: string
date: string (YYYY-MM-DD)
status: 'pending' | 'completed' | 'cancelled'
description?: string
installmentGroupId?: string
installmentNumber?: number
installmentsTotal?: number
```

### Goal
```
id: string (uuid)
userId: string
name: string
targetAmount: number (centavos)
currentAmount: number (centavos)
targetDate: string (YYYY-MM-DD)
status: 'active' | 'achieved' | 'overdue'
```

### Notification
```
id: string (uuid)
userId: string
type: 'budget' | 'due_date' | 'goal' | 'info'
title: string
message: string
read: boolean
createdAt: Date
```

---

## Endpoints esperados pelo frontend

### Auth
- `POST /auth/login` – Body: `{ email, password, remember? }` → `{ user }`
- `POST /auth/logout` – headers: Authorization
- `GET /auth/me` – retorna usuário atual ou 401

### Users
- `GET /users/me` – perfil do usuário logado
- `PATCH /users/me` – atualizar nome, preferências

### Transactions
- `GET /transactions` – Query: `type?, search?, categoryId?` → lista
- `GET /transactions/:id` – uma transação
- `POST /transactions` – criar (suportar parcelamento: installmentsTotal > 1)
- `PATCH /transactions/:id` – atualizar
- `DELETE /transactions/:id` – remover

### Categories
- `GET /categories` – lista
- `POST /categories` – criar
- `PATCH /categories/:id` – atualizar
- `DELETE /categories/:id` – remover

### Goals
- `GET /goals` – lista
- `POST /goals` – criar
- `PATCH /goals/:id` – atualizar
- `DELETE /goals/:id` – remover

### Notifications
- `GET /notifications` – lista
- `POST /notifications` – criar alerta
- `PATCH /notifications/:id/read` – marcar como lida

### Dashboard
- `GET /dashboard/summary` – `{ currentBalance, monthlyIncome, monthlyExpenses, savingsPercent }`
- `GET /dashboard/evolution` – evolução mensal
- `GET /dashboard/category-spend` – gastos por categoria
- `GET /dashboard/savings-evolution` – evolução da economia

### Projections (se implementado)
- `GET /projections` – dados para gráfico de projeções
- `POST /projections/simulate` – simular cenário

---

## Respostas padronizadas

### Sucesso
```json
{ "data": { ... } }
```

### Erro
```json
{
  "code": "INVALID_CREDENTIALS",
  "message": "E-mail ou senha incorretos.",
  "details": []
}
```

### Paginação (quando aplicável)
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

---

## Checklist final

- [ ] Senhas nunca em texto plano
- [ ] Tokens/headers sensíveis nunca logados
- [ ] Logs estruturados (JSON) com domain, event, requestId
- [ ] Validação em todos os endpoints
- [ ] Transações para operações com múltiplas escritas
- [ ] Paginação em listagens
- [ ] Timeout em chamadas externas
- [ ] CORS e headers de segurança
- [ ] Variáveis sensíveis em ambiente

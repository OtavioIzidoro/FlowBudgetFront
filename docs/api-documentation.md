# FlowBudget API - Documentação para Integração Frontend

Base URL: `http://localhost:3000` (ou URL do servidor em produção)

Todas as rotas autenticadas requerem header: `Authorization: Bearer <token>`

## Formato de Respostas

**Sucesso:**
```json
{ "data": { ... } }
```

**Erro:**
```json
{
  "code": "CODIGO_ERRO",
  "message": "Mensagem descritiva.",
  "details": []
}
```

**Listagem com paginação:**
```json
{
  "data": [...],
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```

---

## Auth (Público)

### POST /auth/register
Registra novo usuário. Sistema gera senha aleatória e envia por e-mail.

**Request:**
```json
{
  "name": "João Silva",
  "email": "joao@email.com"
}
```

**Response 201:**
```json
{
  "data": {
    "user": { "id": "uuid", "name": "João Silva", "email": "joao@email.com", "createdAt": "ISO8601", "updatedAt": "ISO8601" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### POST /auth/login
**Request:**
```json
{
  "email": "joao@email.com",
  "password": "senha123",
  "remember": false
}
```

**Response 200:**
```json
{
  "data": {
    "user": { "id": "uuid", "name": "João", "email": "joao@email.com", "createdAt": "ISO8601", "updatedAt": "ISO8601" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### POST /auth/logout
Requer autenticação. Sem body.

**Response 200:** `{ "data": { "success": true } }`

### GET /auth/me
Requer autenticação. Retorna usuário logado.

**Response 200:** `{ "data": { "id": "uuid", "name": "...", "email": "...", "createdAt": "...", "updatedAt": "..." } }` ou `{ "data": null }`

---

## Users (Autenticado)

### GET /users/me
Perfil do usuário.

**Response 200:** `{ "data": { "id", "name", "email", "createdAt", "updatedAt" } }`

### PATCH /users/me
Atualizar perfil.

**Request:**
```json
{ "name": "Novo Nome" }
```

**Response 200:** `{ "data": { "id", "name", "email", "createdAt", "updatedAt" } }`

---

## Transactions (Autenticado)

### GET /transactions
Listar transações.

**Query params:**
- `type` (opcional): `income` | `expense`
- `search` (opcional): string
- `categoryId` (opcional): string
- `page` (opcional, default: 1): number
- `limit` (opcional, default: 20, max: 100): number

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "type": "income|expense",
      "value": 10000,
      "categoryId": "uuid",
      "date": "2025-03-07",
      "status": "pending|completed|cancelled",
      "description": "string|null",
      "installmentGroupId": "string|null",
      "installmentNumber": "number|null",
      "installmentsTotal": "number|null"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 50 }
}
```

**Nota:** `value` é em centavos (10000 = R$ 100,00).

### GET /transactions/:id
Uma transação por ID.

### POST /transactions
Criar transação.

**Request:**
```json
{
  "type": "income|expense",
  "value": 10000,
  "categoryId": "uuid",
  "date": "2025-03-07",
  "status": "pending|completed|cancelled",
  "description": "string",
  "installmentsTotal": 1
}
```
- `value`: centavos (número inteiro)
- `date`: YYYY-MM-DD
- `installmentsTotal`: 1-24 para parcelar

### PATCH /transactions/:id
Atualizar transação.

**Request (parcial):**
```json
{
  "type": "income|expense",
  "value": 15000,
  "categoryId": "uuid",
  "date": "2025-03-08",
  "status": "pending|completed|cancelled",
  "description": "string"
}
```

### DELETE /transactions/:id
Excluir transação. **Response 200:** `{ "data": { "success": true } }`

---

## Categories (Autenticado)

### GET /categories
Listar categorias.

**Response 200:** `{ "data": [ { "id", "userId", "name", "color", "icon" } ] }`

### POST /categories
Criar categoria.

**Request:**
```json
{
  "name": "Alimentação",
  "color": "#FF5733",
  "icon": "food"
}
```

### PATCH /categories/:id
Atualizar categoria.

**Request:** `{ "name"?: "string", "color"?: "string", "icon"?: "string" }`

### DELETE /categories/:id

---

## Goals (Autenticado)

### GET /goals
Listar metas.

**Response 200:** `{ "data": [ { "id", "userId", "name", "targetAmount", "currentAmount", "targetDate", "status" } ] }`

- Valores em centavos
- `targetDate`: YYYY-MM-DD
- `status`: `active` | `achieved` | `overdue`

### POST /goals
Criar meta.

**Request:**
```json
{
  "name": "Viagem",
  "targetAmount": 500000,
  "currentAmount": 0,
  "targetDate": "2025-12-31"
}
```
- Valores em centavos
- `targetDate`: YYYY-MM-DD

### PATCH /goals/:id
**Request:** `{ "name"?: "string", "targetAmount"?: number, "currentAmount"?: number, "targetDate"?: "YYYY-MM-DD", "status"?: "active|achieved|overdue" }`

### DELETE /goals/:id

---

## Notifications (Autenticado, in-app)

### GET /notifications
Listar notificações do usuário.

**Response 200:** `{ "data": [ { "id", "userId", "type", "title", "message", "read", "createdAt" } ] }`

- `type`: `budget` | `due_date` | `goal` | `info`

### POST /notifications
Criar notificação.

**Request:**
```json
{
  "type": "budget|due_date|goal|info",
  "title": "Título",
  "message": "Mensagem"
}
```

### PATCH /notifications/:id/read
Marcar como lida. **Response 200:** `{ "data": { ...notification, "read": true } }`

---

## Dashboard (Autenticado)

### GET /dashboard/summary
Resumo financeiro.

**Response 200:**
```json
{
  "data": {
    "currentBalance": 0,
    "monthlyIncome": 0,
    "monthlyExpenses": 0,
    "savingsPercent": 0
  }
}
```
- Valores em centavos
- `savingsPercent`: inteiro (0-100)

### GET /dashboard/evolution
Evolução mensal.

**Query:** `months` (opcional, default: 12, max: 24)

**Response 200:**
```json
{
  "data": [
    { "month": "2025-01", "income": 0, "expense": 0, "balance": 0 }
  ]
}
```

### GET /dashboard/category-spend
Gastos por categoria no mês.

**Response 200:**
```json
{
  "data": [
    { "categoryId": "uuid", "name": "Alimentação", "color": "#xxx", "total": 50000 }
  ]
}
```

### GET /dashboard/savings-evolution
Evolução da economia.

**Query:** `months` (opcional, default: 6, max: 24)

**Response 200:**
```json
{
  "data": [
    { "month": "2025-01", "saved": 0 }
  ]
}
```

---

## Email Notifications

### POST /email-notifications/send
Enviar notificação por e-mail (público, sem auth).

**Request:**
```json
{
  "type": "welcome|reset-password|daily-summary|bill-due|goal-progress|critical-alert",
  "recipient": "usuario@email.com",
  "payload": { "userName": "...", "resetLink": "...", ... },
  "userId": "uuid"
}
```

**Response 200:**
```json
{
  "data": { "sent": true, "decision": "SEND_NOW", "aggregated": false }
}
```

### GET /email-notifications/quota
Status da cota diária de e-mails.

**Response 200:**
```json
{
  "data": {
    "date": "2025-03-07",
    "totalSent": 10,
    "limit": 100,
    "remaining": 90,
    "criticalReserved": 20,
    "criticalRemaining": 20
  }
}
```

### GET /email-notifications/digest/send
Enviar resumo diário por e-mail. Requer autenticação.

**Query:** `recipient` (opcional)

---

## Health

### GET /
Health check. **Response 200:** `{ "status": "ok" }`

---

## Swagger

Documentação interativa: `GET /api/docs`

---

## Códigos de Erro Comuns

| Código | Descrição |
|--------|-----------|
| INVALID_CREDENTIALS | E-mail ou senha incorretos |
| EMAIL_ALREADY_EXISTS | E-mail já cadastrado |
| UNAUTHORIZED | Token inválido ou expirado |
| USER_NOT_FOUND | Usuário não encontrado |
| CATEGORY_NOT_FOUND | Categoria não encontrada |
| TRANSACTION_NOT_FOUND | Transação não encontrada |
| GOAL_NOT_FOUND | Meta não encontrada |
| NOTIFICATION_NOT_FOUND | Notificação não encontrada |
| INVALID_INSTALLMENTS | Parcelas devem estar entre 1 e 24 |

# SaaS Billing API (Tenants)

Este documento descreve os endpoints de billing implementados para gestão de assinatura SaaS por tenant, bloqueio por inadimplência e ingestão de webhooks.

## Endpoint

- Produção (Vercel): `POST /api/billing`
- Desenvolvimento local: `POST http://localhost:4002/api/billing`
- Webhook Stripe dedicado: `POST /api/stripe-webhook`
- Webhook Stripe dedicado (local): `POST http://localhost:4002/api/stripe-webhook`

## Autenticação

### Ações de gestão (token obrigatório)

Requer `Authorization: Bearer <session_token>`:

- `get_billing`
- `list_invoices`
- `upsert_subscription`
- `create_checkout_session`
- `create_billing_portal`

Permissões:

- `admin`: apenas no próprio tenant
- `super_user`: pode informar `tenantId` e atuar conforme permissões de tenant

### Ação de webhook (secret obrigatório)

- `ingest_webhook`
- Header obrigatório: `x-billing-webhook-secret: <BILLING_WEBHOOK_SECRET>`

## Ações

### 1) `get_billing`

Request:

```json
{
  "action": "get_billing",
  "tenantId": "<uuid-opcional-para-super_user>"
}
```

Response (200):

```json
{
  "success": true,
  "tenantId": "...",
  "state": {
    "access_allowed": true,
    "billing_status": "active",
    "grace_until": null,
    "current_period_end": "2026-03-24T00:00:00.000Z",
    "subscription_id": "..."
  },
  "subscription": {
    "id": "...",
    "status": "active",
    "payment_status": "paid"
  }
}
```

### 2) `list_invoices`

Request:

```json
{
  "action": "list_invoices",
  "tenantId": "<uuid-opcional-para-super_user>",
  "limit": 20
}
```

### 3) `upsert_subscription`

Request:

```json
{
  "action": "upsert_subscription",
  "tenantId": "<uuid-opcional-para-super_user>",
  "data": {
    "status": "past_due",
    "payment_status": "failed",
    "provider_subscription_id": "sub_123",
    "currency": "EUR",
    "amount_cents": 4900,
    "current_period_end": "2026-03-24T00:00:00.000Z",
    "grace_until": "2026-03-31T00:00:00.000Z"
  }
}
```

Status suportados:

- `trialing`
- `active`
- `past_due`
- `unpaid`
- `canceled`
- `incomplete`
- `incomplete_expired`

### 4) `ingest_webhook` (idempotente)

Request mínimo:

```json
{
  "action": "ingest_webhook",
  "provider": "stripe",
  "eventId": "evt_123",
  "eventType": "invoice.payment_failed",
  "payload": {
    "id": "evt_123",
    "type": "invoice.payment_failed",
    "data": {
      "object": {
        "id": "in_123",
        "subscription": "sub_123",
        "status": "open",
        "currency": "eur",
        "amount_due": 4900,
        "amount_paid": 0,
        "amount_remaining": 4900,
        "metadata": {
          "tenant_id": "<tenant-uuid>"
        }
      }
    }
  }
}
```

Notas:

- Dedupe por `(provider, event_id)` na tabela `billing_webhook_events`.
- `tenant_id` pode vir em `tenantId` ou em `payload.data.object.metadata.tenant_id`.

### 5) `create_checkout_session` (Stripe)

Request:

```json
{
  "action": "create_checkout_session",
  "tenantId": "<uuid-opcional-para-super_user>",
  "data": {
    "planCode": "pro",
    "priceId": "price_123",
    "quantity": 1
  },
  "successUrl": "https://app.exemplo.pt/?billing=success",
  "cancelUrl": "https://app.exemplo.pt/?billing=cancel"
}
```

Response (200):

```json
{
  "success": true,
  "provider": "stripe",
  "tenantId": "...",
  "customerId": "cus_...",
  "checkoutSessionId": "cs_...",
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

Observações:

- `priceId` tem precedência sobre `planCode`.
- Se `planCode` for usado, o sistema tenta `billing_plans.metadata.stripe_price_id`.
- Fallback final: `STRIPE_DEFAULT_PRICE_ID`.

### 6) `create_billing_portal` (Stripe)

Request:

```json
{
  "action": "create_billing_portal",
  "tenantId": "<uuid-opcional-para-super_user>",
  "returnUrl": "https://app.exemplo.pt/?billing=portal"
}
```

Response (200):

```json
{
  "success": true,
  "provider": "stripe",
  "tenantId": "...",
  "customerId": "cus_...",
  "portalUrl": "https://billing.stripe.com/..."
}
```

## Variáveis de ambiente

Obrigatórias:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Webhook:

- `BILLING_WEBHOOK_SECRET`
- `STRIPE_WEBHOOK_SECRET` (obrigatório no endpoint dedicado `/api/stripe-webhook`)
- `STRIPE_WEBHOOK_TOLERANCE_SEC` (opcional, default 300)

Stripe (checkout/portal):

- `STRIPE_SECRET_KEY`
- `STRIPE_DEFAULT_PRICE_ID` (opcional, usado como fallback)
- `APP_BASE_URL` ou `PUBLIC_APP_URL` (opcional, usado para URLs padrão de retorno)

## Webhook Stripe dedicado

O endpoint `POST /api/stripe-webhook` valida assinatura `Stripe-Signature` e processa eventos de forma idempotente.

- Validação HMAC SHA-256 com base em `STRIPE_WEBHOOK_SECRET`
- Tolerância de timestamp via `STRIPE_WEBHOOK_TOLERANCE_SEC`
- Persistência em `billing_webhook_events` (provider=`stripe`)
- Upsert de assinatura/fatura por tenant quando `tenant_id` está presente no metadata

Exemplo com Stripe CLI:

```bash
stripe listen --forward-to http://localhost:3000/api/stripe-webhook
```

Para desenvolvimento local com servidor auth em `:4002`, use:

```bash
stripe listen --forward-to http://localhost:4002/api/stripe-webhook
```

## Smoke pós-rotação de chave

Após rotacionar `SUPABASE_SERVICE_ROLE_KEY`, execute um smoke rápido para validar autenticação e billing:

Modo seguro (não faz revoke da sessão no fim):

```bash
npm run smoke:service-role:rotation:no-revoke
```

Modo completo (inclui revoke ao final):

```bash
npm run smoke:service-role:rotation
```

Script usado:

- `scripts/smoke-service-role-rotation.ps1`

Para passar parâmetros customizados (ex.: base URL/credenciais), prefira chamar o PowerShell diretamente:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/smoke-service-role-rotation.ps1 -BaseUrl "http://localhost:4002" -Email "seu-email" -Password "sua-senha" -SkipRevoke
```

Validações executadas pelo smoke:

1. Login (`/api/login`)
2. Sessão validate (`/api/session`)
3. Listagem de tenants (`/api/session` com `action=list_tenants`)
4. Billing state (`/api/billing` com `action=get_billing`)
5. Faturas (`/api/billing` com `action=list_invoices`)

## Enforcements

- `billing_enforcement` (tabela `app_runtime_settings`) controla se inadimplência bloqueia acesso.
- `tenant_billing_state` e `tenant_billing_access_allowed` determinam o estado efetivo.
- `login/session` retornam `403` com `billing` quando tenant estiver bloqueado por cobrança.

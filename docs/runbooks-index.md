# Runbooks Operacionais (Índice)

Este índice centraliza os principais runbooks para operação de autenticação, tenant management, billing e validações pós-mudança.

## 1) Billing SaaS

- API e operação de cobrança: `docs/saas-billing-api.md`
  - Endpoints de billing (`/api/billing`)
  - Webhook Stripe dedicado (`/api/stripe-webhook`)
  - Smoke pós-rotação de `SUPABASE_SERVICE_ROLE_KEY`

## 2) Rollout de Banco (Super User)

- Checklist de rollout DB: `docs/super-user-db-rollout-checklist.md`
  - Ordem por ambiente (DEV/STAGING/PROD)
  - Verificações SQL pós-migration
  - Critérios de sucesso e rollback
  - Validação pós-rotação de service role key

## 3) Smoke Tests de Acesso Super User

- Guia de smoke de super user: `docs/super-user-access-smoke-test.md`

## 4) Smoke Tests de Tenant Management

- Guia de smoke de tenants: `docs/tenant-management-smoke-test.md`
  - Execução read-only
  - Execução com escrita idempotente
  - Smoke dedicado de menu por tenant (`tenant_menu_settings`)
  - Wrapper com geração de relatório

## 5) Scripts úteis (atalhos npm)

- `npm run smoke:super-user:read`
- `npm run smoke:super-user:write`
- `npm run smoke:tenants:read`
- `npm run smoke:tenants:write`
- `npm run smoke:tenants:report`
- `npm run smoke:tenants:menu:read`
- `npm run smoke:tenants:menu:write`
- `npm run smoke:service-role:rotation:no-revoke`
- `npm run smoke:service-role:rotation`

## 6) Ordem recomendada após mudanças críticas

1. Aplicar migration SQL (quando aplicável).
2. Executar checks SQL pós-migration.
3. Rodar smoke read-only de super user/tenants.
4. Se houve rotação de chave, rodar smoke de service role.
5. Confirmar logs/erros e registrar evidência em `docs/reports/`.

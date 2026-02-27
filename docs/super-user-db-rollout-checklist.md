# Super User DB Rollout Checklist

Checklist rápido para aplicar e validar a base de dados do fluxo de super usuário multi-tenant.

## 1) Ordem recomendada por ambiente

1. **DEV**
   - Aplicar: `sql/2026-02-23-add-super-user-cross-tenant-access.sql`
   - Validar: `sql/2026-02-23-super-user-post-migration-check.sql`
   - Rodar smoke API read-only: `npm run smoke:super-user:read`
2. **STAGING**
   - Repetir aplicação e validações
   - Executar smoke read-only com credenciais de staging
3. **PROD**
   - Janela de mudança
   - Aplicar migration
   - Executar check pós-migração
   - Smoke read-only

## 2) Objetos que devem existir após migration

- Tabela: `public.user_tenant_access`
- Coluna: `public.user_sessions.active_tenant_id`
- Tabela: `public.super_user_audit_log`
- Função: `public.user_can_access_tenant(bigint, uuid)`

## 3) Verificações mínimas (SQL)

No Supabase SQL Editor, execute:

- `sql/2026-02-23-super-user-post-migration-check.sql`

Resultado esperado:

- Objetos existentes (`true`/nome da relação)
- Índices listados
- `sessions_without_active_tenant_but_with_tenant = 0`

## 4) Validação funcional pós-DB

### Read-only (recomendado)

```powershell
$env:SUPER_USER_EMAIL="aislei@outlook.com.br"
$env:SUPER_USER_PASSWORD="password"
npm run smoke:super-user:read
```

### Escrita (somente DEV/STAGING)

```powershell
$env:SUPER_USER_EMAIL="aislei@outlook.com.br"
$env:SUPER_USER_PASSWORD="password"
npm run smoke:super-user:write -- -TargetUserId 123 -TenantId "uuid-do-tenant"
```

## 5) Critérios de sucesso para produção

- Migration aplicada sem erro
- Check pós-migração sem inconsistências
- Smoke read-only concluído
- Smoke pós-rotação de `SUPABASE_SERVICE_ROLE_KEY` concluído
- Build da aplicação OK

## 6) Validação pós-rotação de chave service role

Após rotacionar `SUPABASE_SERVICE_ROLE_KEY`, execute:

### Modo seguro (não revoga sessão ao final)

```powershell
npm run smoke:service-role:rotation:no-revoke
```

### Modo completo (revoga sessão ao final)

```powershell
npm run smoke:service-role:rotation
```

Script utilizado:

- `scripts/smoke-service-role-rotation.ps1`

Validações executadas:

1. Login (`/api/login`)
2. Sessão validate (`/api/session`)
3. Listagem de tenants (`/api/session`, `action=list_tenants`)
4. Billing state (`/api/billing`, `action=get_billing`)
5. Faturas (`/api/billing`, `action=list_invoices`)

## 7) Rollback (se necessário)

A migration é aditiva (tabelas/coluna/função/índices). Em incidente:

1. Reverter deploy de aplicação
2. Bloquear uso de ações de grant/revoke no backend
3. Investigar e corrigir em staging antes de retomar rollout

> Observação: rollback destrutivo de schema em produção deve ser avaliado com cuidado por impacto de dados/auditoria.

## 8) Troubleshooting comum

### Erro `users_role_check` ao promover para `super_user`

Se aparecer erro como:

`violates check constraint "users_role_check"`

Execute antes:

- `sql/2026-02-23-repair-users-role-check-super-user.sql`

Depois refaça o update de promoção para `super_user`.

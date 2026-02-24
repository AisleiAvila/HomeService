# Tenant Management Smoke Test

Este roteiro valida a nova funcionalidade de gestão de tenant (`/api/tenants`) para os perfis permitidos (`admin` e `super_user`).

## Pré-requisitos

- Backend local ativo: `npm run auth:server`
- Migração SQL aplicada:
  - `sql/2026-02-23-add-tenant-profile-management.sql`
  - `sql/2026-02-23-migrate-tenant-logo-to-image-data.sql`
  - `sql/2026-02-23-drop-legacy-tenant-logo-url.sql`
- Função SQL existente: `public.user_can_edit_tenant`
- PowerShell 5.1+

## Credenciais (opcional via env)

- `SUPER_USER_EMAIL` / `SUPER_USER_PASSWORD` (obrigatório para executar)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` (opcional para validar admin)
- `PROFESSIONAL_EMAIL` / `PROFESSIONAL_PASSWORD` (opcional para validar bloqueio)

## Scripts

- Execução direta: `scripts/smoke-tenants-management.ps1`
- Wrapper com relatório: `scripts/smoke-tenants-management-report.ps1`

## Execução (somente leitura)

```powershell
$env:SUPER_USER_EMAIL="seu-super-user@email.com"
$env:SUPER_USER_PASSWORD="SUA_SENHA"
npm run smoke:tenants:read
```

ou com credenciais explícitas:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-tenants-management.ps1 `
  -SuperUserEmail "seu-super-user@email.com" `
  -SuperUserPassword "SUA_SENHA"
```

## Execução com relatório

```powershell
npm run smoke:tenants:report
```

Relatório gerado em: `docs/reports/tenant-management-smoke-report-YYYYMMDD-HHMMSS.md`

## Execução com escrita (idempotente)

```powershell
npm run smoke:tenants:write
```

> Com `-RunWriteActions`, o script envia `update_profile` com os mesmos dados atuais (sem alteração efetiva esperada).

Para gerar relatório em modo escrita:

```powershell
npm run smoke:tenants:report:write
```

## O que é validado

1. `super_user` consegue `list_tenants`.
2. `super_user` consegue `get_profile` para tenant alvo.
3. (Opcional) `super_user` consegue `update_profile`.
4. (Opcional) `admin` consegue `get_profile` sem `tenantId` explícito.
5. (Opcional) `admin` é bloqueado ao tentar informar `tenantId` arbitrário.
6. (Opcional) `professional` recebe `403` no endpoint.

## Troubleshooting

- Erro de conexão (`Unable to connect to the remote server`):
  - Inicie backend local com `npm run auth:server`.
- Erro de permissão para admin/super_user:
  - Confirme que a migração foi aplicada e a função `user_can_edit_tenant` existe.
- Falha em escrita com `update_profile`:
  - Verifique constraints de `contact_email`, `postal_code` e `logo_image_data` no schema de `tenants`.

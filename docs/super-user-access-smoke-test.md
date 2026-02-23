# Super User Access Smoke Test

Este roteiro valida os endpoints de gestão de acesso do super usuário sem depender da UI.

## Pré-requisitos

- Backend local ativo: `node scripts/custom_auth_backend.cjs`
- Usuário com role `super_user`
- PowerShell 5.1+
- Variáveis de ambiente (opcional, para evitar credenciais na linha de comando):
  - `SUPER_USER_EMAIL`
  - `SUPER_USER_PASSWORD`
- Opcional: token de sessão já emitido (`-Token`) para pular login

## Script

Arquivo: `scripts/smoke-super-user-access.ps1`

Wrapper one-shot com relatório: `scripts/smoke-super-user-report.ps1`

## Execução (somente leitura)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-super-user-access.ps1 `
  -Email "seu-super-user@email.com" `
  -Password "SUA_SENHA"
```

ou via variáveis de ambiente:

```powershell
$env:SUPER_USER_EMAIL="aislei@outlook.com.br"
$env:SUPER_USER_PASSWORD="password"
npm run smoke:super-user:read
```

## Execução one-shot com relatório Markdown

```powershell
$env:SUPER_USER_EMAIL="aislei@outlook.com.br"
$env:SUPER_USER_PASSWORD="password"
npm run smoke:super-user:report
```

Saída do relatório:

- Pasta: `docs/reports`
- Arquivo: `super-user-smoke-report-YYYYMMDD-HHMMSS.md`

Para modo com escrita no one-shot:

```powershell
npm run smoke:super-user:report -- -RunWriteActions -TargetUserId 123 -TenantId "uuid-do-tenant"
```

ou via token já emitido:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-super-user-access.ps1 `
  -Token "SEU_TOKEN_DE_SESSAO"
```

Valida as ações:

- `list_users`
- `list_audit`
- `get_user_tenants`
- `list_tenants` (via `/api/session`)

## Execução com escrita (grant/revoke)

> Use apenas em ambiente de desenvolvimento.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-super-user-access.ps1 `
  -Email "seu-super-user@email.com" `
  -Password "SUA_SENHA" `
  -TargetUserId 123 `
  -TenantId "uuid-do-tenant" `
  -RunWriteActions
```

ou usando `npm` (com variáveis de ambiente já definidas):

```powershell
$env:SUPER_USER_EMAIL="seu-super-user@email.com"
$env:SUPER_USER_PASSWORD="SUA_SENHA"
npm run smoke:super-user:write -- -TargetUserId 123 -TenantId "uuid-do-tenant"
```

Com `-RunWriteActions`, também executa:

- `grant_access`
- `revoke_access`
- `list_audit` final para confirmar trilha

## Observações

- Sem `-RunWriteActions`, o script é não destrutivo.
- Se `-TargetUserId` não for informado, usa o primeiro `super_user` retornado por `list_users`.
- Com `-RunWriteActions`, `-TenantId` é obrigatório.
- Se `-Token` for informado, o login é ignorado.
- Se `-Token` não for informado, o script usa `-Email/-Password` ou fallback para `SUPER_USER_EMAIL` e `SUPER_USER_PASSWORD`.
- O wrapper de relatório não grava credenciais nem token no Markdown final.

## Troubleshooting

### Erro: `Authenticated role 'admin' is not allowed`

Causa: a conta autenticada não possui role `super_user`.

Solução:

1. Execute `sql/2026-02-23-super-user-bootstrap.sql` no Supabase SQL Editor.
2. Verifique se existe ao menos um `super_user` ativo.
3. Se necessário, promova uma conta `admin` para `super_user` (queries já comentadas no arquivo).
4. Rode novamente:

```powershell
npm run smoke:super-user:report
```

### Erro: `Unable to connect to the remote server`

Causa comum: backend local de auth não está ativo na porta `4002`.

Solução:

```powershell
npm run auth:server
```

Depois, reexecute o smoke report.

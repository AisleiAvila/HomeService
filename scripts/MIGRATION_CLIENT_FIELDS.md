# Migração: Adicionar Campos do Solicitante

## Problema

A tabela `service_requests` não possui os campos para armazenar as informações do solicitante do serviço.

## Solução

Este script SQL adiciona os seguintes campos à tabela `service_requests`:

- **client_name** (TEXT) - Nome do solicitante
- **client_phone** (TEXT) - Telefone do solicitante
- **client_nif** (TEXT) - NIF do solicitante (opcional)
- **client_email** (TEXT) - Email do solicitante

**Nota:** Os dados de endereço do serviço já existem na tabela nos campos: `street`, `street_number`, `complement`, `city`, `state`, `zip_code`, `latitude`, `longitude`

## Como Executar

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá para **SQL Editor** no menu lateral
4. Clique em **New Query**
5. Copie e cole o conteúdo do arquivo `add_client_fields_to_service_requests.sql`
6. Clique em **Run** ou pressione `Ctrl+Enter`

### Opção 2: Via CLI do Supabase

```bash
supabase db reset
# ou
supabase db push
```

### Opção 3: Via psql

```bash
psql -h [seu-host] -U [seu-usuario] -d [seu-banco] -f scripts/add_client_fields_to_service_requests.sql
```

## Verificação

Após executar o script, você pode verificar se os campos foram adicionados executando:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'service_requests'
AND column_name IN ('client_name', 'client_phone', 'client_nif', 'client_email')
ORDER BY column_name;
```

## Impacto

- ✅ **Sem impacto em dados existentes** - O script apenas adiciona novas colunas
- ✅ **Retrocompatível** - Todos os campos são opcionais (nullable)
- ✅ **Performance** - Adiciona índices para otimizar buscas
- ⚠️ **Atenção** - Após executar o script, os dados do solicitante serão salvos diretamente na tabela `service_requests` em vez de serem referenciados da tabela `users`

## Rollback (Se necessário)

Para reverter as alterações:

```sql
ALTER TABLE service_requests DROP COLUMN IF EXISTS client_name;
ALTER TABLE service_requests DROP COLUMN IF EXISTS client_phone;
ALTER TABLE service_requests DROP COLUMN IF EXISTS client_nif;
ALTER TABLE service_requests DROP COLUMN IF EXISTS client_email;

DROP INDEX IF EXISTS idx_service_requests_client_phone;
DROP INDEX IF EXISTS idx_service_requests_client_nif;
```

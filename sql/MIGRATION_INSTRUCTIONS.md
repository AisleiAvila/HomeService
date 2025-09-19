# Instruções para Executar a Migração SQL

## 🚨 Problema Encontrado

Erro ao executar `24_add_execution_date_approval_fields.sql`:

```
ERROR: 42P01: relation "profiles" does not exist
LINE 77: LEFT JOIN profiles cp ON sr.client_id = cp.id
```

## ✅ Solução Implementada

### Opção 1: Script Principal Corrigido

Execute: `sql/24_add_execution_date_approval_fields.sql`

- ✅ Corrigido: `profiles` → `users`
- ✅ View complexa comentada para evitar erros
- ✅ Log de migração simplificado

### Opção 2: Script Simplificado (Recomendado)

Execute: `sql/24_add_execution_date_approval_fields_simple.sql`

- ✅ Apenas campos essenciais
- ✅ Funções SQL incluídas
- ✅ Verificações de integridade
- ✅ Sem dependências complexas

### Opção 3: Teste Básico (Para Debug)

Execute primeiro: `sql/test_basic_migration.sql`

- ✅ Adiciona apenas os campos
- ✅ Testa estrutura básica
- ✅ Sem funções ou views

## 📋 Campos que Serão Adicionados

```sql
proposed_execution_date TIMESTAMPTZ NULL
proposed_execution_notes TEXT NULL
execution_date_proposed_at TIMESTAMPTZ NULL
execution_date_approval TEXT NULL
execution_date_approved_at TIMESTAMPTZ NULL
execution_date_rejection_reason TEXT NULL
```

## 🔄 Ordem de Execução Recomendada

1. **Verificar Estrutura** (opcional):

   ```sql
   \i sql/check_database_structure.sql
   ```

2. **Executar Migração**:

   ```sql
   \i sql/24_add_execution_date_approval_fields_simple.sql
   ```

3. **Verificar Sucesso**:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'service_requests'
   AND column_name LIKE '%execution%';
   ```

## 🧪 Como Testar Depois da Migração

```sql
-- Teste básico de inserção
UPDATE service_requests
SET proposed_execution_date = NOW() + INTERVAL '3 days',
    proposed_execution_notes = 'Teste de data proposta'
WHERE id = 1;

-- Verificar se funcionou
SELECT id, proposed_execution_date, proposed_execution_notes
FROM service_requests
WHERE proposed_execution_date IS NOT NULL;
```

## 🔧 Resolução de Problemas

### Se ainda der erro de tabela:

1. Verifique se `service_requests` existe:

   ```sql
   \dt service_requests
   ```

2. Liste todas as tabelas:

   ```sql
   \dt
   ```

3. Use o script de teste básico primeiro

### Se der erro de permissão:

- Execute como usuário com privilégios de ALTER TABLE
- Use `SUPERUSER` se necessário

## ✅ Validação Final

Após executar a migração, você deve ver:

- ✅ 6 novos campos na tabela `service_requests`
- ✅ 2 novas funções: `propose_execution_date()` e `respond_to_execution_date()`
- ✅ Índices para performance
- ✅ Mensagem de sucesso no log

---

**Status**: Migração pronta para execução  
**Versão**: 24  
**Data**: 19/09/2025

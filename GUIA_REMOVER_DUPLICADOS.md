# =====================================================

# GUIA: Como Remover Dados Duplicados

# =====================================================

## 🎯 PROBLEMA

A tabela `codigos_postais` tem dados duplicados devido à inserção dupla.

## ⚠️ IMPORTANTE

**SEMPRE faça backup antes de deletar dados!**

## 🔍 PASSO 1: Identificar Duplicados

Execute no SQL Editor do Supabase:

```sql
-- Arquivo: sql\11_identificar_duplicados.sql
```

Isso mostrará:

- Total de registros atual
- Quantos são únicos
- Quantos são duplicados

## 🛡️ PASSO 2: Fazer Backup

Execute:

```sql
CREATE TABLE codigos_postais_backup AS
SELECT * FROM codigos_postais;
```

## 🧹 PASSO 3: Limpar Duplicados

### OPÇÃO A: Método Rápido (RECOMENDADO)

Execute o arquivo: `sql\14_limpeza_duplicados_rapida.sql`

### OPÇÃO B: Método Seguro (Passo a passo)

Execute o arquivo: `sql\12_remover_duplicados_seguro.sql`

### OPÇÃO C: Método DELETE

Execute o arquivo: `sql\13_remover_duplicados_delete.sql`

## ✅ PASSO 4: Verificar Resultado

Execute:

```sql
-- Verificar se não há mais duplicados
SELECT
    codigo_postal_completo,
    COUNT(*) as total
FROM codigos_postais
GROUP BY codigo_postal_completo
HAVING COUNT(*) > 1
LIMIT 10;

-- Se retornar 0 linhas = SUCCESS!
```

## 🎯 RESUMO DOS ARQUIVOS

1. **`11_identificar_duplicados.sql`** - Diagnosticar problema
2. **`12_remover_duplicados_seguro.sql`** - Método seguro com temp table
3. **`13_remover_duplicados_delete.sql`** - Método com DELETE
4. **`14_limpeza_duplicados_rapida.sql`** - Método rápido (RECOMENDADO)

## 🚀 RECOMENDAÇÃO

Use o **arquivo 14** - é o mais simples e eficiente para o Supabase.

## 📊 Resultado Esperado

Antes: ~200.000 registros (duplicados)
Depois: ~100.000 registros (únicos)

## 🔄 Se Algo Der Errado

Para restaurar o backup:

```sql
DROP TABLE codigos_postais;
ALTER TABLE codigos_postais_backup RENAME TO codigos_postais;
```

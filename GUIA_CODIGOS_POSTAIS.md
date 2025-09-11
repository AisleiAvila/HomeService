# =====================================================

# GUIA COMPLETO: Como Inserir Códigos Postais

# =====================================================

## 🎯 OPÇÕES DISPONÍVEIS (escolha uma)

### ✅ OPÇÃO 1: Interface CSV do Supabase (MAIS FÁCIL)

1. No Dashboard do Supabase:
   - Vá para "Table Editor"
   - Clique na tabela `codigos_postais`
   - Clique "Insert" → "Import data from CSV"
   - Selecione: `C:\Users\aisle\Downloads\codigos_postais.csv`
   - Mapeie as colunas automaticamente
   - Clique "Import"

### ✅ OPÇÃO 2: Converter CSV para SQL (AUTOMÁTICA)

Execute este comando no PowerShell:

```powershell
.\scripts\convert_csv_to_sql.ps1
```

Depois execute o arquivo gerado no SQL Editor em lotes.

### ✅ OPÇÃO 3: Inserção Manual por Lotes

1. Abra: `sql\09_insert_codigos_postais_batch.sql`
2. Execute no SQL Editor do Supabase
3. Adicione mais dados seguindo o padrão

### ✅ OPÇÃO 4: Comando COPY (se tiver psql)

Execute: `sql\08_import_codigos_postais_copy.sql`

## 🚀 RECOMENDAÇÃO

**Use a OPÇÃO 1** - É a mais simples e eficiente para o Supabase.

Se não funcionar, use a **OPÇÃO 2** para gerar os INSERTs automaticamente.

## 📋 STATUS ATUAL

- ✅ Tabelas criadas
- ✅ Índices criados
- ✅ Distritos inseridos
- ✅ Concelhos inseridos
- ✅ Funções e views criadas
- ⏳ **FALTA: Códigos postais**

## 🔗 Links Úteis

- Dashboard Supabase: https://supabase.com/dashboard
- Seu projeto: https://supabase.com/dashboard/project/uqrvenlkquheajuveggv

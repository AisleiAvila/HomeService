# =====================================================

# INSTRUÇÕES PARA EXECUÇÃO SEM POSTGRESQL CLIENT

# =====================================================

## 🎯 PROBLEMA IDENTIFICADO

O comando `psql` (PostgreSQL client) não está instalado no seu sistema.
O script original requer esta ferramenta para conectar ao banco de dados.

## 🚀 SOLUÇÕES DISPONÍVEIS

### ✅ SOLUÇÃO 1: SQL Editor do Supabase (RECOMENDADA)

1. **Acesse o Dashboard do Supabase:**

   - Vá para: https://supabase.com/dashboard
   - Entre no seu projeto: uqrvenlkquheajuveggv

2. **Abra o SQL Editor:**

   - No menu lateral, clique em "SQL Editor"
   - Clique em "New Query"

3. **Execute os scripts na ordem:**

   **Passo 1:** Copie e cole o conteúdo de `sql\01_create_tables_portugal_addresses.sql`
   **Passo 2:** Copie e cole o conteúdo de `sql\02_create_indexes_portugal_addresses.sql`
   **Passo 3:** Copie e cole o conteúdo de `sql\03_insert_distritos.sql`
   **Passo 4:** Copie e cole o conteúdo de `sql\04_insert_concelhos.sql`
   **Passo 5:** Copie e cole o conteúdo de `sql\06_configure_rls_policies.sql`
   **Passo 6:** Copie e cole o conteúdo de `sql\07_create_functions_views.sql`

4. **Para importar códigos postais:**
   - Use a funcionalidade "Import data from CSV" no Supabase
   - Ou execute o script `sql\05_insert_codigos_postais.sql`

### ✅ SOLUÇÃO 2: Instalar PostgreSQL Client

Se quiser usar o script PowerShell original:

1. **Baixe PostgreSQL:**

   - Vá para: https://www.postgresql.org/download/windows/
   - Baixe e instale o PostgreSQL (incluirá o psql)

2. **Adicione ao PATH:**

   - Adicione `C:\Program Files\PostgreSQL\XX\bin` ao PATH do Windows
   - Substitua XX pela versão instalada

3. **Teste a instalação:**

   ```powershell
   psql --version
   ```

4. **Execute o script original:**
   ```powershell
   .\scripts\import_portugal_addresses.ps1 -SupabaseUrl "https://uqrvenlkquheajuveggv.supabase.co" -SupabasePassword "Ingres@01"
   ```

### ✅ SOLUÇÃO 3: Script via API REST (EXPERIMENTAL)

Use o script alternativo que criei:

```powershell
.\scripts\import_portugal_addresses_api.ps1 -SupabaseUrl "https://uqrvenlkquheajuveggv.supabase.co" -SupabaseServiceKey "SUA_SERVICE_KEY"
```

⚠️ **NOTA:** Para esta solução, você precisa da Service Key (não a senha do banco).

## 🔑 ONDE ENCONTRAR A SERVICE KEY

1. Acesse o Dashboard do Supabase
2. Vá em "Settings" > "API"
3. Copie a "service_role" key (não a "anon" key)

## 📋 RESUMO - EXECUTAR AGORA

**MAIS FÁCIL:** Use o SQL Editor do Supabase e execute os scripts manualmente.

**LOCALIZAÇÃO DOS ARQUIVOS:**

- Todos os scripts SQL estão na pasta: `sql\`
- Execute na ordem: 01, 02, 03, 04, 06, 07
- Para códigos postais: use 05 ou importação CSV

**COMANDO QUE TENTOU EXECUTAR:**

```powershell
# Este comando falhou porque psql não está instalado
.\scripts\import_portugal_addresses.ps1 -SupabaseUrl "https://uqrvenlkquheajuveggv.supabase.co" -SupabasePassword "Ingres@01"
```

**ONDE EXECUTAR:** No PowerShell, a partir da pasta:

```
C:\Users\aisle\Documents\Ambiente\HomeService
```

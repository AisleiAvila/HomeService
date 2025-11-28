# Correção do Erro de RLS em Subcategorias

## 🔴 Problema

```
new row violates row-level security policy for table "service_subcategories"
```

Este erro ocorre porque a tabela `service_subcategories` tem RLS (Row-Level Security) ativado, mas **não possui políticas (policies) configuradas** para permitir operações de INSERT, UPDATE ou DELETE.

## ✅ Solução

Você tem **duas opções** de políticas RLS para aplicar:

### Opção 1: Apenas Administradores (RECOMENDADO)

📁 Arquivo: `sql/fix_subcategories_rls.sql`

**Use este se:** Apenas administradores devem poder criar/editar/deletar subcategorias.

**Políticas aplicadas:**

- ✅ SELECT: Todos os usuários autenticados podem ler
- 🔒 INSERT: Apenas admins podem criar
- 🔒 UPDATE: Apenas admins podem editar
- 🔒 DELETE: Apenas admins podem deletar

### Opção 2: Todos Usuários Autenticados

📁 Arquivo: `sql/fix_subcategories_rls_permissive.sql`

**Use este se:** Qualquer usuário autenticado pode gerenciar subcategorias.

**Políticas aplicadas:**

- ✅ SELECT: Todos os usuários autenticados podem ler
- ✅ INSERT: Todos os usuários autenticados podem criar
- ✅ UPDATE: Todos os usuários autenticados podem editar
- ✅ DELETE: Todos os usuários autenticados podem deletar

## 📋 Como Aplicar

### Passo 1: Acessar o Supabase

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto HomeService
3. No menu lateral, clique em **SQL Editor**

### Passo 2: Escolher e Executar o Script

1. Escolha qual opção você prefere (Admin-only ou Permissiva)
2. Abra o arquivo SQL correspondente neste projeto
3. Copie **TODO o conteúdo** do arquivo
4. Cole no SQL Editor do Supabase
5. Clique em **RUN** ou pressione `Ctrl+Enter`

### Passo 3: Verificar

Após executar, você verá duas tabelas de resultado:

**Tabela 1: Policies criadas**

```
policyname                                          | cmd
----------------------------------------------------|--------
Allow authenticated select on service_subcategories | SELECT
Allow admin insert on service_subcategories         | INSERT
Allow admin update on service_subcategories         | UPDATE
Allow admin delete on service_subcategories         | DELETE
```

**Tabela 2: RLS Status**

```
tablename              | rowsecurity
-----------------------|-------------
service_subcategories  | true
```

### Passo 4: Testar

1. Volte para a aplicação HomeService
2. Faça login como **admin**
3. Tente criar uma subcategoria novamente
4. ✅ Deve funcionar sem erros!

## 🔍 Verificação Manual (Opcional)

Se quiser verificar as policies manualmente, execute no SQL Editor:

```sql
SELECT
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'service_subcategories';
```

## ⚠️ Importante

- Se você escolheu a **Opção 1** (Admin-only), certifique-se de que o usuário tem `role = 'admin'` na tabela `profiles`
- As policies verificam o campo `profiles.role` para determinar permissões
- O RLS protege os dados mesmo que alguém tente fazer requisições diretas à API do Supabase

## 🛠️ Troubleshooting

### Ainda recebo o erro após aplicar o script

1. Verifique se você está logado como admin: `SELECT role FROM profiles WHERE id = auth.uid();`
2. Verifique se as policies foram criadas: Execute a query de verificação acima
3. Limpe o cache do navegador e faça logout/login novamente

### Não vejo as policies criadas

1. Certifique-se de executar TODO o script (incluindo os DROPs no início)
2. Verifique se não há erros de sintaxe na execução
3. Tente executar uma policy por vez para identificar problemas

### Erro "permission denied"

- Você precisa ter privilégios de superuser/service_role para criar policies
- Execute o script usando a conexão padrão do SQL Editor (que já tem permissões adequadas)

## 📚 Referências

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Policy Documentation](https://www.postgresql.org/docs/current/sql-createpolicy.html)

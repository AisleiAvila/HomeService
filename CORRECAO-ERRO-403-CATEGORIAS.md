# 🔧 Correção do Erro 403 ao Buscar Categorias

## 📋 Problema Identificado

O erro `POST https://...supabase.co/rest/v1/service_categories?select=id%2Cname 403 (Forbidden)` ocorre porque:

1. A tabela `service_categories` tem **RLS (Row Level Security) ativo**
2. **Não existem políticas RLS** configuradas para permitir leitura
3. Sem políticas de SELECT, todas as queries são bloqueadas com erro 403

## ✅ Solução

Execute o script SQL `sql/service_categories-policies.sql` no Supabase para criar as políticas necessárias.

### Passo a Passo

#### 1️⃣ Acessar o Supabase SQL Editor

1. Abra o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto **HomeService**
3. No menu lateral, clique em **SQL Editor**

#### 2️⃣ Executar o Script

1. Clique no botão **"+ New query"**
2. Abra o arquivo `sql/service_categories-policies.sql` deste repositório
3. Copie todo o conteúdo do arquivo
4. Cole no SQL Editor do Supabase
5. Clique em **"Run"** (ou pressione `Ctrl+Enter`)

#### 3️⃣ Verificar Sucesso

Após executar, você deve ver mensagens de sucesso como:

```
✓ ALTER TABLE
✓ CREATE POLICY (5 vezes)
```

Execute as queries de verificação no final do script para confirmar:

```sql
-- Deve retornar 5 policies
SELECT policyname FROM pg_policies WHERE tablename = 'service_categories';

-- Deve retornar suas categorias
SELECT * FROM service_categories;
```

#### 4️⃣ Testar na Aplicação

1. Faça refresh no navegador (`F5`)
2. O erro 403 deve desaparecer
3. As categorias devem carregar normalmente

## 🔐 Políticas Criadas

### Leitura (SELECT)
- ✅ **Usuários autenticados** podem ler todas as categorias
- ✅ **Usuários anônimos** podem ler todas as categorias (útil para landing page)

### Escrita (INSERT/UPDATE/DELETE)
- 🔒 **Apenas administradores** (`role='admin'`) podem:
  - Criar novas categorias
  - Editar categorias existentes
  - Excluir categorias

## 🎯 Benefícios

1. **Resolve o erro 403** imediatamente
2. **Segurança adequada** - apenas admins modificam categorias
3. **Acesso público à leitura** - todos podem ver categorias disponíveis
4. **Consistente com subcategorias** - mesmo padrão de segurança

## 🐛 Troubleshooting

### Ainda vejo erro 403?

**Possível causa:** RLS pode não estar ativo na tabela

```sql
-- Verificar status do RLS
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'service_categories';

-- Se relrowsecurity = false, habilite:
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
```

### Erro "policy already exists"?

Significa que as policies já foram criadas. Use:

```sql
-- Remover policies existentes
DROP POLICY IF EXISTS "Allow authenticated users to read service_categories" ON public.service_categories;
-- (repita para todas as 5 policies)

-- Depois execute o script novamente
```

### Categorias não aparecem?

**Verifique se existem dados na tabela:**

```sql
SELECT COUNT(*) FROM service_categories;
```

Se retornar 0, insira categorias de exemplo (veja seção no final do script).

## 📝 Próximos Passos

Após resolver o erro 403:

1. ✅ Testar criação de categorias no painel admin
2. ✅ Verificar que clientes/profissionais podem **ler** mas não **modificar**
3. ✅ Testar formulário de pedido de serviço com categorias carregadas
4. ✅ Popular subcategorias associadas às categorias

## 📚 Referências

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Policies](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- Arquivo: `sql/service_categories-policies.sql`
- Arquivo relacionado: `sql/service_subcategories-policies.sql`

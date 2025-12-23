# 🔒 Corrigindo Permissões de Exclusão de Imagens

## ❌ Problema Identificado

Ao tentar excluir uma imagem, o usuário recebe mensagem de que não tem permissão. Isso ocorre devido a:

1. **Políticas RLS (Row Level Security)** no Supabase não configuradas corretamente
2. **Lógica de permissão** no código que verifica apenas quem fez upload

## ✅ Solução Implementada

### 1. **Ajuste no Código (`service-image.service.ts`)**

Foi atualizada a lógica de verificação de permissões para permitir exclusão por:

- ✅ Usuário que fez upload da imagem (`uploaded_by`)
- ✅ Admin da plataforma
- ✅ Cliente do pedido de serviço
- ✅ Profissional atribuído ao pedido de serviço

**Mudança no código:**

```typescript
// ANTES: Verificava apenas uploaded_by e admin
if (image.uploaded_by !== userId) {
  const currentUser = this.authService.appUser();
  if (currentUser?.role !== "admin") {
    throw new Error("Você não tem permissão para deletar esta imagem");
  }
}

// DEPOIS: Verifica múltiplas permissões
const isUploader = image.uploaded_by === userId;
const isAdmin = currentUser?.role === "admin";
const isClient = image.service_request?.client_id === userId;
const isProfessional = image.service_request?.professional_id === userId;

if (!isUploader && !isAdmin && !isClient && !isProfessional) {
  throw new Error("Você não tem permissão para deletar esta imagem");
}
```

### 2. **Políticas RLS no Supabase**

Foi criado o arquivo [`sql/rls-service-request-images.sql`](./sql/rls-service-request-images.sql) com políticas completas.

## 📋 Como Aplicar a Correção

### Passo 1: As mudanças no código já foram aplicadas ✅

O arquivo `service-image.service.ts` já foi atualizado automaticamente.

### Passo 2: Aplicar Políticas RLS no Supabase

Você precisa executar o script SQL no seu banco de dados Supabase:

#### **Opção A: Via Dashboard do Supabase (Recomendado)**

1. Acesse o [Dashboard do Supabase](https://app.supabase.com/)
2. Selecione seu projeto **HomeService**
3. Vá em **SQL Editor** (no menu lateral)
4. Clique em **New Query**
5. Cole o conteúdo do arquivo [`sql/rls-service-request-images.sql`](./sql/rls-service-request-images.sql)
6. Clique em **Run** para executar

#### **Opção B: Via CLI do Supabase**

```bash
# Se você usa Supabase CLI
supabase db push sql/rls-service-request-images.sql
```

### Passo 3: Testar a Funcionalidade

Após aplicar as políticas RLS:

1. Faça login como **cliente**
2. Acesse um pedido de serviço
3. Tente excluir uma imagem que você enviou ✅
4. Tente excluir uma imagem do profissional (se você for o cliente) ✅

Teste também como **profissional** e **admin** para garantir que as permissões estão corretas.

## 🔍 Verificar Políticas Aplicadas

Para verificar se as políticas foram criadas corretamente, execute no SQL Editor:

```sql
SELECT * FROM pg_policies WHERE tablename = 'service_request_images';
```

Você deve ver 4 políticas:

- `select_service_request_images`
- `insert_service_request_images`
- `update_service_request_images`
- `delete_service_request_images`

## 📝 Regras de Permissão

### ✅ Podem EXCLUIR imagens:

1. **Uploader**: Quem fez upload da imagem
2. **Cliente**: Cliente do pedido de serviço
3. **Profissional**: Profissional atribuído ao pedido
4. **Admin**: Administradores do sistema

### ❌ NÃO podem excluir:

- Usuários não relacionados ao pedido
- Usuários não autenticados
- Profissionais de outros pedidos

## 🛡️ Segurança

As políticas RLS garantem segurança em **nível de banco de dados**, mesmo que alguém tente acessar diretamente via API do Supabase, as regras serão aplicadas automaticamente.

## 📌 Importante

⚠️ **O código já está atualizado**, mas para que funcione completamente, você **DEVE executar o script SQL** no Supabase. Sem as políticas RLS corretas, o banco de dados pode bloquear a exclusão.

## 🎯 Próximos Passos

1. ✅ Código atualizado (já feito)
2. ⏳ **Execute o script SQL no Supabase** (você precisa fazer)
3. ✅ Teste a funcionalidade
4. ✅ Confirme que está funcionando

---

**Arquivos Modificados:**

- `src/services/service-image.service.ts` - Lógica de permissão atualizada
- `sql/rls-service-request-images.sql` - Políticas RLS criadas (NOVO)

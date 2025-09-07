# 🔐 Solução: Row Level Security (RLS) - Bucket Avatars

## 🚨 **PROBLEMA IDENTIFICADO**

Erro: `new row violates row-level security policy` (403 Unauthorized)

**Causa:** O bucket "avatars" existe, mas não tem políticas RLS configuradas para permitir uploads de usuários autenticados.

## 🛠️ **SOLUÇÃO: Configurar Políticas RLS**

### **📋 PASSO A PASSO:**

1. **Acesse:** https://app.supabase.com/projects
2. **Entre no projeto:** uqrvenlkquheajuveggv
3. **Vá em:** SQL Editor (menu lateral)
4. **Cole e execute** os comandos abaixo:

```sql
-- 1. Política para permitir SELECT público (visualizar imagens)
CREATE POLICY "Public access for avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- 2. Política para permitir INSERT (upload) para usuários autenticados
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Política para permitir UPDATE (substituir arquivo)
CREATE POLICY "Users can update own avatars" ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Política para permitir DELETE (remover arquivo)
CREATE POLICY "Users can delete own avatars" ON storage.objects
FOR DELETE
USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### **🎯 ALTERNATIVA MAIS SIMPLES (se a acima não funcionar):**

```sql
-- Política mais permissiva para desenvolvimento
DROP POLICY IF EXISTS "Public access for avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

-- Permitir tudo para usuários autenticados
CREATE POLICY "Allow all for authenticated users" ON storage.objects
FOR ALL
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Permitir SELECT público (para ver as imagens)
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');
```

### **🔧 OPÇÃO MAIS RÁPIDA: Via Interface (se preferir):**

1. **Supabase Dashboard** → Storage → avatars
2. **Clique em:** "Policies" (aba no topo)
3. **Create Policy** → "For INSERT" → "Allow access to authenticated users only"
4. **Create Policy** → "For SELECT" → "Allow access to everyone"
5. **Create Policy** → "For UPDATE" → "Allow access to authenticated users only"
6. **Create Policy** → "For DELETE" → "Allow access to authenticated users only"

## 🧪 **VERIFICAÇÃO**

Após configurar as políticas, teste no console:

```javascript
// Verificar políticas RLS
fetch(
  "https://uqrvenlkquheajuveggv.supabase.co/rest/v1/rpc/get_storage_policies",
  {
    headers: {
      apikey:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc",
    },
  }
)
  .then((r) => r.json())
  .then((data) => console.log("📋 Políticas RLS:", data))
  .catch((e) => console.log("ℹ️ Não foi possível verificar políticas"));
```

## 🎉 **RESULTADO ESPERADO**

Após configurar as políticas:

- ✅ Upload deve funcionar sem erro 403
- ✅ Imagens devem ser acessíveis publicamente
- ✅ Cada usuário só pode modificar seus próprios avatares

## ⚠️ **IMPORTANTE**

As políticas RLS são essenciais para:

- **Segurança:** Usuários só modificam seus próprios arquivos
- **Performance:** Acesso público para visualização
- **Compliance:** Controle de acesso adequado

---

**Execute o SQL acima no Supabase SQL Editor e teste novamente!** 🚀

# 🗂️ Configuração do Supabase Storage - Bucket de Avatares

## 🚨 **PROBLEMA IDENTIFICADO**

O erro `Bucket not found` indica que o bucket "avatars" não foi criado no Supabase Storage.

## 🛠️ **SOLUÇÕES (escolha uma):**

### **✅ SOLUÇÃO 1: Via Dashboard do Supabase (Recomendada)**

1. **Acesse:** https://app.supabase.com/projects
2. **Entre no projeto:** uqrvenlkquheajuveggv
3. **Vá em:** Storage → Create bucket
4. **Configure:**
   - **Name:** `avatars`
   - **Public bucket:** ✅ SIM (marcado)
   - **Clique em "Create bucket"**

**Nota:** O file size limit e MIME types são configurados automaticamente pelo código da aplicação.### **✅ SOLUÇÃO 2: Via Console do Navegador (Automática)**

Cole este código no console do navegador em `https://localhost:4200`:

```javascript
// Configurar bucket de avatares automaticamente
async function configurarBucketAvatares() {
  console.log("🗂️ Configurando bucket de avatares...");

  try {
    // Obter cliente Supabase da aplicação
    const authService = angular
      .element(document.body)
      .injector()
      .get("AuthService");

    if (!authService) {
      console.error("❌ Serviço de autenticação não encontrado");
      return;
    }

    // Listar buckets existentes
    const { data: buckets, error: listError } =
      await authService.supabase.client.storage.listBuckets();

    if (listError) {
      console.error("❌ Erro ao listar buckets:", listError);
      return;
    }

    console.log(
      "📋 Buckets existentes:",
      buckets.map((b) => b.name)
    );

    // Verificar se bucket 'avatars' já existe
    const avatarsBucket = buckets.find((bucket) => bucket.name === "avatars");

    if (avatarsBucket) {
      console.log('✅ Bucket "avatars" já existe!');
      return;
    }

    // Criar bucket
    console.log('🔨 Criando bucket "avatars"...');
    const { error: createError } =
      await authService.supabase.client.storage.createBucket("avatars", {
        public: true,
        allowedMimeTypes: [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
        ],
        fileSizeLimit: 2097152, // 2MB
      });

    if (createError) {
      console.error("❌ Erro ao criar bucket:", createError);

      if (createError.message.includes("permission")) {
        console.log(
          "💡 SOLUÇÃO: Use a Solução 1 (Dashboard do Supabase) - você precisa de permissões de admin"
        );
      }
      return;
    }

    console.log('🎉 Bucket "avatars" criado com sucesso!');
    console.log("✅ Agora você pode usar a funcionalidade de captura de foto!");
  } catch (error) {
    console.error("❌ Erro inesperado:", error);
    console.log("💡 SOLUÇÃO: Use a Solução 1 (Dashboard do Supabase)");
  }
}

configurarBucketAvatares();
```

### **✅ SOLUÇÃO 3: Política RLS (Row Level Security)**

Se o bucket existir mas ainda não funcionar, configure as políticas RLS:

**No Dashboard do Supabase:**

1. **Vá em:** Storage → avatars → Policies
2. **Crie política de SELECT:**
   ```sql
   CREATE POLICY "Public access for avatars" ON storage.objects
   FOR SELECT USING (bucket_id = 'avatars');
   ```
3. **Crie política de INSERT:**
   ```sql
   CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
   FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
   ```
4. **Crie política de UPDATE:**
   ```sql
   CREATE POLICY "Users can update own avatars" ON storage.objects
   FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
   ```

### **✅ SOLUÇÃO 4: Configuração Alternativa (Sem Storage)**

Se as soluções acima não funcionarem, modifique temporariamente para usar upload direto:

```javascript
// No console, desabilite upload temporariamente
localStorage.setItem("disable_avatar_upload", "true");
console.log("⚠️ Upload de avatar desabilitado temporariamente");
```

## 🎯 **TESTE APÓS CONFIGURAÇÃO**

1. **Configure o bucket** usando uma das soluções acima
2. **Recarregue** a página: `https://localhost:4200`
3. **Teste a câmera** novamente
4. **Capture uma foto**
5. **Verificar se funciona** sem erro 400

## 📋 **VERIFICAÇÃO**

Para verificar se o bucket foi criado corretamente:

```javascript
// Cole no console do navegador
navigator.mediaDevices
  .getUserMedia({ video: true })
  .then(async (stream) => {
    // Parar stream imediatamente
    stream.getTracks().forEach((track) => track.stop());

    // Verificar buckets
    const response = await fetch(
      "https://uqrvenlkquheajuveggv.supabase.co/storage/v1/bucket",
      {
        headers: {
          Authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc",
          apikey:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc",
        },
      }
    );

    const buckets = await response.json();
    console.log("📦 Buckets disponíveis:", buckets);

    const hasAvatars = buckets.some((b) => b.name === "avatars");
    console.log(
      hasAvatars
        ? "✅ Bucket avatars existe!"
        : "❌ Bucket avatars não encontrado"
    );
  })
  .catch(console.error);
```

---

**💡 RECOMENDAÇÃO:** Use a **Solução 1** (Dashboard do Supabase) pois é a mais confiável e segura!

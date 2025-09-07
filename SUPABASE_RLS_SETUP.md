# Configuração das Políticas RLS para Storage - HomeService

## Problema

O upload de avatares está falhando com erro 403 "row-level security policy" porque as políticas RLS não estão configuradas para o bucket 'avatars'.

## Solução

Execute os comandos SQL abaixo no Supabase SQL Editor:

### 1. Configurar RLS Policies para o bucket 'avatars'

```sql
-- Permitir que usuários autenticados vejam seus próprios avatares
CREATE POLICY "Users can view own avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Permitir que usuários autenticados façam upload de seus próprios avatares
CREATE POLICY "Users can upload own avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Permitir que usuários autenticados atualizem seus próprios avatares
CREATE POLICY "Users can update own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Permitir que usuários autenticados deletem seus próprios avatares
CREATE POLICY "Users can delete own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 2. Alternativa Simples (caso a estrutura de pastas seja complexa)

Se as políticas acima não funcionarem, use estas mais simples:

```sql
-- Política simples: qualquer usuário autenticado pode gerenciar avatares
CREATE POLICY "Authenticated users can manage avatars"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'avatars');
```

## Como Executar

1. Acesse o Supabase Dashboard
2. Vá para SQL Editor
3. Cole e execute os comandos SQL acima
4. Teste o upload de avatar no aplicativo

## Estrutura de Path Esperada

Com essas políticas, o path dos arquivos deve seguir o padrão:

- `{user_auth_id}/{filename}`
- Exemplo: `123e4567-e89b-12d3-a456-426614174000/profile-1234567890.jpg`

## Verificação

Após configurar as políticas, teste:

1. Faça login no aplicativo
2. Acesse o perfil
3. Tente fazer upload de uma foto via câmera ou arquivo
4. Verifique no console se não há mais erros 403

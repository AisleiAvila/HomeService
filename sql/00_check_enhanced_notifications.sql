-- Script para verificar a estrutura da tabela enhanced_notifications
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se a tabela existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'enhanced_notifications'
);

-- 2. Ver a estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'enhanced_notifications'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename, 
    rowsecurity
FROM pg_tables 
WHERE tablename = 'enhanced_notifications';

-- 4. Ver políticas de RLS existentes
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'enhanced_notifications';
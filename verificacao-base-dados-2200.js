/**
 * Script de verificação direta na base de dados
 * Verifica se o código postal 2200-001 existe
 */

console.log("🔍 VERIFICAÇÃO DIRETA NA BASE DE DADOS");
console.log("====================================");

console.log("\n📋 INFORMAÇÕES DO TESTE:");
console.log("Código postal testado: 2200-001");
console.log("Campo de busca: codigo_postal_completo");
console.log("Tabela principal: codigos_postais");

console.log("\n🧪 QUERIES PARA TESTAR NO SUPABASE SQL EDITOR:");

console.log("\n1️⃣ VERIFICAR SE O CÓDIGO EXISTE:");
console.log(`
SELECT * 
FROM codigos_postais 
WHERE codigo_postal_completo = '2200-001';
`);

console.log("\n2️⃣ VERIFICAR CÓDIGOS DA REGIÃO 2200:");
console.log(`
SELECT codigo_postal_completo, nome_localidade, cod_distrito, cod_concelho
FROM codigos_postais 
WHERE num_cod_postal = '2200'
ORDER BY codigo_postal_completo
LIMIT 10;
`);

console.log("\n3️⃣ VERIFICAR ESTRUTURA DA TABELA:");
console.log(`
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'codigos_postais' 
ORDER BY ordinal_position;
`);

console.log("\n4️⃣ VERIFICAR FOREIGN KEYS:");
console.log(`
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'codigos_postais';
`);

console.log("\n5️⃣ TESTE COM JOIN MANUAL:");
console.log(`
SELECT 
    cp.codigo_postal_completo,
    cp.nome_localidade,
    cp.desig_postal,
    d.nome_distrito,
    c.nome_concelho
FROM codigos_postais cp
LEFT JOIN distritos d ON cp.cod_distrito = d.cod_distrito
LEFT JOIN concelhos c ON cp.cod_distrito = c.cod_distrito 
    AND cp.cod_concelho = c.cod_concelho
WHERE cp.codigo_postal_completo = '2200-001';
`);

console.log("\n📊 POSSÍVEIS RESULTADOS:");
console.log("✅ Se encontrar dados: Problema está no código TypeScript");
console.log("❌ Se não encontrar: Código postal não foi inserido na tabela");
console.log("⚠️ Se erro de JOIN: Problema nas foreign keys ou estrutura");

console.log("\n🛠️ PRÓXIMOS PASSOS DEPENDENDO DO RESULTADO:");
console.log("1. Se dados existem: Verificar logs do browser console");
console.log("2. Se dados não existem: Verificar inserção de dados 2200");
console.log("3. Se JOIN falha: Corrigir estrutura das foreign keys");

console.log("\n🎯 IMPORTANTE:");
console.log("Execute essas queries no Supabase SQL Editor");
console.log("Copie os resultados para continuar o debug");

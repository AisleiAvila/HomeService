/**
 * Teste de validação específica para código postal 2200-001
 * Este teste vai verificar todos os passos da validação
 */

console.log("🧪 TESTE ESPECÍFICO PARA CÓDIGO POSTAL 2200-001");
console.log("==============================================");

// Simular o processo completo
const codigoTeste = "2200-001";

console.log("\n📋 PASSOS DE VALIDAÇÃO:");
console.log("1. Código informado pelo usuário:", codigoTeste);

// Simular normalização
function normalizeCodigoPostal(codigo) {
  if (!codigo) return null;

  let limpo = codigo.replace(/[^0-9-]/g, "");

  if (limpo.length === 7 && !limpo.includes("-")) {
    limpo = limpo.substring(0, 4) + "-" + limpo.substring(4);
  }

  if (!/^\d{4}-\d{3}$/.test(limpo)) {
    return null;
  }

  return limpo;
}

const normalizado = normalizeCodigoPostal(codigoTeste);
console.log("2. Código normalizado:", normalizado);

console.log("\n🔍 VERIFICAÇÕES:");
console.log("- Formato válido?", /^\d{4}-\d{3}$/.test(normalizado));
console.log("- Campo de busca na DB:", "codigo_postal_completo");
console.log("- Valor procurado:", normalizado);

console.log("\n📊 QUERY SIMULADA:");
console.log(`
SELECT 
    *,
    distrito:distritos!inner(codigo, nome),
    concelho:concelhos!inner(codigo, nome)
FROM codigos_postais 
WHERE codigo_postal_completo = '${normalizado}'
LIMIT 1
`);

console.log("\n⚡ POSSÍVEIS CAUSAS DO PROBLEMA:");
console.log("1. ❌ Código postal não existe na tabela codigos_postais");
console.log("2. ❌ Campo codigo_postal_completo tem formato diferente");
console.log("3. ❌ Problema nas JOINs com tabelas distrito/concelho");
console.log("4. ❌ Erro de conexão com Supabase");
console.log("5. ❌ RLS (Row Level Security) bloqueando a consulta");

console.log("\n🛠️ PRÓXIMOS PASSOS PARA DEBUG:");
console.log("1. Verificar se 2200-001 existe na tabela codigos_postais");
console.log("2. Verificar formato do campo codigo_postal_completo");
console.log("3. Testar query SQL diretamente no Supabase");
console.log("4. Verificar logs do browser no console");
console.log("5. Verificar se há políticas RLS ativas");

console.log("\n🎯 CÓDIGO PARA TESTAR NO SUPABASE SQL EDITOR:");
console.log(`
-- Teste 1: Verificar se o código existe
SELECT * FROM codigos_postais WHERE codigo_postal_completo = '2200-001';

-- Teste 2: Ver formato dos códigos próximos
SELECT codigo_postal_completo FROM codigos_postais 
WHERE codigo_postal_completo LIKE '2200%' 
ORDER BY codigo_postal_completo LIMIT 10;

-- Teste 3: Verificar dados da região 2200
SELECT cp.*, d.nome as distrito_nome, c.nome as concelho_nome
FROM codigos_postais cp
LEFT JOIN distritos d ON cp.distrito_codigo = d.codigo  
LEFT JOIN concelhos c ON cp.concelho_codigo = c.codigo
WHERE cp.codigo_postal_completo LIKE '2200%'
LIMIT 5;
`);

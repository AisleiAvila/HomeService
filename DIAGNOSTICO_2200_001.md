# 🔍 DIAGNÓSTICO: CÓDIGO POSTAL 2200-001 NÃO ENCONTRADO

## 📋 PROBLEMA REPORTADO

- **Código postal:** 2200-001
- **Comportamento:** Aplicação não consegue obter dados da tabela `codigos_postais`
- **Status:** Código existe na tabela mas não é encontrado pela aplicação

## 🛠️ CORREÇÕES APLICADAS

### 1. **Remoção de JOINs Problemáticos**

```typescript
// ❌ ANTES (com JOINs que podem falhar):
.select(`
  *,
  distrito:distritos!inner(codigo, nome),
  concelho:concelhos!inner(codigo, nome)
`)

// ✅ DEPOIS (consulta simples + consultas separadas):
.select("*")
// + consultas separadas para distrito e concelho
```

### 2. **Logs Detalhados Implementados**

- ✅ Log de conectividade com Supabase
- ✅ Log de contagem total de registros
- ✅ Log detalhado da busca
- ✅ Log de normalização do código postal

### 3. **Consultas Separadas para Relacionamentos**

```typescript
// Buscar distrito separadamente
const { data: distritoData } = await this.supabase.client
  .from("distritos")
  .select("nome_distrito")
  .eq("cod_distrito", data.cod_distrito)
  .single();

// Buscar concelho separadamente
const { data: concelhoData } = await this.supabase.client
  .from("concelhos")
  .select("nome_concelho")
  .eq("cod_distrito", data.cod_distrito)
  .eq("cod_concelho", data.cod_concelho)
  .single();
```

## 🧪 TESTES NECESSÁRIOS

### 1. **Teste no Browser Console**

1. Abrir aplicação no browser
2. Inserir código postal `2200-001`
3. Verificar logs no console:
   - `🔍 [DATABASE] Iniciando validateCodigoPostal para: 2200-001`
   - `✏️ [DATABASE] Código normalizado: 2200-001`
   - `📊 [DATABASE] Total de registros na tabela: [número]`
   - `📊 [DATABASE] Resultado da busca: [objeto ou null]`

### 2. **Teste Direto no Supabase**

Execute no SQL Editor do Supabase:

```sql
-- Verificar se o código existe
SELECT * FROM codigos_postais WHERE codigo_postal_completo = '2200-001';

-- Verificar códigos da região
SELECT codigo_postal_completo, nome_localidade
FROM codigos_postais
WHERE num_cod_postal = '2200'
LIMIT 10;
```

## 🎯 POSSÍVEIS CAUSAS

1. **❌ Código não foi inserido na tabela**
2. **❌ RLS (Row Level Security) bloqueando a consulta**
3. **❌ Problema de conectividade com Supabase**
4. **❌ Foreign keys mal configuradas**
5. **❌ Formato diferente do esperado**

## 📊 LOGS ESPERADOS (Se funcionar)

```
🔍 [DATABASE] Iniciando validateCodigoPostal para: 2200-001
✏️ [DATABASE] Código normalizado: 2200-001
📊 [DATABASE] Total de registros na tabela: 26543
🔍 [DATABASE] Iniciando getEnderecoByCodigoPostal para: 2200-001
✏️ [DATABASE] Código normalizado para busca: 2200-001
💾 [DATABASE] Executando query no Supabase...
📊 [DATABASE] Resposta do Supabase - data: {codigo_postal_completo: "2200-001", ...}
🔍 [DATABASE] Buscando distrito: XX
🔍 [DATABASE] Buscando concelho: XX XX
✅ [DATABASE] Endereço completo construído com sucesso
```

## 🚨 PRÓXIMOS PASSOS

1. **Teste imediato:** Inserir 2200-001 no formulário
2. **Verificar logs:** Console do browser
3. **Se falhar:** Executar queries SQL no Supabase
4. **Se SQL funcionar:** Problema é no código TypeScript
5. **Se SQL falhar:** Problema é nos dados inseridos

## 🔧 STATUS ATUAL

- ✅ **Código corrigido:** JOINs removidos, logs adicionados
- ✅ **Servidor iniciado:** Pronto para teste
- ⏳ **Aguardando teste:** Inserir 2200-001 na aplicação
- ⏳ **Verificação:** Logs do console do browser

# 🔍 Guia de Diagnóstico: Status History Não Sendo Gravado

## 📌 Problema Identificado

A tabela `service_requests_status` não está recebendo registros, mesmo que o código esteja chamando a inserção. O timeline de status mostra "Registros carregados: 0".

## 🎯 Etapas de Diagnóstico

### Etapa 1: Verificar Logs do Console (PRIORITÁRIO)

1. **Abra a aplicação** no navegador
2. **Abra o DevTools**: Pressione `F12` → Aba **Console**
3. **Crie uma nova solicitação de serviço** no formulário
4. **Observe os logs** procurando por:

#### Logs Esperados em Ordem:

```
🎯 [createServiceRequest] INICIANDO - adminId: [número] data: [objeto]
📝 [createServiceRequest] Novo serviço criado com ID: [número]
📊 [createServiceRequest] ANTES DE updateStatus - Gravando status inicial...
🔄 [updateStatus] 🔄 INICIANDO - requestId: [número] newStatus: Solicitado
✅ [updateStatus] Status principal atualizado
📝 [updateStatus] Inserindo histórico: [objeto com dados]
✅ [updateStatus] HISTÓRICO INSERIDO: [dados retornados]
✅ [createServiceRequest] APÓS updateStatus - Resultado: undefined
```

#### O Que Cada Log Significa:

| Log                            | Significado                            | Ação se Não Aparecer                                           |
| ------------------------------ | -------------------------------------- | -------------------------------------------------------------- |
| 🎯 INICIANDO                   | Método foi chamado                     | Verificar se formulário está funcionando                       |
| 📝 Novo serviço criado         | Banco recebeu solicitação              | Verificar status da conexão Supabase                           |
| 📊 ANTES DE updateStatus       | Método updateStatus vai ser chamado    | Verificar se há erro antes dessa linha                         |
| 🔄 updateStatus INICIANDO      | updateStatus foi chamado               | Verificar se há erro entre criar serviço e chamar updateStatus |
| ✅ Status principal atualizado | Tabela service_requests foi atualizada | RLS pode estar bloqueando no service_requests                  |
| 📝 Inserindo histórico         | Preparando para inserir no histórico   | Se anterior apareceu, RLS bloqueia para leitura                |
| ✅ HISTÓRICO INSERIDO          | **SUCESSO TOTAL**                      | Se não aparecer, pular para Etapa 2                            |
| ❌ ERRO ao inserir             | **FALHA NA INSERÇÃO**                  | Pular direto para Etapa 2 com a mensagem                       |

### Etapa 2: Verificar Banco de Dados (Se Etapa 1 falhar)

1. **Abra Supabase Dashboard**
2. **Vá para SQL Editor**
3. **Cole e execute** este script:

```sql
-- Contar quantos registros existem
SELECT COUNT(*) as total_registros FROM service_requests_status;

-- Ver registros por solicitação
SELECT
  service_request_id,
  COUNT(*) as numero_registros,
  MAX(changed_at) as ultima_mudanca
FROM service_requests_status
GROUP BY service_request_id
ORDER BY service_request_id DESC
LIMIT 10;

-- Ver últimos 20 registros
SELECT
  id,
  service_request_id,
  status,
  changed_at
FROM service_requests_status
ORDER BY changed_at DESC
LIMIT 20;
```

**Resultados Possíveis:**

- **Total = 0 e nenhum registro**: Inserts não estão acontecendo → Etapa 3
- **Total > 0 mas timeline vazio**: Problema na query do timeline → Etapa 4
- **Registros aparecem no banco**: Problema no carregamento → Etapa 5

### Etapa 3: Verificar Políticas RLS

Se o banco mostrou 0 registros, a inserção está falhando. Pode ser RLS bloqueando.

1. **No Supabase Dashboard**, vá para **Authentication** → **Policies**
2. **Procure por tabela** `service_requests_status`
3. **Verifique as políticas RLS**:

```sql
-- Para ver todas as políticas RLS
SELECT
  schemaname,
  tablename,
  policyname,
  qual as policy_definition
FROM pg_policies
WHERE tablename = 'service_requests_status';
```

**Problema Comum:**

- Se vir uma política que restringe por `auth.uid()` ou `user_id`
- E você está usando `admin` como usuário
- Pode ser que admin ID não corresponda ao `auth.uid()`

### Etapa 4: Testar Inserção Direto (Avançado)

No **SQL Editor do Supabase**, tente inserir manualmente:

```sql
-- Encontre um request_id real primeiro
SELECT id FROM service_requests LIMIT 1;

-- Então insira (substitua 1 pelo ID real)
INSERT INTO service_requests_status
  (service_request_id, status, changed_by, changed_at, notes)
VALUES
  (1, 'Teste', 1, NOW(), 'Teste manual');

-- Verifique se foi inserido
SELECT * FROM service_requests_status
WHERE service_request_id = 1
ORDER BY changed_at DESC;
```

**Resultado:**

- **Sucesso**: O banco aceita inserts → problema está no código Angular
- **Erro de RLS**: `new row violates row-level security policy` → Ajustar RLS
- **Erro de constraints**: Outro problema no schema

### Etapa 5: Verificar Query do Timeline

Se banco tem registros mas timeline mostra 0:

1. **No DevTools Console**, procure por logs tipo `[WorkflowTimeline]`
2. **Deve aparecer:**

```
[WorkflowTimeline] 📋 loadHistoryEffect iniciado - requestId: [número]
[WorkflowTimeline] 📊 Histórico carregado - Registros encontrados: [número]
```

Se aparecer `Registros encontrados: 0`:

Adicione este teste no SQL Editor:

```sql
-- Teste a query exata que o componente usa
-- Substitua 1 pelo request_id real
SELECT
  id,
  service_request_id,
  status,
  changed_by,
  changed_at,
  notes
FROM service_requests_status
WHERE service_request_id = 1
ORDER BY changed_at ASC;
```

## 🛠️ Próximos Passos Baseado no Resultado

### Se Logs Mostram ✅ HISTÓRICO INSERIDO:

- ✅ **Código está funcionando**
- ⚠️ Problema está no carregamento
- Verifique Etapa 5

### Se Logs Mostram ❌ ERRO ao inserir:

- 🔴 **Insert está falhando**
- Verifique mensagem de erro
- Pode ser RLS, constraints, ou tipo de dado

### Se Logs Não Aparecem:

- 🔴 **updateStatus não está sendo chamado**
- Verifique se há erro no createServiceRequest
- Procure por linhas antes de "ANTES DE updateStatus"

### Se Banco Mostra 0 Registros:

- 🔴 **Nenhuma inserção está chegando ao banco**
- Verifique RLS policies (Etapa 3)
- Ou há erro silencioso no código

## 📋 Checklist de Diagnóstico

- [ ] Console mostra todos os logs 🎯 até ✅?
- [ ] Se não, qual é o último log que aparece?
- [ ] SQL Query retorna registros na tabela?
- [ ] Se não, RLS policies estão corretas?
- [ ] Timeline consegue carregar dados manualmente no SQL?
- [ ] Logs de erro aparecem no DevTools?

## 🚀 Teste Rápido

Para teste rápido SEM criar serviço completo:

1. **Abra DevTools Console**
2. **Cole este código:**

```javascript
// Teste direto no componente
const service = inject(WorkflowServiceSimplified);
await service.updateStatus(1, "TesteRapido", 1, "Teste de diagnóstico");
```

3. **Observe logs de updateStatus**
4. **Verifique se aparece no banco** com SQL

## 📞 Informações para Relatar

Se ainda não funcionar, forneça:

1. Screenshot do console mostrando logs
2. Último log que apareceu antes do erro
3. Mensagem de erro exata (se houver)
4. Resultado do SQL Query do banco
5. Seu `auth.uid()` e `user_id` admin (para verificar RLS)

---

**Última Atualização:** Adicionado logging detalhado e script de diagnóstico

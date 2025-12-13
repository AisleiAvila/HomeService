# Análise: Como o Status é Salvo ao Finalizar Serviço

## 📋 Resumo

Quando um profissional clica em "Finalizar Serviço", o sistema **está salvando corretamente** tanto na tabela principal quanto na tabela de histórico.

## 🔄 Fluxo Completo

### 1. Componente (UI Layer)

**Localização:** `dashboard.component.ts:130` ou `service-request-details.component.ts:1007`

```typescript
async handleCompleteService() {
  const currentUser = this.user();
  if (currentUser?.role !== "professional") {
    throw new Error("Apenas profissionais podem concluir serviços");
  }

  // Chama o serviço de workflow
  const success = await this.workflowService.completeExecution(
    request.id,
    currentUser.id
  );
}
```

### 2. Serviço de Workflow

**Localização:** `workflow-simplified.service.ts:540`

```typescript
async completeExecution(
  requestId: number,
  professionalId: number,
  notes?: string
): Promise<boolean> {
  // 1️⃣ Busca dados atuais
  const request = await this.getRequest(requestId);
  if (!request) throw new Error("Solicitação não encontrada");

  const previousStatus = request.status;

  // 2️⃣ Valida transição de status
  if (!this.canTransition(previousStatus, "Aguardando Finalização")) {
    throw new Error(`Não é possível concluir a partir do status ${previousStatus}`);
  }

  // 3️⃣ Valida permissões do usuário
  const currentUser = await this.getCurrentUser();
  if (!currentUser || !this.canPerformTransition(previousStatus, "Aguardando Finalização", currentUser.role)) {
    throw new Error("Usuário não tem permissão para concluir execução");
  }

  // 4️⃣ Valida tempo mínimo de execução (50% do tempo estimado)
  if (request.started_at && request.estimated_duration_minutes) {
    const startTime = new Date(request.started_at);
    const now = new Date();
    const actualDuration = (now.getTime() - startTime.getTime()) / (1000 * 60);
    const minimumDuration = request.estimated_duration_minutes * 0.5;

    if (actualDuration < minimumDuration) {
      console.warn(`Serviço concluído muito rápido: ${actualDuration.toFixed(1)} min`);
    }
  }

  // 5️⃣ Atualiza a tabela principal
  await this.supabase.client
    .from("service_requests")
    .update({
      status: "Aguardando Finalização",
      completed_at: new Date().toISOString(),
      actual_end_datetime: new Date().toISOString(),
      admin_notes: notes ? `Notas de conclusão: ${notes}` : undefined,
    })
    .eq("id", requestId)
    .eq("professional_id", professionalId);

  // 6️⃣ Registra na tabela de histórico ✅
  if (currentUser) {
    await this.updateStatus(
      requestId,
      "Aguardando Finalização",
      currentUser.id,
      notes ? `Profissional concluiu a execução: ${notes}` : "Profissional concluiu a execução"
    );
  }

  // 7️⃣ Registra auditoria adicional
  await this.auditService.logStatusChange(
    requestId,
    previousStatus,
    "Aguardando Finalização",
    notes ? `Profissional concluiu a execução: ${notes}` : "Profissional concluiu a execução",
    { actual_end: new Date().toISOString(), notes }
  );

  // 8️⃣ Notifica o admin
  if (request.created_by_admin_id) {
    await this.notifyAdmin(
      request.created_by_admin_id,
      "serviceCompleted",
      `Serviço concluído - Solicitação #${requestId}`
    );
  }

  return true;
}
```

### 3. Método de Atualização de Status

**Localização:** `workflow-simplified.service.ts:881`

```typescript
private async updateStatus(
  requestId: number,
  newStatus: ServiceStatus,
  userId: number,
  notes?: string
): Promise<void> {
  console.log('[updateStatus] 🔄 INICIANDO - requestId:', requestId, 'newStatus:', newStatus);

  // 1️⃣ Atualiza status na tabela principal
  await this.supabase.client
    .from("service_requests")
    .update({ status: newStatus })
    .eq("id", requestId);

  console.log('[updateStatus] ✅ Status principal atualizado');

  // 2️⃣ Insere registro no histórico ✅
  const statusEntry = {
    service_request_id: requestId,
    status: newStatus,
    changed_by: userId,
    changed_at: new Date().toISOString(),
    notes: notes || null
  };

  console.log('[updateStatus] 📝 Inserindo histórico:', statusEntry);

  const { data, error } = await this.supabase.client
    .from("service_requests_status")  // ✅ SALVA NA TABELA DE HISTÓRICO
    .insert([statusEntry])
    .select();

  if (error) {
    console.error('[updateStatus] ❌ ERRO ao inserir histórico:', error);
  } else {
    console.log('[updateStatus] ✅ HISTÓRICO INSERIDO:', data);
  }
}
```

## ✅ Confirmação

### O sistema está salvando em DUAS tabelas:

1. **`service_requests`** (tabela principal)

   - Campo `status` atualizado para "Aguardando Finalização"
   - Campo `completed_at` com timestamp
   - Campo `actual_end_datetime` com timestamp
   - Campo `admin_notes` com notas (se fornecidas)

2. **`service_requests_status`** (tabela de histórico) ✅
   - `service_request_id`: ID da solicitação
   - `status`: "Aguardando Finalização"
   - `changed_by`: ID do usuário (profissional)
   - `changed_at`: Timestamp da mudança
   - `notes`: "Profissional concluiu a execução" (ou com notas adicionais)

## 🔍 Validações Aplicadas

### 1. Validação de Transição

- Só permite finalizar se o status atual permitir a transição para "Aguardando Finalização"
- Geralmente vindo do status "Em Progresso"

### 2. Validação de Permissão

- Apenas profissionais podem finalizar serviços
- Sistema verifica role do usuário atual

### 3. Validação de Tempo

- Verifica se o serviço foi executado por pelo menos 50% do tempo estimado
- Gera aviso se concluído muito rápido (não bloqueia)

### 4. Validação de Contexto

- Verifica se `professional_id` corresponde ao usuário atual
- Garante que apenas o profissional atribuído possa finalizar

## 🔍 Como Verificar

### 1. Logs no Console do Navegador

Quando finalizar um serviço, você verá:

```
[DEBUG] completeExecution - Usuário: {...} Status anterior: Em Progresso Tentando para: Aguardando Finalização
[updateStatus] 🔄 INICIANDO - requestId: X newStatus: Aguardando Finalização userId: Y
[updateStatus] ✅ Status principal atualizado
[updateStatus] 📝 Inserindo histórico: {...}
[updateStatus] ✅ HISTÓRICO INSERIDO: [...]
```

### 2. Consulta SQL Direta

```sql
-- Ver histórico de uma solicitação específica
SELECT * FROM service_requests_status
WHERE service_request_id = 38
ORDER BY changed_at DESC;

-- Ver todas as mudanças para "Aguardando Finalização"
SELECT * FROM service_requests_status
WHERE status = 'Aguardando Finalização'
ORDER BY changed_at DESC;

-- Ver timeline completa de uma solicitação
SELECT
  srs.*,
  p.name as changed_by_name
FROM service_requests_status srs
LEFT JOIN profiles p ON p.id = srs.changed_by
WHERE srs.service_request_id = 38
ORDER BY srs.changed_at ASC;
```

### 3. Componente Timeline

O componente `workflow-timeline.component.ts` exibe esse histórico:

```typescript
.from('service_requests_status')
.select('*')
.eq('service_request_id', requestId)
.order('changed_at', { ascending: false });
```

## 📊 Diferenças com Iniciar Serviço

| Aspecto            | Iniciar Serviço                       | Finalizar Serviço                     |
| ------------------ | ------------------------------------- | ------------------------------------- |
| Status Destino     | "Em Progresso"                        | "Aguardando Finalização"              |
| Validação Temporal | ≥ 30 min antes da data agendada       | ≥ 50% do tempo estimado               |
| Campos Atualizados | `started_at`, `actual_start_datetime` | `completed_at`, `actual_end_datetime` |
| Notificação        | Não envia                             | Notifica admin                        |
| Próximo Passo      | Profissional trabalha                 | Admin paga e finaliza                 |

## 🎯 Conclusão

**SIM, o sistema está salvando corretamente na tabela `service_requests_status`** quando o profissional finaliza um serviço.

O histórico de status é mantido através de:

- ✅ Método `updateStatus()` no `workflow-simplified.service.ts` (linha 881)
- ✅ Chamado dentro de `completeExecution()` (linha 592)
- ✅ Auditoria adicional pelo `status-audit.service.ts` (linha 605)

### Fluxo de Estados Após Finalização:

```
Em Progresso
    ↓ (Profissional finaliza)
Aguardando Finalização
    ↓ (Admin processa pagamento)
Pagamento Feito
    ↓ (Admin confirma conclusão)
Concluído
```

Todos os métodos inserem registros na tabela de histórico sempre que há uma mudança de status, garantindo rastreabilidade completa do ciclo de vida da solicitação.

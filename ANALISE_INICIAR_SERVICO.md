# Análise: Como o Status é Salvo ao Iniciar Serviço

## 📋 Resumo

Quando um profissional clica em "Iniciar Serviço", o sistema **está salvando corretamente** tanto na tabela principal quanto na tabela de histórico.

## 🔄 Fluxo Completo

### 1. Componente (UI Layer)

**Localização:** `dashboard.component.ts` ou `service-request-details.component.ts`

```typescript
async handleStartService(request: ServiceRequest) {
  // Chama o serviço de workflow
  const success = await this.workflowService.startExecution(
    request.id,
    currentUser.id
  );
}
```

### 2. Serviço de Workflow

**Localização:** `workflow-simplified.service.ts:457`

```typescript
async startExecution(requestId: number, professionalId: number): Promise<boolean> {
  // 1️⃣ Valida transição de status
  if (!this.canTransition(previousStatus, "Em Progresso")) {
    throw new Error(`Não é possível iniciar a partir do status ${previousStatus}`);
  }

  // 2️⃣ Valida permissões
  if (!this.canPerformTransition(previousStatus, "Em Progresso", currentUser.role)) {
    throw new Error("Usuário não tem permissão para iniciar execução");
  }

  // 3️⃣ Valida data agendada (pode iniciar até 30 min antes)
  if (request.scheduled_start_datetime) {
    const scheduledDate = new Date(request.scheduled_start_datetime);
    const now = new Date();
    const thirtyMinutesBefore = new Date(scheduledDate.getTime() - 30 * 60 * 1000);

    if (now < thirtyMinutesBefore) {
      throw new Error("Não é possível iniciar antes da data agendada");
    }
  }

  // 4️⃣ Atualiza a tabela principal
  await this.supabase.client
    .from("service_requests")
    .update({
      status: "Em Progresso",
      started_at: new Date().toISOString(),
      actual_start_datetime: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("professional_id", professionalId);

  // 5️⃣ Registra na tabela de histórico ✅
  if (currentUser) {
    await this.updateStatus(
      requestId,
      "Em Progresso",
      currentUser.id,
      "Profissional iniciou a execução do serviço"
    );
  }

  // 6️⃣ Registra auditoria adicional
  await this.auditService.logStatusChange(
    requestId,
    previousStatus,
    "Em Progresso",
    "Profissional iniciou a execução do serviço",
    { actual_start: new Date().toISOString() }
  );
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

   - Campo `status` atualizado para "Em Progresso"
   - Campo `started_at` com timestamp
   - Campo `actual_start_datetime` com timestamp

2. **`service_requests_status`** (tabela de histórico) ✅
   - `service_request_id`: ID da solicitação
   - `status`: "Em Progresso"
   - `changed_by`: ID do usuário (profissional)
   - `changed_at`: Timestamp da mudança
   - `notes`: "Profissional iniciou a execução do serviço"

## 🔍 Como Verificar

### 1. Logs no Console do Navegador

Quando iniciar um serviço, você verá:

```
[updateStatus] 🔄 INICIANDO - requestId: X newStatus: Em Progresso userId: Y
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

-- Ver todas as mudanças para "Em Progresso"
SELECT * FROM service_requests_status
WHERE status = 'Em Progresso'
ORDER BY changed_at DESC;
```

### 3. Componente Timeline

O componente `workflow-timeline.component.ts` consome essa tabela:

```typescript
.from('service_requests_status')
.select('*')
.eq('service_request_id', requestId)
.order('changed_at', { ascending: false });
```

## 🎯 Conclusão

**SIM, o sistema está salvando corretamente na tabela `service_requests_status`** quando o profissional inicia um serviço.

O histórico de status é mantido através de:

- Método `updateStatus()` no `workflow-simplified.service.ts` (linha 881)
- Método `recordStatusChange()` no `data.service.ts` (linha 1768)
- Auditoria adicional pelo `status-audit.service.ts`

Todos os métodos inserem registros na tabela de histórico sempre que há uma mudança de status.

# 📋 Plano de Ajuste - Sistema de Status de Solicitações de Serviço

**Data**: 29/11/2025
**Objetivo**: Simplificar o fluxo de status removendo o sistema de orçamento e implementando novo fluxo focado em direcionamento direto.

---

## 🎯 Novo Fluxo de Status

### **Status Atuais (23) → Novos Status (13)**

```
ANTES (Sistema com Orçamento):
├─ Solicitado
├─ Em análise
├─ Aguardando esclarecimentos
├─ Orçamento enviado
├─ Aguardando aprovação do orçamento
├─ Orçamento aprovado/rejeitado
├─ Aguardando data de execução
├─ Data proposta/aprovada/rejeitada
├─ Buscando profissional
├─ Profissional selecionado
├─ Aguardando confirmação
├─ Agendado
├─ Em execução
├─ Concluído - Aguardando aprovação
├─ Aprovado/Rejeitado
├─ Pago
└─ Finalizado/Cancelado

DEPOIS (Sistema Simplificado):
├─ Rascunho
├─ Pendente
├─ Em análise
├─ Aceita
├─ Recusada
├─ Agendada
├─ Atrasada
├─ Em andamento
├─ Concluída
├─ Aguardando pagamento
├─ Finalizada
├─ Cancelada
└─ Reenviada
```

---

## 📊 Novo Fluxo Detalhado

```
1. RASCUNHO
   ↓ (Admin cria solicitação)

2. PENDENTE
   ↓ (Admin seleciona profissional)

3. EM ANÁLISE
   ↓ (Profissional analisa)

   ├→ ACEITA
   │  ↓ (Profissional aceita)
   │
   │  AGENDADA
   │  ↓ (Data confirmada)
   │
   │  ├→ ATRASADA (automático se passou da data/hora)
   │  │
   │  EM ANDAMENTO
   │  ↓ (Profissional inicia)
   │
   │  CONCLUÍDA
   │  ↓ (Profissional finaliza)
   │
   │  AGUARDANDO PAGAMENTO
   │  ↓ (Admin processa pagamento)
   │
   │  FINALIZADA
   │
   └→ RECUSADA
      ↓ (Profissional recusa)

      REENVIADA
      ↓ (Admin reenvia)

      PENDENTE (volta ao início)

❌ CANCELADA (qualquer fase)
```

---

## 🔧 Tarefas de Implementação

### **FASE 1: Atualização de Models e Types**

#### ✅ Tarefa 1.1: Atualizar `maintenance.models.ts`

**Arquivo**: `src/models/maintenance.models.ts`

```typescript
// SUBSTITUIR:
export type ServiceStatus =
  | "Solicitado"
  | "Em análise"
  | "Aguardando esclarecimentos"
  | "Orçamento enviado";
// ... (23 status)

// POR:
export type ServiceStatus =
  | "Rascunho"
  | "Pendente"
  | "Em análise"
  | "Aceita"
  | "Recusada"
  | "Agendada"
  | "Atrasada"
  | "Em andamento"
  | "Concluída"
  | "Aguardando pagamento"
  | "Finalizada"
  | "Cancelada"
  | "Reenviada";
```

**Campos a REMOVER da interface ServiceRequest**:

- `quote_amount`
- `quote_description`
- `quote_sent_at`
- `quote_approved_at`
- `clarifications`
- `admin_requests`
- `execution_date_approval`
- `execution_date_proposed_at`
- `execution_date_approved_at`
- `execution_date_rejection_reason`
- `professional_response`
- `professional_response_at`
- `professional_responses` (array de orçamentos)

**Campos a MANTER**:

- `scheduled_start_datetime`
- `estimated_duration_minutes`
- `actual_start_datetime`
- `actual_end_datetime`
- `payment_due_date`
- `payment_completed_at`
- `status_history`

---

#### ✅ Tarefa 1.2: Atualizar `status.service.ts`

**Arquivo**: `src/services/status.service.ts`

```typescript
export enum StatusService {
  Draft = "Draft", // Rascunho
  Pending = "Pending", // Pendente
  InAnalysis = "InAnalysis", // Em análise
  Accepted = "Accepted", // Aceita
  Rejected = "Rejected", // Recusada
  Scheduled = "Scheduled", // Agendada
  Delayed = "Delayed", // Atrasada
  InProgress = "InProgress", // Em andamento
  Completed = "Completed", // Concluída
  AwaitingPayment = "AwaitingPayment", // Aguardando pagamento
  Finalized = "Finalized", // Finalizada
  Cancelled = "Cancelled", // Cancelada
  Resent = "Resent", // Reenviada
}
```

---

#### ✅ Tarefa 1.3: Atualizar mapeamentos

**Arquivo**: `src/utils/status-mapping.util.ts`

```typescript
export const statusServiceToServiceStatus: Record<
  StatusService,
  ServiceStatus
> = {
  [StatusService.Draft]: "Rascunho",
  [StatusService.Pending]: "Pendente",
  [StatusService.InAnalysis]: "Em análise",
  [StatusService.Accepted]: "Aceita",
  [StatusService.Rejected]: "Recusada",
  [StatusService.Scheduled]: "Agendada",
  [StatusService.Delayed]: "Atrasada",
  [StatusService.InProgress]: "Em andamento",
  [StatusService.Completed]: "Concluída",
  [StatusService.AwaitingPayment]: "Aguardando pagamento",
  [StatusService.Finalized]: "Finalizada",
  [StatusService.Cancelled]: "Cancelada",
  [StatusService.Resent]: "Reenviada",
};
```

---

### **FASE 2: Atualização de Serviços**

#### ✅ Tarefa 2.1: Refatorar `WorkflowService`

**Arquivo**: `src/services/workflow.service.ts`

**REMOVER métodos**:

- `requestQuote()`
- `submitQuote()`
- `approveQuote()`
- `rejectQuote()`
- `requestClarification()`
- `provideClarification()`
- `proposeExecutionDate()`
- `approveExecutionDate()`
- `rejectExecutionDate()`

**MANTER/AJUSTAR métodos**:

- `selectProfessional()` → muda status para "Pendente"
- `professionalAcceptJob()` → muda para "Aceita"
- `professionalRejectJob()` → muda para "Recusada"
- `scheduleWork()` → muda para "Agendada"
- `startWork()` → muda para "Em andamento"
- `completeWork()` → muda para "Concluída"
- `processPayment()` → muda para "Aguardando pagamento" → "Finalizada"
- `cancelRequest()` → muda para "Cancelada"

**ADICIONAR métodos**:

```typescript
async createDraft(payload: ServiceRequestPayload): Promise<void> {
  // Cria solicitação com status "Rascunho"
}

async resendRequest(requestId: number, professionalId?: number): Promise<void> {
  // Muda status para "Reenviada" e depois "Pendente"
  // Permite redirecionar para mesmo profissional ou outro
}

async checkDelayedRequests(): Promise<void> {
  // Verifica solicitações "Agendadas" que passaram da data/hora
  // Atualiza automaticamente para "Atrasada"
}
```

---

#### ✅ Tarefa 2.2: Atualizar `DataService`

**Arquivo**: `src/services/data.service.ts`

**AJUSTAR**:

```typescript
async addServiceRequest(payload: ServiceRequestPayload) {
  // Status inicial: "Rascunho"
  const newRequestData = {
    ...payload,
    status: "Rascunho",
    payment_status: "Unpaid"
  };
}

async addAdminServiceRequest(payload: AdminServiceRequestPayload) {
  // Admin cria direto como "Rascunho"
  // Pode ir direto para "Pendente" se já atribuir profissional
}

async directAssignServiceRequest(
  requestId: number,
  professionalId: number,
  executionDate: string
): Promise<void> {
  // Atribui profissional e muda para "Pendente"
}
```

---

### **FASE 3: Atualização da Interface (i18n)**

#### ✅ Tarefa 3.1: Atualizar traduções

**Arquivo**: `src/i18n.service.ts`

**Adicionar traduções PT**:

```typescript
statusDraft: "Rascunho",
statusPending: "Pendente",
statusInAnalysis: "Em análise",
statusAccepted: "Aceita",
statusRejected: "Recusada",
statusScheduled: "Agendada",
statusDelayed: "Atrasada",
statusInProgress: "Em andamento",
statusCompleted: "Concluída",
statusAwaitingPayment: "Aguardando pagamento",
statusFinalized: "Finalizada",
statusCancelled: "Cancelada",
statusResent: "Reenviada",
```

**Adicionar traduções EN**:

```typescript
statusDraft: "Draft",
statusPending: "Pending",
statusInAnalysis: "In Analysis",
statusAccepted: "Accepted",
statusRejected: "Rejected",
statusScheduled: "Scheduled",
statusDelayed: "Delayed",
statusInProgress: "In Progress",
statusCompleted: "Completed",
statusAwaitingPayment: "Awaiting Payment",
statusFinalized: "Finalized",
statusCancelled: "Cancelled",
statusResent: "Resent",
```

**REMOVER traduções relacionadas a orçamento**:

- `quoteRequest`, `quoteSent`, `quoteApproved`, `quoteRejected`
- `awaitingQuoteApproval`, `provideQuote`, etc.

---

### **FASE 4: Atualização de Componentes**

#### ✅ Tarefa 4.1: Atualizar Dashboard Admin

**Arquivo**: `src/components/admin-dashboard/service-requests/service-requests.component.ts`

**Filtros de status**:

```typescript
statusOptions = signal([
  { status: "Rascunho", label: "statusDraft" },
  { status: "Pendente", label: "statusPending" },
  { status: "Em análise", label: "statusInAnalysis" },
  { status: "Aceita", label: "statusAccepted" },
  { status: "Recusada", label: "statusRejected" },
  { status: "Agendada", label: "statusScheduled" },
  { status: "Atrasada", label: "statusDelayed" },
  { status: "Em andamento", label: "statusInProgress" },
  { status: "Concluída", label: "statusCompleted" },
  { status: "Aguardando pagamento", label: "statusAwaitingPayment" },
  { status: "Finalizada", label: "statusFinalized" },
  { status: "Cancelada", label: "statusCancelled" },
  { status: "Reenviada", label: "statusResent" },
]);
```

**Ações por status**:

```typescript
// Rascunho → permitir editar, atribuir profissional
// Pendente → aguardar análise do profissional
// Em análise → aguardar resposta (aceita/recusa)
// Recusada → permitir reenviar
// Aceita → permitir agendar
// Agendada → aguardar profissional iniciar
// Atrasada → notificar e cobrar
// Em andamento → aguardar conclusão
// Concluída → processar pagamento
// Aguardando pagamento → confirmar pagamento
// Finalizada → visualizar apenas
// Cancelada → visualizar apenas
```

---

#### ✅ Tarefa 4.2: Remover componentes de orçamento

**Arquivos a REMOVER ou AJUSTAR**:

- `budget-approval-modal/` → REMOVER
- `service-request-form/` → AJUSTAR (remover campos de orçamento)
- `clarification-modal/` → REMOVER (se for específico de orçamento)

---

#### ✅ Tarefa 4.3: Atualizar Timeline

**Arquivo**: `src/components/workflow-timeline/workflow-timeline.component.ts`

**Ajustar fases**:

```typescript
phases = [
  { name: "Criação", statuses: ["Rascunho", "Pendente"] },
  {
    name: "Análise",
    statuses: ["Em análise", "Aceita", "Recusada", "Reenviada"],
  },
  { name: "Agendamento", statuses: ["Agendada", "Atrasada"] },
  { name: "Execução", statuses: ["Em andamento", "Concluída"] },
  {
    name: "Finalização",
    statuses: ["Aguardando pagamento", "Finalizada", "Cancelada"],
  },
];
```

---

### **FASE 5: Atualização de Utilitários**

#### ✅ Tarefa 5.1: Cores de status

**Arquivo**: `src/utils/status-utils.service.ts`

```typescript
private statusColors: Record<string, string> = {
  "Rascunho": "#9ca3af",         // gray-400
  "Pendente": "#eab308",         // yellow-500
  "Em análise": "#3b82f6",       // blue-500
  "Aceita": "#10b981",           // green-500
  "Recusada": "#ef4444",         // red-500
  "Agendada": "#8b5cf6",         // violet-500
  "Atrasada": "#f97316",         // orange-500
  "Em andamento": "#06b6d4",     // cyan-500
  "Concluída": "#14b8a6",        // teal-500
  "Aguardando pagamento": "#f59e0b", // amber-500
  "Finalizada": "#059669",       // emerald-600
  "Cancelada": "#dc2626",        // red-600
  "Reenviada": "#6366f1"         // indigo-500
};
```

---

### **FASE 6: Sistema de Atraso Automático**

#### ✅ Tarefa 6.1: Criar serviço de monitoramento

**Novo arquivo**: `src/services/delay-monitor.service.ts`

```typescript
@Injectable({ providedIn: "root" })
export class DelayMonitorService {
  async checkDelayedRequests(): Promise<void> {
    const now = new Date();
    const scheduledRequests = this.dataService
      .serviceRequests()
      .filter((r) => r.status === "Agendada" && r.scheduled_start_datetime);

    for (const request of scheduledRequests) {
      const scheduledTime = new Date(request.scheduled_start_datetime!);
      if (now > scheduledTime) {
        await this.workflowService.markAsDelayed(request.id);
      }
    }
  }
}
```

**Executar periodicamente** (a cada 5 minutos):

```typescript
// No AppComponent ou serviço principal
setInterval(() => {
  this.delayMonitor.checkDelayedRequests();
}, 5 * 60 * 1000);
```

---

### **FASE 7: Migração de Dados no Banco**

#### ✅ Tarefa 7.1: Script de migração SQL

**Novo arquivo**: `sql/migrate_status_system.sql`

```sql
-- Mapear status antigos para novos
UPDATE service_requests
SET status = CASE
  WHEN status IN ('Solicitado', 'Em análise', 'Aguardando esclarecimentos')
    THEN 'Rascunho'
  WHEN status IN ('Buscando profissional', 'Profissional selecionado')
    THEN 'Pendente'
  WHEN status = 'Aguardando confirmação do profissional'
    THEN 'Em análise'
  WHEN status IN ('Orçamento aprovado', 'Aguardando data de execução',
                  'Data proposta pelo administrador', 'Data aprovada')
    THEN 'Aceita'
  WHEN status IN ('Orçamento rejeitado', 'Data rejeitada')
    THEN 'Recusada'
  WHEN status = 'Agendado'
    THEN 'Agendada'
  WHEN status = 'Em execução'
    THEN 'Em andamento'
  WHEN status IN ('Concluído - Aguardando aprovação', 'Aprovado')
    THEN 'Concluída'
  WHEN status = 'Pago'
    THEN 'Aguardando pagamento'
  WHEN status = 'Finalizado'
    THEN 'Finalizada'
  WHEN status = 'Cancelado'
    THEN 'Cancelada'
  ELSE 'Rascunho'
END;

-- Remover campos de orçamento
ALTER TABLE service_requests
  DROP COLUMN IF EXISTS quote_amount,
  DROP COLUMN IF EXISTS quote_description,
  DROP COLUMN IF EXISTS quote_sent_at,
  DROP COLUMN IF EXISTS quote_approved_at,
  DROP COLUMN IF EXISTS clarifications,
  DROP COLUMN IF EXISTS admin_requests,
  DROP COLUMN IF EXISTS execution_date_approval,
  DROP COLUMN IF EXISTS execution_date_proposed_at,
  DROP COLUMN IF EXISTS execution_date_approved_at,
  DROP COLUMN IF EXISTS execution_date_rejection_reason,
  DROP COLUMN IF EXISTS professional_response,
  DROP COLUMN IF EXISTS professional_response_at,
  DROP COLUMN IF EXISTS professional_responses;
```

---

## 📝 Checklist de Implementação

### **Sprint 1: Models e Core (2-3 dias)**

- [ ] 1.1: Atualizar `ServiceStatus` type
- [ ] 1.2: Atualizar `StatusService` enum
- [ ] 1.3: Atualizar mapeamentos
- [ ] 1.4: Remover campos de orçamento da interface
- [ ] 1.5: Executar testes de compilação

### **Sprint 2: Serviços (3-4 dias)**

- [ ] 2.1: Refatorar `WorkflowService`
- [ ] 2.2: Atualizar `DataService`
- [ ] 2.3: Criar `DelayMonitorService`
- [ ] 2.4: Atualizar `NotificationService`
- [ ] 2.5: Executar testes unitários

### **Sprint 3: Interface (2-3 dias)**

- [ ] 3.1: Atualizar traduções i18n
- [ ] 3.2: Atualizar cores de status
- [ ] 3.3: Ajustar Timeline component
- [ ] 3.4: Remover componentes de orçamento

### **Sprint 4: Componentes (4-5 dias)**

- [ ] 4.1: Atualizar Dashboard Admin
- [ ] 4.2: Atualizar Service Request Details
- [ ] 4.3: Atualizar Service List
- [ ] 4.4: Ajustar formulários
- [ ] 4.5: Executar testes de interface

### **Sprint 5: Migração e Testes (2-3 dias)**

- [ ] 5.1: Criar script de migração SQL
- [ ] 5.2: Executar migração em ambiente de teste
- [ ] 5.3: Validar dados migrados
- [ ] 5.4: Testes de integração completos
- [ ] 5.5: Testes de aceitação

### **Sprint 6: Deployment (1-2 dias)**

- [ ] 6.1: Backup da base de dados
- [ ] 6.2: Executar migração em produção
- [ ] 6.3: Deploy da aplicação
- [ ] 6.4: Monitoramento pós-deploy
- [ ] 6.5: Documentação atualizada

---

## ⚠️ Pontos de Atenção

### **Dependências Críticas**:

1. **Notificações**: Atualizar templates de email/SMS para novos status
2. **Políticas RLS**: Verificar se há políticas baseadas em status de orçamento
3. **Histórico**: Preservar histórico de status antigos na migração
4. **APIs externas**: Verificar integrações que dependem dos status

### **Testes Essenciais**:

1. Fluxo completo de criação até finalização
2. Reenvio de solicitação recusada
3. Detecção automática de atrasos
4. Permissões por papel (admin/profissional)
5. Migração de dados históricos

### **Rollback Plan**:

1. Manter backup antes da migração
2. Script de rollback de status preparado
3. Capacidade de reverter deploy rapidamente

---

## 📊 Estimativa Total

**Tempo estimado**: 14-20 dias úteis
**Complexidade**: Média-Alta
**Risco**: Médio (muitas mudanças estruturais)

---

## 🎯 Critérios de Sucesso

✅ Todos os 13 novos status funcionando
✅ Sistema de atraso automático operacional
✅ Dados históricos migrados corretamente
✅ Interface atualizada e responsiva
✅ Testes completos passando
✅ Zero downtime no deployment
✅ Documentação atualizada

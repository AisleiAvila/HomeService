# Análise: Como a Aplicação Aplica os Status

## 📋 Visão Geral

A aplicação HomeService possui **dois sistemas de gestão de status** que coexistem:

1. **Sistema Legado** - Usa strings diretas hardcoded
2. **Sistema Novo (Workflow Simplificado)** - Centralizado e validado

## 🔄 Status Disponíveis (Sistema Atual - 11 Status)

```typescript
type ServiceStatus =
  | "Solicitado" // 1. Admin cria solicitação
  | "Atribuído" // 2. Admin atribui profissional
  | "Aguardando Confirmação" // 3. Profissional precisa aceitar/recusar
  | "Aceito" // 4. Profissional aceitou
  | "Recusado" // 5. Profissional recusou (estado final)
  | "Data Definida" // 6. Data de execução agendada
  | "Em Progresso" // 7. Serviço sendo executado
  | "Aguardando Finalização" // 8. Serviço concluído, aguarda pagamento
  | "Pagamento Feito" // 9. Admin processou pagamento
  | "Concluído" // 10. Fluxo finalizado com sucesso
  | "Cancelado"; // 11. Cancelado em qualquer etapa
```

## 🎯 Pontos de Aplicação de Status

### 1️⃣ **Criação de Solicitação**

**Localização:** `src/services/data.service.ts` - Linha 285-296

```typescript
async addServiceRequest(payload: ServiceRequestPayload) {
  const { StatusService } = await import("../services/status.service");
  const newRequestData: any = {
    // ... outros campos
    status: statusServiceToServiceStatus[StatusService.Requested], // "Solicitado"
    payment_status: "Unpaid",
  };
  // insert no Supabase
}
```

**Status Aplicado:** `"Solicitado"`

**Quem aplica:** Admin (via formulário de criação)

---

### 2️⃣ **Atribuição de Profissional**

**Localização:** `src/services/workflow-simplified.service.ts` - Linha 169-197

```typescript
async assignProfessional(
  requestId: number,
  professionalId: number,
  adminId: number
): Promise<boolean> {
  await this.supabase.client
    .from("service_requests")
    .update({
      professional_id: professionalId,
      assigned_by_admin_id: adminId,
      status: "Atribuído", // Primeiro status
    })
    .eq("id", requestId);

  // Depois atualiza para aguardando confirmação
  await this.updateStatus(requestId, "Aguardando Confirmação", adminId);
}
```

**Status Aplicados:**

- `"Atribuído"` → `"Aguardando Confirmação"`

**Quem aplica:** Admin (via dashboard ou modal de atribuição)

---

### 3️⃣ **Resposta do Profissional**

**Localização:** `src/services/workflow-simplified.service.ts` - Linha 208-244

```typescript
async respondToAssignment(
  requestId: number,
  professionalId: number,
  accept: boolean,
  notes?: string
): Promise<boolean> {
  const newStatus: ServiceStatus = accept ? "Aceito" : "Recusado";

  await this.supabase.client
    .from("service_requests")
    .update({
      status: newStatus,
      admin_notes: notes ? `Resposta do profissional: ${notes}` : undefined,
    })
    .eq("id", requestId);
}
```

**Status Aplicados:**

- Se aceitar: `"Aceito"`
- Se recusar: `"Recusado"` (estado final)

**Quem aplica:** Profissional (via botão de aceitar/recusar)

---

### 4️⃣ **Definição de Data de Execução**

**Localização:** `src/services/data.service.ts` - Linha 491-527

```typescript
async scheduleServiceRequest(
  requestId: number,
  professionalId: number,
  scheduledDate: Date
) {
  const updates = {
    professional_id: professionalId,
    scheduled_date: scheduledDate.toISOString(),
    status: statusServiceToServiceStatus[StatusService.Scheduled], // "Data Definida"
  };
  await this.updateServiceRequest(requestId, updates);
}
```

**Status Aplicado:** `"Data Definida"`

**Quem aplica:**

- Profissional (após aceitar)
- Admin (pode propor data)

---

### 5️⃣ **Início da Execução do Serviço**

**Localização:** `src/components/service-request-details/service-request-details.component.ts` - Linha 776-795

```typescript
private async handleStartService(): Promise<void> {
  await this.dataService.updateServiceRequest(this.request().id, {
    status: "Em Progresso",
  });
  this.notificationService.addNotification("Serviço iniciado com sucesso!");
}
```

**Também em:** `src/components/dashboard/dashboard.component.ts` - Linha 146-179

```typescript
async handleStartService(request: ServiceRequest) {
  await this.dataService.updateServiceRequest(request.id, {
    status: "Em Progresso",
  });
}
```

**Status Aplicado:** `"Em Progresso"`

**Quem aplica:** Profissional (via botão "Iniciar Serviço")

**Regra de Negócio:** ⚠️ Não pode iniciar antes da data agendada

---

### 6️⃣ **Conclusão do Serviço**

**Localização:** `src/components/service-request-details/service-request-details.component.ts` - Linha 799-822

```typescript
private async handleCompleteService(): Promise<void> {
  await this.dataService.updateServiceRequest(this.request().id, {
    status: "Aguardando Finalização",
  });
  this.notificationService.addNotification("Serviço marcado como concluído!");
}
```

**Também em:** `src/components/dashboard/dashboard.component.ts` - Linha 119-146

```typescript
async handleFinishService(request: ServiceRequest) {
  await this.dataService.updateServiceRequest(request.id, {
    status: "Aguardando Finalização",
  });
}
```

**Status Aplicado:** `"Aguardando Finalização"`

**Quem aplica:** Profissional (via botão "Concluir Serviço")

**Regra de Negócio:** ⚠️ Não pode concluir antes do tempo mínimo

---

### 7️⃣ **Processamento de Pagamento**

**Localização:** `src/services/workflow-simplified.service.ts` - Linha 347-377

```typescript
async processPayment(
  requestId: number,
  adminId: number,
  paymentDate: Date,
  paymentMethod: string,
  paymentNotes?: string
): Promise<boolean> {
  await this.supabase.client
    .from("service_requests")
    .update({
      payment_status: "Paid",
      payment_date: paymentDate.toISOString(),
      payment_method: paymentMethod,
      payment_notes: paymentNotes,
      status: "Pagamento Feito",
    })
    .eq("id", requestId);
}
```

**Status Aplicado:** `"Pagamento Feito"`

**Quem aplica:** Admin (via modal de pagamento)

---

### 8️⃣ **Finalização Completa**

**Localização:** `src/services/workflow-simplified.service.ts` - Linha 386-412

```typescript
async completeRequest(
  requestId: number,
  adminId: number,
  completionNotes?: string
): Promise<boolean> {
  await this.supabase.client
    .from("service_requests")
    .update({
      status: "Concluído",
      completion_date: new Date().toISOString(),
      completed_by_admin_id: adminId,
      completion_notes: completionNotes,
    })
    .eq("id", requestId);
}
```

**Status Aplicado:** `"Concluído"`

**Quem aplica:** Admin (após pagamento)

---

### 9️⃣ **Cancelamento**

**Localização:** `src/app.component.ts` - Linha 474

```typescript
this.dataService.updateServiceRequest(request.id, {
  status: "Cancelado",
});
```

**Status Aplicado:** `"Cancelado"`

**Quem aplica:** Admin ou Profissional (dependendo do momento)

---

## 🔐 Validação de Transições (Sistema Novo)

**Localização:** `src/services/workflow-simplified.service.ts` - Linha 36-69

```typescript
private readonly validTransitions: Record<ServiceStatus, ServiceStatus[]> = {
  "Solicitado": ["Atribuído", "Cancelado"],
  "Atribuído": ["Aguardando Confirmação", "Cancelado"],
  "Aguardando Confirmação": ["Aceito", "Recusado", "Cancelado"],
  "Aceito": ["Data Definida", "Cancelado"],
  "Recusado": [], // Estado final
  "Data Definida": ["Em Progresso", "Cancelado"],
  "Em Progresso": ["Aguardando Finalização", "Cancelado"],
  "Aguardando Finalização": ["Pagamento Feito", "Em Progresso", "Cancelado"],
  "Pagamento Feito": ["Concluído"],
  "Concluído": [], // Estado final
  "Cancelado": [], // Estado final
};
```

### Validação de Permissão

```typescript
canPerformTransition(from: ServiceStatus, to: ServiceStatus, userRole: UserRole): boolean {
  if (!this.canTransition(from, to)) return false;

  if (userRole === "admin") return true; // Admin pode quase tudo

  if (userRole === "professional") {
    const allowedProfessionalTransitions = [
      "Aguardando Confirmação->Aceito",
      "Aguardando Confirmação->Recusado",
      "Aceito->Data Definida",
      "Data Definida->Em Progresso",
      "Em Progresso->Aguardando Finalização",
    ];
    return allowedProfessionalTransitions.includes(`${from}->${to}`);
  }

  return false; // Cliente não pode alterar status
}
```

---

## ⚠️ Problemas Identificados

### 1. **Duplicação de Lógica**

**Problema:** Mesma lógica de mudança de status em múltiplos componentes

**Exemplos:**

- `handleStartService()` em `service-request-details.component.ts` (linha 776)
- `handleStartService()` em `dashboard.component.ts` (linha 146)
- `handleCompleteService()` em `service-request-details.component.ts` (linha 799)
- `handleFinishService()` em `dashboard.component.ts` (linha 119)

**Solução:** Centralizar em `WorkflowServiceSimplified`

---

### 2. **Uso Direto de Strings em Vários Pontos**

**Problema:** Status aplicados diretamente sem passar pelo sistema de validação

**Exemplos:**

```typescript
// ❌ Uso direto (não validado)
await this.dataService.updateServiceRequest(request.id, {
  status: "Em Progresso", // String hardcoded
});

// ✅ Deveria usar
await this.workflowService.startService(requestId, professionalId);
```

**Locais afetados:**

- `app.component.ts` - linhas 465, 474
- `dashboard.component.ts` - linhas 129, 154, 556, 580
- `service-request-details.component.ts` - linhas 779, 802

---

### 3. **Sistema Legado Ainda Presente**

**Localização:** `src/services/data.service.ts` - Linha 22-32

```typescript
// Mapeamento temporário para compatibilidade com código legado
// TODO: Refatorar data.service para usar novo sistema de workflow simplificado
const statusServiceToServiceStatus = {
  [StatusService.Requested]: "Solicitado" as const,
  [StatusService.SearchingProfessional]: "Solicitado" as const,
  // ...
};
```

**Problema:** Ainda usa enum antigo (`StatusService`) que tinha 23 status

---

### 4. **Falta de Uso Consistente do WorkflowService**

**Problema:** Componentes chamam `dataService.updateServiceRequest()` diretamente

**Deveria ser:**

```typescript
// ❌ Atual
await this.dataService.updateServiceRequest(id, { status: "Em Progresso" });

// ✅ Ideal
await this.workflowService.startService(id, professionalId);
```

**Vantagens do WorkflowService:**

- ✅ Valida transições permitidas
- ✅ Verifica permissões de usuário
- ✅ Envia notificações automáticas
- ✅ Registra histórico
- ✅ Aplica regras de negócio

---

## 📊 Fluxo Completo de Status

```
┌─────────────┐
│ Solicitado  │ ← Admin cria
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Atribuído  │ ← Admin atribui profissional
└──────┬──────┘
       │
       ↓
┌──────────────────────┐
│ Aguardando           │ ← Sistema notifica profissional
│ Confirmação          │
└──────┬───────────────┘
       │
       ├─→ ✅ Aceito ──────────┐
       │                       │
       └─→ ❌ Recusado [FIM]   │
                               │
                               ↓
                      ┌─────────────────┐
                      │ Data Definida   │ ← Profissional/Admin agenda
                      └────────┬────────┘
                               │
                               ↓
                      ┌─────────────────┐
                      │ Em Progresso    │ ← Profissional inicia
                      └────────┬────────┘
                               │
                               ↓
                      ┌──────────────────────┐
                      │ Aguardando           │ ← Profissional conclui
                      │ Finalização          │
                      └────────┬─────────────┘
                               │
                               ↓
                      ┌──────────────────┐
                      │ Pagamento Feito  │ ← Admin processa pagamento
                      └────────┬─────────┘
                               │
                               ↓
                      ┌──────────────────┐
                      │   Concluído      │ ← Admin finaliza [FIM]
                      └──────────────────┘

       [Cancelado] pode acontecer em qualquer etapa [FIM]
```

---

## 🎯 Recomendações

### 1. **Refatorar Todos os Componentes**

Substituir chamadas diretas ao `dataService.updateServiceRequest()` por métodos do `WorkflowServiceSimplified`:

```typescript
// Antes
await this.dataService.updateServiceRequest(id, { status: "Em Progresso" });

// Depois
await this.workflowService.startService(id, professionalId);
```

### 2. **Remover Mapeamento Legado**

Eliminar `statusServiceToServiceStatus` de `data.service.ts` e usar status diretos.

### 3. **Centralizar Validações**

Todo componente que muda status deve:

1. Chamar `workflowService.canPerformTransition()` antes
2. Usar métodos específicos do workflow (`startService`, `completeService`, etc.)
3. Não fazer `updateServiceRequest({ status: ... })` direto

### 4. **Adicionar Logs de Auditoria**

Registrar todas as mudanças de status com:

- Quem fez a mudança
- Quando foi feita
- Status anterior → novo status
- Motivo (se aplicável)

### 5. **Testes Automatizados**

Criar testes para validar:

- ✅ Transições permitidas funcionam
- ❌ Transições proibidas são bloqueadas
- ✅ Permissões de role são respeitadas
- ✅ Notificações são enviadas corretamente

---

## 📝 Resumo Executivo

| Aspecto               | Estado Atual                  | Estado Ideal            |
| --------------------- | ----------------------------- | ----------------------- |
| **Sistema de Status** | Duplo (legado + novo)         | Único (workflow)        |
| **Validação**         | Parcial                       | Completa e centralizada |
| **Duplicação**        | Alta (múltiplos componentes)  | Baixa (serviço único)   |
| **Segurança**         | Média (validações espalhadas) | Alta (centralizada)     |
| **Manutenibilidade**  | Difícil (código espalhado)    | Fácil (serviço único)   |
| **Auditoria**         | Não implementada              | Implementada            |
| **Notificações**      | Inconsistentes                | Automáticas             |

**Conclusão:** A aplicação possui a estrutura do sistema novo (`WorkflowServiceSimplified`) mas ainda usa o sistema antigo na prática. É necessária uma refatoração para usar o workflow de forma consistente em todos os componentes.

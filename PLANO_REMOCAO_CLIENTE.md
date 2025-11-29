# Plano de Implementação: Remoção do Papel Cliente

**Data**: 2025-11-29  
**Tipo de Mudança**: Arquitetural (Breaking Change)  
**Complexidade**: ⭐⭐⭐⭐⭐ (Muito Alta)  
**Estimativa**: 25-35 dias de desenvolvimento

---

## 📋 Resumo Executivo

### Modelo Atual

- **Clientes** criam solicitações de serviço
- **Profissionais** respondem com orçamentos
- **Clientes** aprovam orçamentos e definem datas
- Interação bilateral: cliente ↔ profissional

### Novo Modelo

- **Administradores** criam e gerenciam solicitações
- **Profissionais** executam serviços atribuídos
- **Administradores** pagam profissionais e finalizam serviços
- Fluxo unilateral: admin → profissional → admin

---

## 🎯 Objetivos da Mudança

1. ✅ Eliminar participação de clientes na plataforma
2. ✅ Centralizar gestão de serviços no administrador
3. ✅ Simplificar fluxo de trabalho (remover aprovações de cliente)
4. ✅ Implementar gestão de pagamentos administrativos
5. ✅ Manter dados de cliente como informação (não como usuário)

---

## 📊 Análise de Impacto

### Tabelas de Banco de Dados Afetadas

#### `users` (Alteração Moderada)

- ❌ `role = 'client'` será descontinuado
- ✅ Apenas `admin` e `professional` serão válidos
- 📝 Migrar clientes existentes para dados informativos

#### `service_requests` (Alteração Crítica)

```typescript
// ANTES
interface ServiceRequest {
  client_id: number; // FK obrigatória para users
  client_name?: string; // Opcional
  client_email?: string; // Opcional
  client_phone?: string; // Opcional
  // ...
}

// DEPOIS
interface ServiceRequest {
  client_id?: number; // Nullable, deprecated
  client_name: string; // Obrigatório
  client_email: string; // Obrigatório
  client_phone: string; // Obrigatório
  client_address: string; // Novo campo obrigatório
  created_by_admin_id: number; // Nova FK para users (admin)
  paid_by_admin_id?: number; // Nova FK para admin que pagou
  payment_date?: string; // Data do pagamento
  payment_amount?: number; // Valor pago ao profissional
  payment_method?: string; // Método de pagamento
  // ...
}
```

#### `evaluations` (Alteração Crítica)

```sql
-- Remover avaliações de cliente
-- Manter apenas avaliações de profissionais (feitas por admin?)
```

#### `chat_messages` (Alteração Moderada)

- Remover chat entre cliente e profissional
- Implementar apenas chat admin ↔ profissional

#### `notifications` (Alteração Moderada)

- Remover notificações para clientes
- Ajustar templates para fluxo admin ↔ profissional

---

## 🔄 Novo Fluxo de Status

### Simplificação Proposta

```
┌─────────────────────────────────────────────────────────────┐
│                    FASE 1: CRIAÇÃO (Admin)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │    Solicitado     │ ← Admin cria solicitação
                    └─────────┬─────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│              FASE 2: ATRIBUIÇÃO (Admin → Profissional)       │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │     Atribuído     │ ← Admin atribui profissional
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │ Aguard. Confirmação│ ← Profissional foi notificado
                    └─────────┬─────────┘
                              │
                         ┌────┴────┐
                         │         │
                    ┌────▼───┐ ┌──▼────┐
                    │Recusado│ │Aceito │
                    └────────┘ └───┬───┘
                                   │
┌─────────────────────────────────────────────────────────────┐
│              FASE 3: AGENDAMENTO (Profissional)              │
└─────────────────────────────────────────────────────────────┘
                                   │
                         ┌─────────▼─────────┐
                         │   Data Definida   │ ← Profissional define data
                         └─────────┬─────────┘
                                   │
┌─────────────────────────────────────────────────────────────┐
│              FASE 4: EXECUÇÃO (Profissional)                 │
└─────────────────────────────────────────────────────────────┘
                                   │
                         ┌─────────▼─────────┐
                         │   Em Progresso    │ ← Data chegou, serviço iniciou
                         └─────────┬─────────┘
                                   │
                         ┌─────────▼─────────┐
                         │Aguard. Finalização│ ← Profissional marcou como pronto
                         └─────────┬─────────┘
                                   │
┌─────────────────────────────────────────────────────────────┐
│           FASE 5: FINALIZAÇÃO (Admin → Profissional)         │
└─────────────────────────────────────────────────────────────┘
                                   │
                         ┌─────────▼─────────┐
                         │  Pagamento Feito  │ ← Admin registra pagamento
                         └─────────┬─────────┘
                                   │
                         ┌─────────▼─────────┐
                         │    Concluído      │ ← Admin finaliza
                         └───────────────────┘

                         ┌───────────────────┐
                         │    Cancelado      │ ← Admin ou sistema cancela
                         └───────────────────┘
```

### Status Finais (11 Status)

1. **Solicitado** - Admin criou a solicitação
2. **Atribuído** - Admin atribuiu a um profissional
3. **Aguardando Confirmação** - Profissional foi notificado
4. **Aceito** - Profissional aceitou o serviço
5. **Recusado** - Profissional recusou o serviço
6. **Data Definida** - Profissional definiu data de execução
7. **Em Progresso** - Serviço está sendo executado
8. **Aguardando Finalização** - Profissional sinalizou conclusão
9. **Pagamento Feito** - Admin registrou pagamento ao profissional
10. **Concluído** - Admin finalizou o serviço
11. **Cancelado** - Serviço foi cancelado

---

## 🗂️ Estrutura de Implementação

### Sprint 1: Modelos e Banco de Dados (5-7 dias)

#### 1.1 Atualizar TypeScript Interfaces

**Arquivos:**

- `src/models/maintenance.models.ts`

**Mudanças:**

```typescript
// Atualizar User role
export type UserRole = "admin" | "professional"; // Remover 'client'

// Atualizar ServiceStatus
export type ServiceStatus =
  | "Solicitado"
  | "Atribuído"
  | "Aguardando Confirmação"
  | "Aceito"
  | "Recusado"
  | "Data Definida"
  | "Em Progresso"
  | "Aguardando Finalização"
  | "Pagamento Feito"
  | "Concluído"
  | "Cancelado";

// Atualizar ServiceRequest interface
export interface ServiceRequest {
  id: number;

  // DADOS DO CLIENTE (informativo, não FK)
  client_id?: number; // DEPRECATED - manter por compatibilidade
  client_name: string; // OBRIGATÓRIO
  client_email: string; // OBRIGATÓRIO
  client_phone: string; // OBRIGATÓRIO
  client_address: string; // NOVO - endereço completo
  client_postal_code?: string; // NOVO - código postal
  client_locality?: string; // NOVO - localidade

  // DADOS ADMINISTRATIVOS
  created_by_admin_id: number; // NOVO - FK para users (admin que criou)
  assigned_by_admin_id?: number; // NOVO - FK para users (admin que atribuiu)
  paid_by_admin_id?: number; // NOVO - FK para users (admin que pagou)
  finalized_by_admin_id?: number; // NOVO - FK para users (admin que finalizou)

  // DADOS DO PROFISSIONAL
  professional_id?: number; // FK para users (profissional atribuído)
  professional_name?: string;

  // DADOS DO SERVIÇO
  category: string;
  subcategory: string;
  description: string;
  priority: "Baixa" | "Média" | "Alta" | "Urgente";
  status: ServiceStatus;

  // DATAS E PRAZOS
  created_at: string;
  scheduled_date?: string; // Data agendada pelo profissional
  started_at?: string; // Data de início da execução
  completed_at?: string; // Data de conclusão pelo profissional
  finalized_at?: string; // Data de finalização pelo admin

  // PAGAMENTO
  payment_date?: string; // NOVO - Data do pagamento
  payment_amount?: number; // NOVO - Valor pago ao profissional
  payment_method?: "Dinheiro" | "Transferência" | "PIX" | "Cheque"; // NOVO
  payment_notes?: string; // NOVO - Observações do pagamento

  // REMOVER CAMPOS DE ORÇAMENTO
  // quote_amount?: number;        // REMOVER
  // quote_description?: string;   // REMOVER
  // quote_sent_at?: string;       // REMOVER
  // budget_approved_at?: string;  // REMOVER

  // OUTROS
  photos?: string[];
  documents?: string[];
  notes?: string;
  admin_notes?: string; // NOVO - Notas internas do admin
}
```

#### 1.2 Script de Migração SQL

**Arquivo:** `sql/migrations/remove_client_role.sql`

```sql
-- ============================================================================
-- Script de Migração: Remoção do Papel Cliente
-- Data: 2025-11-29
-- Descrição: Centraliza gestão de serviços no administrador
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASSO 1: Adicionar novos campos em service_requests
-- ============================================================================

ALTER TABLE service_requests
  -- Tornar client_id nullable
  ALTER COLUMN client_id DROP NOT NULL,

  -- Tornar campos de cliente obrigatórios
  ALTER COLUMN client_name SET NOT NULL,
  ALTER COLUMN client_email SET NOT NULL,
  ALTER COLUMN client_phone SET NOT NULL,

  -- Adicionar novos campos de cliente
  ADD COLUMN IF NOT EXISTS client_address TEXT,
  ADD COLUMN IF NOT EXISTS client_postal_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS client_locality VARCHAR(255),

  -- Adicionar campos administrativos
  ADD COLUMN IF NOT EXISTS created_by_admin_id INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS assigned_by_admin_id INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS paid_by_admin_id INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS finalized_by_admin_id INTEGER REFERENCES users(id),

  -- Adicionar campos de pagamento
  ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payment_notes TEXT,

  -- Adicionar notas administrativas
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,

  -- Adicionar timestamps de execução
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- PASSO 2: Migrar dados existentes
-- ============================================================================

-- Preencher created_by_admin_id com primeiro admin encontrado
UPDATE service_requests sr
SET created_by_admin_id = (
  SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1
)
WHERE created_by_admin_id IS NULL;

-- Preencher client_address com dados de endereço se existirem
UPDATE service_requests
SET client_address = COALESCE(
  address || ', ' || COALESCE(locality, '') || ' ' || COALESCE(postal_code, ''),
  'Endereço não especificado'
)
WHERE client_address IS NULL;

-- ============================================================================
-- PASSO 3: Remover campos de orçamento (budget/quote)
-- ============================================================================

ALTER TABLE service_requests
  DROP COLUMN IF EXISTS quote_amount,
  DROP COLUMN IF EXISTS quote_description,
  DROP COLUMN IF EXISTS quote_sent_at,
  DROP COLUMN IF EXISTS budget_approved_at;

-- ============================================================================
-- PASSO 4: Atualizar status existentes para novo sistema
-- ============================================================================

UPDATE service_requests
SET status = CASE
  -- Mapeamento de status antigos para novos
  WHEN status = 'Pendente' THEN 'Solicitado'
  WHEN status = 'Orçamento Enviado' THEN 'Atribuído'
  WHEN status = 'Orçamento Aprovado' THEN 'Aceito'
  WHEN status IN ('Aguardando Aprovação de Data', 'Data Aprovada') THEN 'Data Definida'
  WHEN status = 'Em Andamento' THEN 'Em Progresso'
  WHEN status = 'Aguardando Confirmação de Conclusão' THEN 'Aguardando Finalização'
  WHEN status = 'Concluído' THEN 'Concluído'
  WHEN status = 'Cancelado' THEN 'Cancelado'
  ELSE 'Solicitado'
END;

-- ============================================================================
-- PASSO 5: Atualizar políticas RLS
-- ============================================================================

-- Remover políticas antigas baseadas em cliente
DROP POLICY IF EXISTS "Clients can view own requests" ON service_requests;
DROP POLICY IF EXISTS "Clients can create requests" ON service_requests;
DROP POLICY IF EXISTS "Clients can update own requests" ON service_requests;

-- Criar novas políticas para admins
CREATE POLICY "Admins can manage all requests"
  ON service_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Profissionais podem ver suas solicitações
CREATE POLICY "Professionals can view assigned requests"
  ON service_requests
  FOR SELECT
  TO authenticated
  USING (
    professional_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Profissionais podem atualizar suas solicitações
CREATE POLICY "Professionals can update assigned requests"
  ON service_requests
  FOR UPDATE
  TO authenticated
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

-- ============================================================================
-- PASSO 6: Deprecar usuários com role = 'client'
-- ============================================================================

-- Adicionar coluna de deprecação
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deprecated_role VARCHAR(50);

-- Marcar clientes como deprecated
UPDATE users
SET deprecated_role = 'client',
    role = 'professional', -- Temporário para evitar erros
    status = 'inactive'
WHERE role = 'client';

-- Adicionar constraint para permitir apenas admin e professional
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'professional'));

-- ============================================================================
-- PASSO 7: Atualizar tabela de chat_messages
-- ============================================================================

-- Adicionar constraint para permitir apenas admin e professional no chat
-- (remover se houver mensagens antigas de clientes)

COMMENT ON COLUMN chat_messages.sender_id IS
  'FK para users - apenas admin ou professional';

-- ============================================================================
-- PASSO 8: Limpar avaliações de cliente
-- ============================================================================

-- Deprecar avaliações feitas por clientes
ALTER TABLE evaluations
  ADD COLUMN IF NOT EXISTS deprecated BOOLEAN DEFAULT FALSE;

UPDATE evaluations
SET deprecated = TRUE
WHERE evaluator_id IN (
  SELECT id FROM users WHERE deprecated_role = 'client'
);

-- ============================================================================
-- PASSO 9: Verificações finais
-- ============================================================================

-- Verificar estrutura atualizada
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'service_requests'
AND column_name IN (
  'client_id', 'client_name', 'client_email', 'client_phone',
  'client_address', 'created_by_admin_id', 'payment_date',
  'payment_amount', 'payment_method'
)
ORDER BY ordinal_position;

-- Contar registros migrados
SELECT
  COUNT(*) as total_requests,
  COUNT(created_by_admin_id) as with_admin_creator,
  COUNT(client_address) as with_client_address,
  COUNT(DISTINCT status) as unique_statuses
FROM service_requests;

-- Verificar usuários
SELECT
  role,
  deprecated_role,
  COUNT(*) as total
FROM users
GROUP BY role, deprecated_role;

COMMIT;

-- ============================================================================
-- ROLLBACK (se necessário)
-- ============================================================================
-- BEGIN;
--
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
-- UPDATE users SET role = deprecated_role WHERE deprecated_role IS NOT NULL;
-- ALTER TABLE users DROP COLUMN IF EXISTS deprecated_role;
--
-- -- Reverter outras mudanças conforme necessário
--
-- COMMIT;
-- ============================================================================
```

---

### Sprint 2: Serviços e Lógica de Negócio (5-7 dias)

#### 2.1 Atualizar DataService

**Arquivo:** `src/services/data.service.ts`

**Mudanças principais:**

```typescript
// Método para criar solicitação (somente admin)
async createAdminServiceRequest(
  requestData: Partial<ServiceRequest>,
  adminId: number
): Promise<ServiceRequest | null> {
  try {
    // Validar que o usuário é admin
    const admin = await this.getUserById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('Apenas administradores podem criar solicitações');
    }

    const newRequest: Partial<ServiceRequest> = {
      ...requestData,
      created_by_admin_id: adminId,
      status: 'Solicitado',
      created_at: new Date().toISOString(),
      // Não atribuir professional_id ainda
    };

    const { data, error } = await this.supabase.client
      .from('service_requests')
      .insert([newRequest])
      .select('*')
      .single();

    if (error) throw error;

    await this.refreshServiceRequests();
    this.notificationService.show('Solicitação criada com sucesso', 'success');

    return data;
  } catch (error) {
    console.error('Erro ao criar solicitação:', error);
    this.notificationService.show('Erro ao criar solicitação', 'error');
    return null;
  }
}

// Método para atribuir profissional (somente admin)
async assignProfessionalToRequest(
  requestId: number,
  professionalId: number,
  adminId: number
): Promise<boolean> {
  try {
    const { error } = await this.supabase.client
      .from('service_requests')
      .update({
        professional_id: professionalId,
        assigned_by_admin_id: adminId,
        status: 'Atribuído'
      })
      .eq('id', requestId);

    if (error) throw error;

    await this.refreshServiceRequests();

    // Notificar profissional
    await this.notificationService.sendNotification(
      professionalId,
      'Nova solicitação atribuída',
      'Você tem uma nova solicitação de serviço'
    );

    return true;
  } catch (error) {
    console.error('Erro ao atribuir profissional:', error);
    return false;
  }
}

// Método para profissional aceitar/recusar solicitação
async respondToAssignment(
  requestId: number,
  professionalId: number,
  accept: boolean
): Promise<boolean> {
  try {
    const { error } = await this.supabase.client
      .from('service_requests')
      .update({
        status: accept ? 'Aceito' : 'Recusado'
      })
      .eq('id', requestId)
      .eq('professional_id', professionalId);

    if (error) throw error;

    await this.refreshServiceRequests();

    // Notificar admin
    const request = this.getServiceRequestById(requestId);
    if (request?.created_by_admin_id) {
      await this.notificationService.sendNotification(
        request.created_by_admin_id,
        accept ? 'Solicitação aceita' : 'Solicitação recusada',
        `Profissional ${accept ? 'aceitou' : 'recusou'} a solicitação #${requestId}`
      );
    }

    return true;
  } catch (error) {
    console.error('Erro ao responder atribuição:', error);
    return false;
  }
}

// Método para registrar pagamento (somente admin)
async registerPayment(
  requestId: number,
  adminId: number,
  paymentData: {
    amount: number;
    method: string;
    notes?: string;
  }
): Promise<boolean> {
  try {
    const { error } = await this.supabase.client
      .from('service_requests')
      .update({
        payment_date: new Date().toISOString(),
        payment_amount: paymentData.amount,
        payment_method: paymentData.method,
        payment_notes: paymentData.notes,
        paid_by_admin_id: adminId,
        status: 'Pagamento Feito'
      })
      .eq('id', requestId);

    if (error) throw error;

    await this.refreshServiceRequests();

    // Notificar profissional
    const request = this.getServiceRequestById(requestId);
    if (request?.professional_id) {
      await this.notificationService.sendNotification(
        request.professional_id,
        'Pagamento registrado',
        `O pagamento do serviço #${requestId} foi registrado`
      );
    }

    return true;
  } catch (error) {
    console.error('Erro ao registrar pagamento:', error);
    return false;
  }
}

// Método para finalizar serviço (somente admin)
async finalizeServiceRequest(
  requestId: number,
  adminId: number,
  adminNotes?: string
): Promise<boolean> {
  try {
    const { error } = await this.supabase.client
      .from('service_requests')
      .update({
        finalized_at: new Date().toISOString(),
        finalized_by_admin_id: adminId,
        admin_notes: adminNotes,
        status: 'Concluído'
      })
      .eq('id', requestId);

    if (error) throw error;

    await this.refreshServiceRequests();

    this.notificationService.show('Serviço finalizado com sucesso', 'success');

    return true;
  } catch (error) {
    console.error('Erro ao finalizar serviço:', error);
    return false;
  }
}
```

#### 2.2 Atualizar WorkflowService

**Arquivo:** `src/services/workflow.service.ts`

**Novo mapeamento de transições:**

```typescript
private validTransitions: Record<ServiceStatus, ServiceStatus[]> = {
  'Solicitado': ['Atribuído', 'Cancelado'],
  'Atribuído': ['Aguardando Confirmação', 'Cancelado'],
  'Aguardando Confirmação': ['Aceito', 'Recusado', 'Cancelado'],
  'Aceito': ['Data Definida', 'Cancelado'],
  'Recusado': [], // Estado final
  'Data Definida': ['Em Progresso', 'Cancelado'],
  'Em Progresso': ['Aguardando Finalização', 'Cancelado'],
  'Aguardando Finalização': ['Pagamento Feito', 'Em Progresso', 'Cancelado'],
  'Pagamento Feito': ['Concluído'],
  'Concluído': [], // Estado final
  'Cancelado': [], // Estado final
};

// Validar permissões por papel
canPerformTransition(
  from: ServiceStatus,
  to: ServiceStatus,
  userRole: UserRole
): boolean {
  // Verificar se a transição é válida
  if (!this.validTransitions[from]?.includes(to)) {
    return false;
  }

  // Admin pode fazer quase todas as transições
  if (userRole === 'admin') {
    return true;
  }

  // Profissional pode:
  // - Aceitar/Recusar atribuição
  // - Definir data
  // - Marcar como em progresso
  // - Marcar como aguardando finalização
  if (userRole === 'professional') {
    const allowedTransitions = [
      'Aguardando Confirmação->Aceito',
      'Aguardando Confirmação->Recusado',
      'Aceito->Data Definida',
      'Data Definida->Em Progresso',
      'Em Progresso->Aguardando Finalização'
    ];
    return allowedTransitions.includes(`${from}->${to}`);
  }

  return false;
}
```

---

### Sprint 3: Componentes e UI (6-8 dias)

#### 3.1 Atualizar Admin Dashboard

**Arquivo:** `src/components/admin-dashboard/admin-dashboard.component.ts`

**Novas funcionalidades:**

```typescript
export class AdminDashboardComponent {
  // Signals
  private allRequests = this.dataService.serviceRequests;
  currentView = signal<
    "overview" | "create" | "assign" | "payment" | "finalize"
  >("overview");
  selectedRequest = signal<ServiceRequest | null>(null);

  // Computed signals
  pendingAssignment = computed(() =>
    this.allRequests().filter((r) => r.status === "Solicitado")
  );

  waitingConfirmation = computed(() =>
    this.allRequests().filter((r) => r.status === "Aguardando Confirmação")
  );

  inProgress = computed(() =>
    this.allRequests().filter((r) =>
      ["Aceito", "Data Definida", "Em Progresso"].includes(r.status)
    )
  );

  waitingPayment = computed(() =>
    this.allRequests().filter((r) => r.status === "Aguardando Finalização")
  );

  paid = computed(() =>
    this.allRequests().filter((r) => r.status === "Pagamento Feito")
  );

  // Métodos
  createNewRequest() {
    this.currentView.set("create");
  }

  assignProfessional(request: ServiceRequest) {
    this.selectedRequest.set(request);
    this.currentView.set("assign");
  }

  registerPayment(request: ServiceRequest) {
    this.selectedRequest.set(request);
    this.currentView.set("payment");
  }

  finalizeService(request: ServiceRequest) {
    this.selectedRequest.set(request);
    this.currentView.set("finalize");
  }
}
```

**Template:**

```html
<div class="admin-dashboard mobile-safe">
  <!-- Header com estatísticas -->
  <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
    <div class="stat-card">
      <h3>{{ 'pendingAssignment' | i18n }}</h3>
      <p class="text-3xl font-bold">{{ pendingAssignment().length }}</p>
    </div>
    <div class="stat-card">
      <h3>{{ 'waitingConfirmation' | i18n }}</h3>
      <p class="text-3xl font-bold">{{ waitingConfirmation().length }}</p>
    </div>
    <div class="stat-card">
      <h3>{{ 'inProgress' | i18n }}</h3>
      <p class="text-3xl font-bold">{{ inProgress().length }}</p>
    </div>
    <div class="stat-card">
      <h3>{{ 'waitingPayment' | i18n }}</h3>
      <p class="text-3xl font-bold">{{ waitingPayment().length }}</p>
    </div>
    <div class="stat-card">
      <h3>{{ 'paidServices' | i18n }}</h3>
      <p class="text-3xl font-bold">{{ paid().length }}</p>
    </div>
  </div>

  <!-- Ações principais -->
  <div class="actions mb-6">
    <button (click)="createNewRequest()" class="btn btn-primary">
      <i class="fas fa-plus"></i>
      {{ 'createServiceRequest' | i18n }}
    </button>
  </div>

  <!-- Switch de visualizações -->
  @switch (currentView()) { @case ('overview') {
  <!-- Lista de solicitações agrupadas por status -->
  <app-admin-requests-overview
    [pendingAssignment]="pendingAssignment()"
    [waitingConfirmation]="waitingConfirmation()"
    [inProgress]="inProgress()"
    [waitingPayment]="waitingPayment()"
    [paid]="paid()"
    (assign)="assignProfessional($event)"
    (payment)="registerPayment($event)"
    (finalize)="finalizeService($event)"
  />
  } @case ('create') {
  <app-admin-service-request-form
    (close)="currentView.set('overview')"
    (created)="currentView.set('overview')"
  />
  } @case ('assign') {
  <app-professional-assignment-modal
    [request]="selectedRequest()!"
    (close)="currentView.set('overview')"
    (assigned)="currentView.set('overview')"
  />
  } @case ('payment') {
  <app-payment-registration-modal
    [request]="selectedRequest()!"
    (close)="currentView.set('overview')"
    (paid)="currentView.set('overview')"
  />
  } @case ('finalize') {
  <app-service-finalization-modal
    [request]="selectedRequest()!"
    (close)="currentView.set('overview')"
    (finalized)="currentView.set('overview')"
  />
  } }
</div>
```

#### 3.2 Criar Payment Registration Modal

**Arquivo:** `src/components/payment-registration-modal/payment-registration-modal.component.ts`

```typescript
import { Component, input, output, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ServiceRequest } from "../../models/maintenance.models";
import { DataService } from "../../services/data.service";
import { AuthService } from "../../services/auth.service";
import { I18nPipe } from "../../pipes/i18n.pipe";

@Component({
  selector: "app-payment-registration-modal",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ "registerPayment" | i18n }}</h2>
          <button (click)="close.emit()" class="close-btn">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Informações do serviço -->
          <div class="service-info mb-4">
            <h3>{{ "serviceDetails" | i18n }}</h3>
            <p>
              <strong>{{ "professional" | i18n }}:</strong>
              {{ request().professional_name }}
            </p>
            <p>
              <strong>{{ "client" | i18n }}:</strong>
              {{ request().client_name }}
            </p>
            <p>
              <strong>{{ "category" | i18n }}:</strong> {{ request().category }}
            </p>
            <p>
              <strong>{{ "completedAt" | i18n }}:</strong>
              {{ request().completed_at | date }}
            </p>
          </div>

          <!-- Formulário de pagamento -->
          <form (ngSubmit)="submitPayment()">
            <div class="form-group">
              <label for="amount">{{ "paymentAmount" | i18n }} *</label>
              <input
                type="number"
                id="amount"
                [(ngModel)]="paymentAmount"
                name="amount"
                step="0.01"
                min="0"
                required
                class="form-control"
              />
            </div>

            <div class="form-group">
              <label for="method">{{ "paymentMethod" | i18n }} *</label>
              <select
                id="method"
                [(ngModel)]="paymentMethod"
                name="method"
                required
                class="form-control"
              >
                <option value="">{{ "selectMethod" | i18n }}</option>
                <option value="Dinheiro">{{ "cash" | i18n }}</option>
                <option value="Transferência">{{ "transfer" | i18n }}</option>
                <option value="PIX">PIX</option>
                <option value="Cheque">{{ "check" | i18n }}</option>
              </select>
            </div>

            <div class="form-group">
              <label for="notes">{{ "paymentNotes" | i18n }}</label>
              <textarea
                id="notes"
                [(ngModel)]="paymentNotes"
                name="notes"
                rows="3"
                class="form-control"
              ></textarea>
            </div>

            <div class="modal-footer">
              <button
                type="button"
                (click)="close.emit()"
                class="btn btn-secondary"
              >
                {{ "cancel" | i18n }}
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="saving()"
              >
                {{ saving() ? ("saving" | i18n) : ("registerPayment" | i18n) }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal-content {
        background: white;
        border-radius: 8px;
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
      }

      .service-info {
        background: #f5f5f5;
        padding: 1rem;
        border-radius: 4px;
      }
    `,
  ],
})
export class PaymentRegistrationModalComponent {
  request = input.required<ServiceRequest>();
  close = output<void>();
  paid = output<void>();

  private dataService = inject(DataService);
  private authService = inject(AuthService);

  paymentAmount = signal<number>(0);
  paymentMethod = signal<string>("");
  paymentNotes = signal<string>("");
  saving = signal<boolean>(false);

  async submitPayment() {
    this.saving.set(true);

    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.saving.set(false);
      return;
    }

    const success = await this.dataService.registerPayment(
      this.request().id,
      currentUser.id,
      {
        amount: this.paymentAmount(),
        method: this.paymentMethod(),
        notes: this.paymentNotes(),
      }
    );

    this.saving.set(false);

    if (success) {
      this.paid.emit();
    }
  }
}
```

#### 3.3 Atualizar Formulário de Criação de Solicitação

**Arquivo:** `src/components/admin-service-request-form/admin-service-request-form.component.ts`

**Mudanças:**

- Remover FK para cliente (não vincular a usuário)
- Campos de cliente são informativos (nome, email, telefone, endereço)
- Não permite seleção de profissional na criação (atribuição é separada)

```typescript
export class AdminServiceRequestFormComponent {
  // Dados do cliente (informativos)
  clientName = signal<string>("");
  clientEmail = signal<string>("");
  clientPhone = signal<string>("");
  clientAddress = signal<string>("");
  clientPostalCode = signal<string>("");
  clientLocality = signal<string>("");

  // Dados do serviço
  category = signal<string>("");
  subcategory = signal<string>("");
  description = signal<string>("");
  priority = signal<"Baixa" | "Média" | "Alta" | "Urgente">("Média");

  async submitRequest() {
    const currentUser = this.authService.currentUser();
    if (!currentUser || currentUser.role !== "admin") {
      this.notificationService.show(
        "Apenas administradores podem criar solicitações",
        "error"
      );
      return;
    }

    const requestData: Partial<ServiceRequest> = {
      // Dados do cliente (não FK)
      client_name: this.clientName(),
      client_email: this.clientEmail(),
      client_phone: this.clientPhone(),
      client_address: this.clientAddress(),
      client_postal_code: this.clientPostalCode(),
      client_locality: this.clientLocality(),

      // Dados do serviço
      category: this.category(),
      subcategory: this.subcategory(),
      description: this.description(),
      priority: this.priority(),

      // Não atribuir profissional ainda
      // professional_id será definido na atribuição
    };

    const result = await this.dataService.createAdminServiceRequest(
      requestData,
      currentUser.id
    );

    if (result) {
      this.created.emit();
    }
  }
}
```

---

### Sprint 4: Remoção de Funcionalidades de Cliente (4-5 dias)

#### 4.1 Componentes a Remover

```typescript
// Componentes que serão DELETADOS:
- src/components/client-dashboard/
- src/components/client-service-request-form/
- src/components/budget-approval-modal/ (aprovação de orçamento pelo cliente)
```

#### 4.2 Componentes a Adaptar

```typescript
// Chat: apenas admin ↔ profissional
- src/components/chat/chat.component.ts
  - Remover lógica para cliente
  - Permitir apenas admin e professional

// Notificações: remover templates de cliente
- src/services/notification.service.ts
  - Remover notificações para cliente
  - Adicionar notificações admin → profissional
  - Adicionar notificações profissional → admin

// Avaliações: apenas admin avalia profissional?
- src/components/evaluation/
  - Definir novo modelo de avaliação
  - Admin avalia profissional após conclusão?
```

#### 4.3 Atualizar Rotas

**Arquivo:** `src/app/app.routes.ts`

```typescript
export const routes: Routes = [
  { path: "", redirectTo: "/login", pathMatch: "full" },
  { path: "login", component: LoginComponent },
  { path: "signup", component: SignupComponent }, // Restrito a admin/professional

  // REMOVER rota de cliente
  // { path: 'client-dashboard', component: ClientDashboardComponent },

  {
    path: "admin-dashboard",
    component: AdminDashboardComponent,
    canActivate: [AuthGuard],
    data: { roles: ["admin"] },
  },
  {
    path: "professional-dashboard",
    component: ProfessionalDashboardComponent,
    canActivate: [AuthGuard],
    data: { roles: ["professional"] },
  },
  {
    path: "profile",
    component: ProfileComponent,
    canActivate: [AuthGuard],
  },
  { path: "**", redirectTo: "/login" },
];
```

---

### Sprint 5: Testes e Validação (3-4 dias)

#### 5.1 Testes Unitários

```typescript
// Testar novos métodos do DataService
describe('DataService - Admin Operations', () => {
  it('should create service request with admin ID', async () => {
    const request = await dataService.createAdminServiceRequest({...}, adminId);
    expect(request.created_by_admin_id).toBe(adminId);
    expect(request.status).toBe('Solicitado');
  });

  it('should not allow non-admin to create requests', async () => {
    const result = await dataService.createAdminServiceRequest({...}, professionalId);
    expect(result).toBeNull();
  });

  it('should assign professional to request', async () => {
    const success = await dataService.assignProfessionalToRequest(requestId, proId, adminId);
    expect(success).toBe(true);
  });

  it('should register payment correctly', async () => {
    const success = await dataService.registerPayment(requestId, adminId, {...});
    expect(success).toBe(true);
  });
});
```

#### 5.2 Testes de Integração

```typescript
// Testar fluxo completo
describe("Complete Admin-Professional Workflow", () => {
  it("should complete full lifecycle", async () => {
    // 1. Admin cria solicitação
    const request = await createRequest();
    expect(request.status).toBe("Solicitado");

    // 2. Admin atribui profissional
    await assignProfessional(request.id, professionalId);
    expect(request.status).toBe("Atribuído");

    // 3. Profissional aceita
    await professionalAccept(request.id);
    expect(request.status).toBe("Aceito");

    // 4. Profissional define data
    await setScheduledDate(request.id);
    expect(request.status).toBe("Data Definida");

    // 5. Profissional executa
    await startExecution(request.id);
    expect(request.status).toBe("Em Progresso");

    // 6. Profissional marca como pronto
    await markAsCompleted(request.id);
    expect(request.status).toBe("Aguardando Finalização");

    // 7. Admin registra pagamento
    await registerPayment(request.id);
    expect(request.status).toBe("Pagamento Feito");

    // 8. Admin finaliza
    await finalizeService(request.id);
    expect(request.status).toBe("Concluído");
  });
});
```

---

### Sprint 6: Documentação e Deploy (2-3 dias)

#### 6.1 Documentação

```markdown
# Guia de Migração - Remoção do Papel Cliente

## Mudanças Principais

1. **Clientes não são mais usuários da plataforma**
2. **Administradores gerenciam todo o ciclo de vida**
3. **Profissionais executam serviços atribuídos**
4. **Novo sistema de pagamento administrativo**

## Fluxo de Trabalho

### 1. Criação de Solicitação (Admin)

- Admin acessa dashboard
- Clica em "Criar Solicitação"
- Preenche dados do cliente (informativo)
- Preenche dados do serviço
- Salva como "Solicitado"

### 2. Atribuição (Admin)

- Admin seleciona solicitação pendente
- Escolhe profissional disponível
- Atribui serviço
- Status muda para "Atribuído"

### 3. Confirmação (Profissional)

- Profissional recebe notificação
- Aceita ou recusa o serviço
- Status muda para "Aceito" ou "Recusado"

### 4. Agendamento (Profissional)

- Profissional define data de execução
- Status muda para "Data Definida"

### 5. Execução (Profissional)

- Na data agendada, inicia execução
- Status muda para "Em Progresso"
- Ao concluir, marca como pronto
- Status muda para "Aguardando Finalização"

### 6. Pagamento (Admin)

- Admin verifica conclusão
- Registra pagamento ao profissional
- Status muda para "Pagamento Feito"

### 7. Finalização (Admin)

- Admin finaliza o serviço
- Adiciona notas administrativas (opcional)
- Status muda para "Concluído"

## Migração de Dados

### Clientes Existentes

- Usuários com role='client' serão marcados como inativos
- Dados são preservados em `deprecated_role`
- Solicitações antigas mantêm `client_id` para histórico

### Solicitações Existentes

- Status serão mapeados para novo sistema
- Campos de orçamento serão removidos
- Novos campos administrativos serão preenchidos
```

---

## 📅 Cronograma Estimado

| Sprint | Descrição                  | Dias | Acumulado   |
| ------ | -------------------------- | ---- | ----------- |
| 1      | Modelos e Banco de Dados   | 5-7  | 7 dias      |
| 2      | Serviços e Lógica          | 5-7  | 14 dias     |
| 3      | Componentes e UI           | 6-8  | 22 dias     |
| 4      | Remoção de Funcionalidades | 4-5  | 27 dias     |
| 5      | Testes e Validação         | 3-4  | 31 dias     |
| 6      | Documentação e Deploy      | 2-3  | **34 dias** |

**Total: 25-35 dias** (aproximadamente 5-7 semanas)

---

## ⚠️ Riscos e Mitigações

### Risco 1: Perda de Dados

**Mitigação:**

- Backup completo antes da migração
- Manter campos deprecados por período de transição
- Validação extensiva pós-migração

### Risco 2: Interrupção de Serviço

**Mitigação:**

- Executar migração em horário de baixo uso
- Manter versão anterior como fallback
- Testes em ambiente de staging

### Risco 3: Resistência à Mudança

**Mitigação:**

- Documentação clara do novo fluxo
- Treinamento para administradores
- Suporte durante transição

---

## ✅ Checklist de Implementação

### Banco de Dados

- [ ] Criar script de migração SQL
- [ ] Testar em ambiente de desenvolvimento
- [ ] Fazer backup de produção
- [ ] Executar migração em produção
- [ ] Validar integridade dos dados

### Código

- [ ] Atualizar interfaces TypeScript
- [ ] Modificar DataService
- [ ] Atualizar WorkflowService
- [ ] Criar novos componentes (Payment, Finalization)
- [ ] Atualizar Admin Dashboard
- [ ] Atualizar Professional Dashboard
- [ ] Remover componentes de cliente
- [ ] Atualizar rotas
- [ ] Ajustar AuthService e guards

### Testes

- [ ] Testes unitários (DataService)
- [ ] Testes unitários (WorkflowService)
- [ ] Testes de componentes
- [ ] Testes de integração (fluxo completo)
- [ ] Testes E2E

### Documentação

- [ ] Guia de migração
- [ ] Documentação do novo fluxo
- [ ] Atualizar README
- [ ] Criar release notes

### Deploy

- [ ] Deploy em staging
- [ ] Validação em staging
- [ ] Deploy em produção
- [ ] Monitoramento pós-deploy
- [ ] Comunicação aos usuários

---

## 🔄 Próximos Passos

**Quer que eu:**

1. **Comece a implementação pelo Sprint 1** (modelos e banco de dados)?
2. **Crie um branch específico** para esta feature?
3. **Revise alguma parte específica** do plano em mais detalhes?
4. **Implemente algum componente específico** primeiro para validação?

**Por favor, confirme se:**

- ✅ O novo fluxo de 11 status está correto
- ✅ A gestão de pagamentos atende às necessidades
- ✅ Não há funcionalidades de cliente que devam ser preservadas
- ✅ A estimativa de tempo é aceitável

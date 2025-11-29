# Guia de Auditoria e Validações de Status

## 📋 Visão Geral

Este documento descreve o sistema completo de auditoria e validações implementado para rastreamento de mudanças de status na plataforma HomeService.

## 🔍 Sistema de Auditoria

### StatusAuditService

Serviço centralizado para registrar todas as mudanças de status com:

- **Timestamp**: Data e hora exata da mudança
- **Usuário**: Quem realizou a mudança (ID + role)
- **Status**: Estado anterior e novo estado
- **Motivo**: Razão da mudança (obrigatório para cancelamentos)
- **Metadata**: Dados adicionais (pagamentos, agendamentos, etc.)

#### Métodos Disponíveis

```typescript
// Registrar mudança de status
logStatusChange(
  requestId: number,
  previousStatus: ServiceStatus | null,
  newStatus: ServiceStatus,
  reason?: string,
  metadata?: Record<string, any>
): Promise<boolean>

// Obter histórico completo de uma solicitação
getRequestHistory(requestId: number): Promise<StatusAuditEntry[]>

// Consultar histórico com filtros
getHistory(query: StatusHistoryQuery): Promise<StatusAuditEntry[]>

// Obter estatísticas de mudanças
getStatusChangeStats(): Promise<any>

// Última mudança de uma solicitação
getLastStatusChange(requestId: number): Promise<StatusAuditEntry | null>

// Verificar se transição já ocorreu
hasTransitionOccurred(
  requestId: number,
  from: ServiceStatus,
  to: ServiceStatus
): Promise<boolean>
```

### Estrutura da Tabela status_audit_log

```sql
CREATE TABLE status_audit_log (
  id BIGSERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  previous_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  changed_by_role VARCHAR(20) NOT NULL CHECK (changed_by_role IN ('admin', 'professional', 'client')),
  reason TEXT,
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Índices para Performance

1. **idx_audit_request**: `request_id` - consultas por solicitação
2. **idx_audit_user**: `changed_by_user_id` - consultas por usuário
3. **idx_audit_timestamp**: `timestamp DESC` - consultas cronológicas
4. **idx_audit_new_status**: `new_status` - filtro por status
5. **idx_audit_composite**: `(request_id, timestamp DESC)` - histórico ordenado

#### Políticas RLS (Row Level Security)

- **Admins**: Visualizam todo o histórico
- **Profissionais**: Visualizam apenas suas solicitações
- **Clientes**: Visualizam apenas suas solicitações
- **Service Role**: Pode inserir registros (para operações do sistema)

## ✅ Validações Implementadas

### 1. Validação de Transições

Todas as mudanças de status verificam se a transição é permitida:

```typescript
if (!this.canTransition(previousStatus, newStatus)) {
  throw new Error(
    `Não é possível mudar de ${previousStatus} para ${newStatus}`
  );
}
```

### 2. Validação de Permissões

Verifica se o usuário tem permissão para executar a transição:

```typescript
if (!this.canPerformTransition(previousStatus, newStatus, currentUser.role)) {
  throw new Error("Usuário não tem permissão para esta transição");
}
```

### 3. Validação de Data Agendada

**Método**: `setScheduledDate()`

```typescript
// A data não pode ser no passado
const scheduledDateTime = new Date(scheduledDate);
if (scheduledDateTime < new Date()) {
  throw new Error("A data agendada não pode ser no passado");
}
```

### 4. Validação de Início de Execução

**Método**: `startExecution()`

```typescript
// Não pode iniciar muito antes da data agendada
if (request.scheduled_start_datetime) {
  const scheduledDate = new Date(request.scheduled_start_datetime);
  const now = new Date();
  const thirtyMinutesBefore = new Date(
    scheduledDate.getTime() - 30 * 60 * 1000
  );

  if (now < thirtyMinutesBefore) {
    throw new Error(
      `Não é possível iniciar antes da data agendada. Pode iniciar até 30 minutos antes.`
    );
  }
}
```

### 5. Validação de Tempo Mínimo de Execução

**Método**: `completeExecution()`

```typescript
// Aviso se conclusão muito rápida (50% do tempo estimado)
if (request.started_at && request.estimated_duration_minutes) {
  const startTime = new Date(request.started_at);
  const now = new Date();
  const actualDuration = (now.getTime() - startTime.getTime()) / (1000 * 60);
  const minimumDuration = request.estimated_duration_minutes * 0.5;

  if (actualDuration < minimumDuration) {
    console.warn(`Serviço concluído muito rapidamente`);
  }
}
```

### 6. Validação de Motivo Obrigatório

**Método**: `cancelRequest()`

```typescript
// Cancelamentos exigem motivo
if (!reason) {
  throw new Error("É obrigatório fornecer um motivo para cancelamento");
}
```

### 7. Validação de Role Específico

**Métodos**: `registerPayment()`, `finalizeService()`

```typescript
// Apenas admins podem registrar pagamento e finalizar
if (!currentUser || currentUser.role !== "admin") {
  throw new Error("Apenas administradores podem executar esta ação");
}
```

## 🔄 Fluxo Completo com Auditoria

### Fase 1: Criação (Admin)

```
null → "Solicitado"
Auditoria: "Solicitação criada pelo administrador"
```

### Fase 2: Atribuição (Admin)

```
"Solicitado" → "Atribuído" → "Aguardando Confirmação"
Auditoria 1: "Profissional ID X atribuído pelo admin"
Auditoria 2: "Notificação enviada ao profissional (transição automática)"
```

### Fase 3: Resposta do Profissional

```
"Aguardando Confirmação" → "Aceito" ou "Recusado"
Auditoria: "Profissional aceitou/recusou a solicitação: [notas]"
Validações:
- ✅ Transição permitida
- ✅ Permissão do usuário (professional)
```

### Fase 4: Agendamento (Profissional)

```
"Aceito" → "Data Definida"
Auditoria: "Data agendada para DD/MM/YYYY HH:MM (duração estimada: X min)"
Validações:
- ✅ Transição permitida
- ✅ Permissão do usuário (professional)
- ✅ Data não é no passado
Metadata: { scheduled_date, estimated_duration }
```

### Fase 5: Execução (Profissional)

```
"Data Definida" → "Em Progresso"
Auditoria: "Profissional iniciou a execução do serviço"
Validações:
- ✅ Transição permitida
- ✅ Permissão do usuário (professional)
- ✅ Não está iniciando muito antes da data agendada (30 min)
Metadata: { actual_start }
```

### Fase 6: Conclusão (Profissional)

```
"Em Progresso" → "Aguardando Finalização"
Auditoria: "Profissional concluiu a execução: [notas]"
Validações:
- ✅ Transição permitida
- ✅ Permissão do usuário (professional)
- ⚠️  Aviso se duração < 50% do estimado
Metadata: { actual_end, notes }
```

### Fase 7: Pagamento (Admin)

```
"Aguardando Finalização" → "Pagamento Feito"
Auditoria: "Pagamento registrado: X€ via [método] - [notas]"
Validações:
- ✅ Transição permitida
- ✅ Permissão do usuário (admin only)
Metadata: { payment_amount, payment_method, payment_notes }
```

### Fase 8: Finalização (Admin)

```
"Pagamento Feito" → "Concluído"
Auditoria: "Serviço finalizado pelo administrador: [notas]"
Validações:
- ✅ Transição permitida
- ✅ Permissão do usuário (admin only)
Metadata: { finalized_at, admin_notes }
```

### Cancelamento (Qualquer Fase)

```
[qualquer status] → "Cancelado"
Auditoria: [motivo obrigatório]
Validações:
- ✅ Transição permitida (exceto de "Concluído")
- ✅ Motivo obrigatório
Metadata: { cancelled_at }
```

## 📊 Exemplos de Uso

### Consultar Histórico de uma Solicitação

```typescript
const auditService = inject(StatusAuditService);
const history = await auditService.getRequestHistory(123);

// Resultado:
[
  {
    id: 1,
    request_id: 123,
    previous_status: null,
    new_status: "Solicitado",
    changed_by_user_id: 1,
    changed_by_role: "admin",
    reason: "Solicitação criada pelo administrador",
    metadata: null,
    timestamp: "2024-01-15T10:00:00Z",
  },
  {
    id: 2,
    request_id: 123,
    previous_status: "Solicitado",
    new_status: "Atribuído",
    changed_by_user_id: 1,
    changed_by_role: "admin",
    reason: "Profissional ID 5 atribuído pelo admin",
    metadata: null,
    timestamp: "2024-01-15T11:30:00Z",
  },
  // ... mais entradas
];
```

### Filtrar por Período

```typescript
const history = await auditService.getHistory({
  requestId: 123,
  dateRange: {
    start: "2024-01-01",
    end: "2024-01-31",
  },
});
```

### Verificar se Transição Ocorreu

```typescript
const occurred = await auditService.hasTransitionOccurred(
  123,
  "Em Progresso",
  "Aguardando Finalização"
);

if (occurred) {
  console.log("Serviço já foi marcado como concluído pelo profissional");
}
```

### Obter Estatísticas

```typescript
const stats = await auditService.getStatusChangeStats();

// Resultado:
{
  total_changes: 1250,
  by_status: {
    "Solicitado": 250,
    "Atribuído": 245,
    "Aceito": 200,
    // ...
  },
  by_role: {
    "admin": 600,
    "professional": 650
  }
}
```

## 🔐 Segurança e Privacidade

### Row Level Security (RLS)

O acesso aos logs de auditoria é controlado por políticas RLS:

1. **Admins**: Acesso total
2. **Profissionais**: Apenas logs de suas próprias solicitações
3. **Clientes**: Apenas logs de suas próprias solicitações (quando aplicável)

### Retenção de Dados

Os logs de auditoria são mantidos permanentemente para:

- Compliance regulatório
- Resolução de disputas
- Análise de processos
- Melhoria contínua

Para purgar dados antigos (se necessário):

```sql
-- Exemplo: Remover logs com mais de 7 anos
DELETE FROM status_audit_log
WHERE timestamp < NOW() - INTERVAL '7 years';
```

## 🚀 Deploy da Migration

Para habilitar o sistema de auditoria, execute a migration:

```bash
# Via Supabase CLI
supabase migration up

# Ou via Dashboard
# 1. Acesse Supabase Dashboard
# 2. SQL Editor
# 3. Cole o conteúdo de sql/migrations/018_create_status_audit_log.sql
# 4. Execute
```

## 📈 Benefícios Implementados

✅ **Rastreabilidade Completa**: Todas as mudanças são registradas  
✅ **Auditoria Regulatória**: Histórico completo para compliance  
✅ **Resolução de Conflitos**: Evidências de quem fez o quê e quando  
✅ **Análise de Performance**: Tempo entre status, gargalos  
✅ **Validações Centralizadas**: Regras de negócio aplicadas consistentemente  
✅ **Segurança**: RLS garante acesso apropriado aos dados  
✅ **Performance**: Índices otimizados para consultas rápidas  
✅ **Flexibilidade**: Campo metadata permite armazenar dados customizados

## 🔧 Manutenção

### Monitorar Crescimento da Tabela

```sql
-- Tamanho da tabela
SELECT pg_size_pretty(pg_total_relation_size('status_audit_log'));

-- Número de registros
SELECT COUNT(*) FROM status_audit_log;

-- Distribuição por período
SELECT
  DATE_TRUNC('month', timestamp) as month,
  COUNT(*) as changes
FROM status_audit_log
GROUP BY month
ORDER BY month DESC;
```

### Criar Índices Adicionais (se necessário)

```sql
-- Exemplo: Índice para filtrar por reason
CREATE INDEX idx_audit_reason_text
ON status_audit_log USING gin(to_tsvector('portuguese', reason));
```

## 📝 Próximos Passos Sugeridos

1. **UI de Histórico**: Componente Angular para visualizar timeline de mudanças
2. **Alertas Automáticos**: Notificações baseadas em padrões suspeitos
3. **Relatórios**: Dashboard de métricas de workflow
4. **Export**: Funcionalidade para exportar histórico em CSV/PDF
5. **Webhooks**: Notificações externas em mudanças críticas

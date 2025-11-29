# Plano de Migração: Sistema de Status Simplificado

**Data de Criação:** 29/11/2025  
**Status Atual:** ✅ MIGRAÇÃO COMPLETA - FASE 7 CONCLUÍDA  
**Objetivo:** ✅ Migrar completamente do sistema de 23 status para 11 status simplificados

---

## 📊 Situação Atual

### ✅ Migração Totalmente Concluída:

- ✅ **Fase 1-5:** Código migrado (9 componentes de visualização + 3 serviços + formulários)
- ✅ **Fase 6:** Banco de dados migrado (7 registros migrados com sucesso, transação COMMIT)
- ✅ **Fase 7:** Código deprecated removido completamente
  - ✅ Removido `ServiceStatusDeprecated` de `maintenance.models.ts`
  - ✅ Removido `ServiceStatusNew` (substituído por `ServiceStatus`)
  - ✅ Deletado `workflow.service.ts` (deprecated)
  - ✅ Deletado `budget-approval-modal/` (componente completo)
  - ✅ Deletado `clarification-modal/` (componente completo)
  - ✅ Deletado `confirm-email/` (componente completo)
  - ✅ Atualizado 6 componentes para remover `WorkflowService`
  - ✅ Limpeza do `alert.service.ts` (removido lógica de orçamentos)
  - ✅ Corrigido `workflow-timeline.component.ts` (removido `ServiceStatusNew`)
  - ✅ Build compilando sem erros TypeScript
- ⏳ **Fase 8:** Testes end-to-end (PRÓXIMA FASE)

### 🎯 Sistema de Status ATIVO

**ÚNICO tipo em uso:** `ServiceStatus` (11 status)

---

## 🗺️ Mapeamento de Status Antigo → Novo

| Status Antigo (PT)                       | Status Novo              | Razão                     |
| ---------------------------------------- | ------------------------ | ------------------------- |
| "Em análise"                             | "Solicitado"             | Admin ainda não atribuiu  |
| "Aguardando esclarecimentos"             | "Solicitado"             | Retorna ao estado inicial |
| "Orçamento enviado"                      | ❌ **REMOVIDO**          | Sem fluxo de orçamento    |
| "Orçamento aprovado"                     | ❌ **REMOVIDO**          | Sem aprovação de cliente  |
| "Orçamento rejeitado"                    | "Cancelado"              | Projeto não prossegue     |
| "Buscando profissional"                  | "Solicitado"             | Admin ainda procurando    |
| "Profissional selecionado"               | "Atribuído"              | Admin já escolheu         |
| "Aguardando confirmação do profissional" | "Aguardando Confirmação" | Nome direto               |
| "Agendado"                               | "Data Definida"          | Profissional definiu data |
| "Em execução"                            | "Em Progresso"           | Serviço sendo executado   |
| "Concluído - Aguardando aprovação"       | "Aguardando Finalização" | Aguarda admin             |
| "Aprovado"                               | "Pagamento Feito"        | Admin aprovou = vai pagar |
| "Pago"                                   | "Pagamento Feito"        | Pagamento registrado      |
| "Finalizado"                             | "Concluído"              | Processo completo         |
| "Cancelado"                              | "Cancelado"              | Mantém o mesmo            |

---

## 📋 Fases da Migração

### **Fase 1: Inventário Completo** 📦

**Status:** Não iniciado  
**Prioridade:** Alta  
**Duração Estimada:** 1-2 horas

**Tarefas:**

1. Executar buscas para cada status deprecated
2. Categorizar arquivos por tipo de uso:
   - 🔍 **Visualização:** Apenas exibe status (baixo risco)
   - ⚙️ **Lógica:** Valida/modifica status (médio risco)
   - 📝 **Formulário:** Permite mudança de status (alto risco)
3. Criar planilha de rastreamento

**Arquivos Identificados (parcial):**

- `src/components/service-request-details/service-request-details.component.ts`
- `src/components/workflow-timeline/workflow-timeline.component.ts`
- `src/components/time-control/time-control.component.ts`
- `src/components/dashboard/dashboard.component.ts`
- `src/components/schedule/schedule.component.ts`
- `src/services/workflow.service.ts` (880 linhas - CRÍTICO)
- `src/services/alert.service.ts`
- `src/services/evaluation.service.ts`

---

### **Fase 2: Utilitário de Mapeamento** 🗺️

**Status:** Não iniciado  
**Prioridade:** Alta  
**Duração Estimada:** 2 horas

**Criar arquivo:** `src/utils/status-migration.util.ts`

```typescript
import {
  ServiceStatus,
  ServiceStatusNew,
} from "@/src/models/maintenance.models";

/**
 * Mapeia status do sistema antigo para o novo sistema simplificado
 * Usado durante a migração gradual
 */
export class StatusMigrationUtil {
  /**
   * Mapa de conversão: status antigo → status novo
   */
  private static readonly migrationMap: Record<string, ServiceStatusNew> = {
    // Português
    "Em análise": "Solicitado",
    "Aguardando esclarecimentos": "Solicitado",
    "Buscando profissional": "Solicitado",
    "Profissional selecionado": "Atribuído",
    "Aguardando confirmação do profissional": "Aguardando Confirmação",
    Agendado: "Data Definida",
    "Em execução": "Em Progresso",
    "Concluído - Aguardando aprovação": "Aguardando Finalização",
    Aprovado: "Pagamento Feito",
    Pago: "Pagamento Feito",
    Finalizado: "Concluído",
    "Orçamento rejeitado": "Cancelado",
    Cancelado: "Cancelado",

    // Status de orçamento (sem equivalente - converter para Cancelado)
    "Orçamento enviado": "Cancelado",
    "Aguardando aprovação do orçamento": "Cancelado",
    "Orçamento aprovado": "Atribuído", // Assume que foi aceito

    // Inglês (se necessário)
    Requested: "Solicitado",
    InProgress: "Em Progresso",
    Completed: "Concluído",
    Scheduled: "Data Definida",
    // ... adicionar mais conforme necessário
  };

  /**
   * Converte status antigo para novo
   * @param oldStatus Status do sistema antigo
   * @returns Status equivalente no novo sistema
   */
  static migrateStatus(oldStatus: ServiceStatus): ServiceStatusNew {
    // Se já é um status novo, retorna
    if (this.isNewStatus(oldStatus)) {
      return oldStatus as ServiceStatusNew;
    }

    // Busca no mapa
    const newStatus = this.migrationMap[oldStatus];
    if (newStatus) {
      return newStatus;
    }

    // Fallback: retorna Cancelado se não encontrar
    console.warn(
      `Status desconhecido para migração: ${oldStatus}. Usando 'Cancelado' como fallback.`
    );
    return "Cancelado";
  }

  /**
   * Verifica se um status é do novo sistema
   */
  private static isNewStatus(status: ServiceStatus): boolean {
    const newStatuses: ServiceStatusNew[] = [
      "Solicitado",
      "Atribuído",
      "Aguardando Confirmação",
      "Aceito",
      "Recusado",
      "Data Definida",
      "Em Progresso",
      "Aguardando Finalização",
      "Pagamento Feito",
      "Concluído",
      "Cancelado",
    ];
    return newStatuses.includes(status as ServiceStatusNew);
  }

  /**
   * Retorna se um status é deprecated
   */
  static isDeprecatedStatus(status: ServiceStatus): boolean {
    return !this.isNewStatus(status);
  }
}
```

---

### **Fase 3: Migrar Componentes de Visualização** 👁️

**Status:** Não iniciado  
**Prioridade:** Média  
**Duração Estimada:** 3-4 horas  
**Risco:** Baixo (apenas exibição)

**Componentes:**

1. ✅ `workflow-timeline.component.ts`
   - Substituir arrays de status deprecated por novos
   - Atualizar método `getExpectedStatuses()`
2. ✅ `service-request-details.component.ts`
   - Linhas 603, 610, 618, 626, 633, 641: Comparações de status
   - Substituir: "Orçamento enviado" → "Atribuído"
   - Substituir: "Em execução" → "Em Progresso"
3. ✅ `time-control.component.ts`
   - Linhas 51, 63: "Agendado" → "Data Definida", "Em execução" → "Em Progresso"
4. ✅ `dashboard.component.ts`
   - Linhas 554, 578: "Agendado" → "Data Definida"
5. ✅ `schedule.component.ts`
   - Linha 261: Set de status → usar apenas novos status

**Estratégia:**

- Usar busca/substituição simples
- Testar cada componente após mudança
- Verificar se a UI ainda renderiza corretamente

---

### **Fase 4: Migrar Serviços de Lógica** ⚙️

**Status:** Não iniciado  
**Prioridade:** Alta  
**Duração Estimada:** 4-6 horas  
**Risco:** Médio-Alto (lógica de negócio)

**Serviços:**

1. **`workflow.service.ts` (CRÍTICO - 880 linhas)**

   - ❌ **DEPRECAR COMPLETAMENTE:** Já marcado `@deprecated`
   - Migrar TODA lógica para `workflow-simplified.service.ts`
   - Atualizar todos os componentes que usam `WorkflowService` para usar `WorkflowSimplifiedService`
   - Remover métodos de orçamento (sendQuote, approveQuote, rejectQuote)
   - Remover validTransitions e actionMap antigos

2. **`alert.service.ts`**

   - ✅ Já atualizado `statusPriority` com 11 novos status
   - Verificar switch cases (linhas 156-446)
   - Substituir status deprecated por novos equivalentes

3. **`evaluation.service.ts`**
   - Linha 138: `.in("status", ["Aprovado pelo cliente", "Pago"])`
   - Substituir por: `.in("status", ["Pagamento Feito", "Concluído"])`

**Plano de Migração do workflow.service.ts:**

```typescript
// ANTES (workflow.service.ts - DEPRECATED)
async analyzeRequest(requestId: number) {
  // 880 linhas de código antigo
}

// DEPOIS (workflow-simplified.service.ts - JÁ EXISTE)
// Componentes devem usar:
const workflowService = inject(WorkflowSimplifiedService);
await workflowService.assignProfessional(requestId, professionalId);
```

---

### **Fase 5: Atualizar Componentes de Formulário** 📝

**Status:** Não iniciado  
**Prioridade:** Alta  
**Duração Estimada:** 4-5 horas  
**Risco:** Alto (altera dados)

**Componentes:**

1. **`admin-service-request-form`**

   - Remover campos de orçamento (quote_amount, quote_description)
   - Status inicial: sempre "Solicitado"
   - Integrar com `workflow-simplified.service.ts`

2. **`service-request-details.component.ts`**

   - Ações de mudança de status
   - Substituir chamadas para `workflow.service` por `workflow-simplified.service`
   - Remover botões de orçamento/aprovação

3. **`budget-approval-modal`**
   - ❌ **REMOVER COMPLETAMENTE** (sem fluxo de orçamento)
   - OU converter para modal de "Definir Data" (profissional)

**Estratégia:**

- Criar branch específico para testes
- Atualizar um componente por vez
- Testar fluxo completo após cada mudança
- Validar permissões (admin vs professional)

---

### **Fase 6: Migração de Dados do Banco** 🗄️

**Status:** Não iniciado  
**Prioridade:** Crítica  
**Duração Estimada:** 2-3 horas (+ tempo de validação)  
**Risco:** Muito Alto (dados de produção)

**Criar arquivo:** `sql/migrations/migrate_status_to_new_system.sql`

```sql
-- ============================================================================
-- Script de Migração: Atualização de Status para Novo Sistema
-- Data: TBD
-- Descrição: Converte status do sistema antigo (23) para novo (11)
-- ============================================================================

BEGIN;

-- PASSO 1: Backup
CREATE TABLE service_requests_backup_status AS
SELECT id, status, updated_at
FROM service_requests;

-- PASSO 2: Migrar status (português)
UPDATE service_requests
SET status = CASE
    WHEN status = 'Em análise' THEN 'Solicitado'
    WHEN status = 'Aguardando esclarecimentos' THEN 'Solicitado'
    WHEN status = 'Buscando profissional' THEN 'Solicitado'
    WHEN status = 'Profissional selecionado' THEN 'Atribuído'
    WHEN status = 'Aguardando confirmação do profissional' THEN 'Aguardando Confirmação'
    WHEN status = 'Agendado' THEN 'Data Definida'
    WHEN status = 'Em execução' THEN 'Em Progresso'
    WHEN status = 'Concluído - Aguardando aprovação' THEN 'Aguardando Finalização'
    WHEN status = 'Aprovado' THEN 'Pagamento Feito'
    WHEN status = 'Pago' THEN 'Pagamento Feito'
    WHEN status = 'Finalizado' THEN 'Concluído'
    WHEN status = 'Orçamento rejeitado' THEN 'Cancelado'
    WHEN status = 'Cancelado' THEN 'Cancelado'
    -- Status de orçamento (sem equivalente)
    WHEN status LIKE '%Orçamento%' THEN 'Cancelado'
    ELSE status -- Mantém se já for novo status
END;

-- PASSO 3: Validar (nenhum registro com status inválido)
SELECT status, COUNT(*)
FROM service_requests
WHERE status NOT IN (
    'Solicitado', 'Atribuído', 'Aguardando Confirmação',
    'Aceito', 'Recusado', 'Data Definida', 'Em Progresso',
    'Aguardando Finalização', 'Pagamento Feito', 'Concluído', 'Cancelado'
)
GROUP BY status;

-- Se a query acima retornar vazio, está OK. Caso contrário, ROLLBACK!

-- PASSO 4: Marcar campos de orçamento como deprecated
UPDATE service_requests
SET
    quote_description = CASE
        WHEN quote_description IS NOT NULL
        THEN '[DEPRECATED] ' || quote_description
        ELSE NULL
    END
WHERE quote_description IS NOT NULL;

COMMIT;

-- ROLLBACK em caso de erro:
-- ROLLBACK;
-- DELETE FROM service_requests_backup_status;
```

**Processo de Execução:**

1. ✅ Executar em ambiente de desenvolvimento primeiro
2. ✅ Validar que TODOS os status foram migrados corretamente
3. ✅ Testar aplicação com dados migrados
4. ✅ Criar backup completo do banco de produção
5. ✅ Executar em produção em janela de manutenção
6. ✅ Monitorar logs e erros
7. ✅ Ter plano de rollback pronto

---

### **Fase 7: Remover Código Deprecated** 🧹

**Status:** Não iniciado  
**Prioridade:** Baixa (só após validação completa)  
**Duração Estimada:** 2-3 horas

**Ações:**

1. **Remover tipos deprecated**

   ```typescript
   // maintenance.models.ts
   // ❌ DELETAR:
   export type ServiceStatusDeprecated = ...

   // ✅ MANTER APENAS:
   export type ServiceStatus = ServiceStatusNew;
   ```

2. **Deletar arquivos**

   - ❌ `workflow.service.ts` (880 linhas)
   - ❌ `budget-approval-modal/` (se não reutilizado)

3. **Remover campos deprecated**

   ```typescript
   // ServiceRequest interface
   // ❌ DELETAR:
   quote_amount?: number | null;
   quote_description?: string | null;
   quote_sent_at?: string | null;
   quote_approved_at?: string | null;
   ```

4. **Remover interface Quote** (linha 559 de maintenance.models.ts)

5. **Limpar imports**

   - Remover `ServiceStatusDeprecated` de todos os arquivos
   - Atualizar imports para usar apenas `ServiceStatus` (= `ServiceStatusNew`)

6. **Atualizar documentação**
   - README.md
   - Comentários em código
   - Documentação de API (se existir)

---

### **Fase 8: Testes e Validação** ✅

**Status:** Não iniciado  
**Prioridade:** Crítica  
**Duração Estimada:** 6-8 horas

**Cenários de Teste:**

#### 1. Fluxo Completo de Solicitação

```
Admin → Solicitado → Atribuído → Aguardando Confirmação →
Profissional Aceita → Data Definida → Em Progresso →
Aguardando Finalização → Pagamento Feito → Concluído
```

**Verificar:**

- ✅ Cada transição de status funciona
- ✅ Notificações são enviadas
- ✅ Permissões RLS funcionam (admin vs professional)
- ✅ Campos obrigatórios são validados
- ✅ Histórico de mudanças é registrado

#### 2. Fluxo de Recusa

```
Admin → Solicitado → Atribuído → Aguardando Confirmação →
Profissional Recusa → Recusado (FIM)
```

#### 3. Fluxo de Cancelamento

```
Qualquer Status → Cancelado (FIM)
```

#### 4. Validações de Segurança

- ✅ Professional não pode criar solicitações (só admin)
- ✅ Professional não pode atribuir solicitações (só admin)
- ✅ Admin não pode aceitar/recusar (só professional)
- ✅ Apenas admin pode registrar pagamento
- ✅ Apenas admin pode finalizar

#### 5. Interface do Usuário

- ✅ Todos os status exibem labels corretos
- ✅ Cores de status estão corretas
- ✅ Timeline mostra progressão correta
- ✅ Filtros de status funcionam
- ✅ Dashboard mostra estatísticas corretas

#### 6. Dados Históricos

- ✅ Solicitações antigas (migradas) funcionam
- ✅ Status antigos foram convertidos corretamente
- ✅ Nenhum registro com status inválido

---

## 📅 Cronograma Sugerido

### **Semana 1: Preparação**

- ✅ Dia 1-2: Fase 1 (Inventário)
- ✅ Dia 3: Fase 2 (Utilitário de Mapeamento)

### **Semana 2: Migração de Código**

- ✅ Dia 4-5: Fase 3 (Componentes de Visualização)
- ✅ Dia 6-8: Fase 4 (Serviços de Lógica)
- ✅ Dia 9-10: Fase 5 (Componentes de Formulário)

### **Semana 3: Dados e Validação**

- ✅ Dia 11-12: Fase 6 (Migração de Banco - DEV)
- ✅ Dia 13-15: Fase 8 (Testes Completos)

### **Semana 4: Produção**

- ✅ Dia 16: Fase 6 (Migração de Banco - PROD)
- ✅ Dia 17-18: Monitoramento e ajustes
- ✅ Dia 19-20: Fase 7 (Limpeza de código deprecated)

**Duração Total Estimada:** 3-4 semanas

---

## ⚠️ Riscos e Mitigações

| Risco                              | Probabilidade | Impacto    | Mitigação                          |
| ---------------------------------- | ------------- | ---------- | ---------------------------------- |
| Perda de dados na migração SQL     | Baixa         | Muito Alto | Backup completo + testes em DEV    |
| Quebra de fluxo de negócio         | Média         | Alto       | Testes extensivos antes de PROD    |
| Status incompatíveis               | Baixa         | Médio      | Utilitário de migração + validação |
| Usuários confusos com novos status | Média         | Baixo      | Documentação + comunicação         |
| Rollback necessário                | Baixa         | Alto       | Script de rollback pronto          |

---

## 📌 Checklist Antes de Começar

- [ ] Criar branch: `feature/migrate-status-system`
- [ ] Backup completo do banco de dados
- [ ] Ambiente de desenvolvimento configurado
- [ ] Equipe alinhada sobre as mudanças
- [ ] Janela de manutenção agendada (se necessário)
- [ ] Plano de comunicação para usuários
- [ ] Script de rollback preparado

---

## 🚀 Próximo Passo Imediato

**Recomendação:** Começar pela **Fase 2 - Criar Utilitário de Mapeamento**

Este utilitário será usado em todas as fases seguintes e pode ser testado isoladamente.

```bash
# Criar o arquivo
touch src/utils/status-migration.util.ts

# Adicionar testes
touch src/utils/status-migration.util.spec.ts
```

---

## 📚 Referências

- Script SQL de remoção de cliente: `sql/migrations/remove_client_role.sql`
- Novo serviço de workflow: `src/services/workflow-simplified.service.ts`
- Plano de remoção de cliente: `PLANO_REMOCAO_CLIENTE.md`
- Modelos de dados: `src/models/maintenance.models.ts`

---

**Última Atualização:** 29/11/2025  
**Autor:** GitHub Copilot + Equipe de Desenvolvimento  
**Status do Documento:** 📋 Plano Completo - Aguardando Execução

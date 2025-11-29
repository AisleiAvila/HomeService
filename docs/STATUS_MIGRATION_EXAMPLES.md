# Exemplos de Uso: StatusMigrationUtil

Este documento demonstra como usar o utilitário `StatusMigrationUtil` para migração de status.

## Importação

```typescript
import { StatusMigrationUtil } from "@/src/utils/status-migration.util";
import { ServiceStatus } from "@/src/models/maintenance.models";
```

## Exemplos Básicos

### 1. Migrar um único status

```typescript
// Status deprecated → novo
const novoStatus = StatusMigrationUtil.migrateStatus("Em análise");
console.log(novoStatus); // → "Solicitado"

const novoStatus2 = StatusMigrationUtil.migrateStatus("Agendado");
console.log(novoStatus2); // → "Data Definida"

// Status já novo → retorna o mesmo
const mesmoStatus = StatusMigrationUtil.migrateStatus("Solicitado");
console.log(mesmoStatus); // → "Solicitado"
```

### 2. Migrar múltiplos status

```typescript
const statusAntigos: ServiceStatus[] = [
  "Em análise",
  "Agendado",
  "Em execução",
  "Finalizado",
];

const statusNovos = StatusMigrationUtil.migrateMultiple(statusAntigos);
console.log(statusNovos);
// → ["Solicitado", "Data Definida", "Em Progresso", "Concluído"]
```

### 3. Verificar se status é novo ou deprecated

```typescript
if (StatusMigrationUtil.isDeprecatedStatus("Em análise")) {
  console.log("Este status precisa ser migrado!");
  const novo = StatusMigrationUtil.migrateStatus("Em análise");
  console.log(`Migrar para: ${novo}`);
}

if (StatusMigrationUtil.isNewStatus("Solicitado")) {
  console.log("Este status já está no novo sistema!");
}
```

## Uso em Componentes

### Exemplo 1: Exibir status com migração automática

```typescript
// service-request-details.component.ts
import { Component, input, computed } from "@angular/core";
import { StatusMigrationUtil } from "@/src/utils/status-migration.util";

@Component({
  selector: "app-service-request-details",
  // ...
})
export class ServiceRequestDetailsComponent {
  request = input.required<ServiceRequest>();

  // Garantir que sempre usamos status novo
  displayStatus = computed(() => {
    const currentStatus = this.request().status;
    return StatusMigrationUtil.migrateStatus(currentStatus);
  });

  // Verificar se precisa de atenção (status deprecated)
  needsMigration = computed(() => {
    return StatusMigrationUtil.isDeprecatedStatus(this.request().status);
  });
}
```

**Template:**

```html
<div class="status-badge" [class.deprecated]="needsMigration()">
  {{ displayStatus() }} @if (needsMigration()) {
  <span class="warning-icon" title="Status em sistema antigo">⚠️</span>
  }
</div>
```

### Exemplo 2: Filtrar por status com migração

```typescript
// dashboard.component.ts
import { computed } from "@angular/core";
import { StatusMigrationUtil } from "@/src/utils/status-migration.util";

// Filtrar solicitações "em progresso" (novo sistema)
const requestsInProgress = computed(() => {
  const all = this.dataService.serviceRequests();

  return all.filter((req) => {
    const status = StatusMigrationUtil.migrateStatus(req.status);
    return status === "Em Progresso";
  });
});

// Contar por status novo
const statusCounts = computed(() => {
  const all = this.dataService.serviceRequests();
  const counts: Record<string, number> = {};

  for (const req of all) {
    const newStatus = StatusMigrationUtil.migrateStatus(req.status);
    counts[newStatus] = (counts[newStatus] || 0) + 1;
  }

  return counts;
});
```

### Exemplo 3: Comparação de status segura

```typescript
// ANTES (com status deprecated - pode quebrar)
if (request.status === "Em execução") {
  // ...
}

// DEPOIS (com migração - sempre funciona)
const currentStatus = StatusMigrationUtil.migrateStatus(request.status);
if (currentStatus === "Em Progresso") {
  // Funciona tanto para "Em execução" quanto para "Em Progresso"
}
```

## Análise e Relatórios

### Exemplo 4: Gerar relatório de migração

```typescript
// admin-dashboard.component.ts
import { StatusMigrationUtil } from "@/src/utils/status-migration.util";

async generateMigrationReport() {
  // Buscar todas as solicitações
  const { data: requests } = await this.supabase
    .from("service_requests")
    .select("id, status");

  if (!requests) return;

  // Extrair apenas os status
  const statuses = requests.map(r => r.status as ServiceStatus);

  // Gerar relatório
  const report = StatusMigrationUtil.getMigrationReport(statuses);

  console.log("=== RELATÓRIO DE MIGRAÇÃO ===");
  console.log(`Total de solicitações: ${report.total}`);
  console.log(`Já no novo sistema: ${report.alreadyNew} (${(report.alreadyNew/report.total*100).toFixed(1)}%)`);
  console.log(`Precisam migração: ${report.needsMigration} (${(report.needsMigration/report.total*100).toFixed(1)}%)`);
  console.log("\nDistribuição após migração:");

  for (const [status, count] of Object.entries(report.byNewStatus)) {
    if (count > 0) {
      console.log(`  ${status}: ${count}`);
    }
  }
}
```

**Saída esperada:**

```
=== RELATÓRIO DE MIGRAÇÃO ===
Total de solicitações: 150
Já no novo sistema: 30 (20.0%)
Precisam migração: 120 (80.0%)

Distribuição após migração:
  Solicitado: 45
  Data Definida: 28
  Em Progresso: 35
  Concluído: 30
  Cancelado: 12
```

### Exemplo 5: Descobrir quais status antigos existem

```typescript
// Listar todos os status deprecated usados atualmente
async auditDeprecatedStatuses() {
  const { data: requests } = await this.supabase
    .from("service_requests")
    .select("status");

  if (!requests) return;

  const deprecatedFound = new Set<string>();

  for (const req of requests) {
    if (StatusMigrationUtil.isDeprecatedStatus(req.status)) {
      deprecatedFound.add(req.status);
    }
  }

  console.log("Status deprecated encontrados:");
  for (const status of deprecatedFound) {
    const newStatus = StatusMigrationUtil.migrateStatus(status);
    console.log(`  "${status}" → "${newStatus}"`);
  }
}
```

## Uso em Serviços

### Exemplo 6: Atualizar status com migração

```typescript
// data.service.ts
import { StatusMigrationUtil } from "@/src/utils/status-migration.util";

async updateRequestStatus(requestId: number, newStatus: ServiceStatus) {
  // Garantir que sempre salvamos status novo
  const migratedStatus = StatusMigrationUtil.migrateStatus(newStatus);

  const { error } = await this.supabase
    .from("service_requests")
    .update({ status: migratedStatus })
    .eq("id", requestId);

  if (error) {
    console.error("Erro ao atualizar status:", error);
    return;
  }

  // Log de auditoria se foi migrado
  if (StatusMigrationUtil.isDeprecatedStatus(newStatus)) {
    console.warn(
      `Status deprecated "${newStatus}" foi migrado para "${migratedStatus}" ` +
      `na solicitação ${requestId}`
    );
  }

  await this.refreshServiceRequests();
}
```

### Exemplo 7: Validação antes de salvar

```typescript
// workflow.service.ts
async changeStatus(requestId: number, newStatus: string) {
  // Validar se é um status válido
  if (!StatusMigrationUtil.isValidStatus(newStatus)) {
    throw new Error(`Status inválido: "${newStatus}"`);
  }

  // Migrar automaticamente se for deprecated
  const finalStatus = StatusMigrationUtil.migrateStatus(newStatus as ServiceStatus);

  // Salvar no banco
  await this.updateRequestStatus(requestId, finalStatus);
}
```

## Logging e Debugging

### Exemplo 8: Log detalhado de migração

```typescript
// Função helper para logs
function logStatusChange(
  requestId: number,
  oldStatus: ServiceStatus,
  newStatus: ServiceStatus
) {
  const oldMigrated = StatusMigrationUtil.migrateStatus(oldStatus);
  const newMigrated = StatusMigrationUtil.migrateStatus(newStatus);

  console.log(`[Request ${requestId}] Mudança de status:`);
  console.log(
    `  De: "${oldStatus}" ${
      StatusMigrationUtil.isDeprecatedStatus(oldStatus)
        ? '(deprecated → "' + oldMigrated + '")'
        : ""
    }`
  );
  console.log(
    `  Para: "${newStatus}" ${
      StatusMigrationUtil.isDeprecatedStatus(newStatus)
        ? '(deprecated → "' + newMigrated + '")'
        : ""
    }`
  );

  if (oldMigrated !== newMigrated) {
    console.log(`  ✅ Transição válida: ${oldMigrated} → ${newMigrated}`);
  } else {
    console.warn(`  ⚠️ Status não mudou após migração`);
  }
}

// Uso
logStatusChange(123, "Em análise", "Agendado");
// Saída:
// [Request 123] Mudança de status:
//   De: "Em análise" (deprecated → "Solicitado")
//   Para: "Agendado" (deprecated → "Data Definida")
//   ✅ Transição válida: Solicitado → Data Definida
```

### Exemplo 9: Obter histórico de migração

```typescript
// Descobrir de quais status antigos veio um status novo
const oldStatuses = StatusMigrationUtil.getOldStatusesFor("Solicitado");
console.log('Status antigos que viram "Solicitado":', oldStatuses);
// → ["Em análise", "Aguardando esclarecimentos", "Buscando profissional", ...]

// Usar para explicação ao usuário
function explainStatusOrigin(newStatus: ServiceStatusNew) {
  const origins = StatusMigrationUtil.getOldStatusesFor(newStatus);

  if (origins.length === 0) {
    return `"${newStatus}" é um status novo sem equivalente no sistema antigo.`;
  }

  return `"${newStatus}" substitui os seguintes status antigos: ${origins.join(
    ", "
  )}`;
}

console.log(explainStatusOrigin("Solicitado"));
// → "Solicitado" substitui os seguintes status antigos: Em análise, Aguardando esclarecimentos, ...
```

## Migração em Massa (SQL)

### Exemplo 10: Preparar dados para migração SQL

```typescript
// Script para gerar comandos SQL de migração
function generateSQLMigration() {
  const allDeprecated = StatusMigrationUtil.getAllDeprecatedStatuses();

  console.log("-- Script de migração de status");
  console.log("BEGIN;\n");

  for (const oldStatus of allDeprecated) {
    const newStatus = StatusMigrationUtil.migrateStatus(
      oldStatus as ServiceStatus
    );

    console.log(
      `UPDATE service_requests ` +
        `SET status = '${newStatus}' ` +
        `WHERE status = '${oldStatus}';`
    );
  }

  console.log("\nCOMMIT;");
}

// Gera SQL pronto para executar
generateSQLMigration();
```

## Boas Práticas

### ✅ FAÇA:

```typescript
// 1. Sempre migre antes de comparar
const status = StatusMigrationUtil.migrateStatus(request.status);
if (status === "Em Progresso") {
  /* ... */
}

// 2. Use para validação
if (!StatusMigrationUtil.isValidStatus(userInput)) {
  throw new Error("Status inválido");
}

// 3. Gere relatórios antes de migração real
const report = StatusMigrationUtil.getMigrationReport(allStatuses);
console.log(`${report.needsMigration} registros precisam migração`);

// 4. Log quando deprecated é usado
if (StatusMigrationUtil.isDeprecatedStatus(status)) {
  console.warn("Status deprecated detectado:", status);
}
```

### ❌ NÃO FAÇA:

```typescript
// 1. Não compare status deprecated diretamente
if (request.status === "Em execução") {
  /* ❌ Pode quebrar */
}

// 2. Não assuma que status é novo sem verificar
const newStatus = request.status as ServiceStatusNew; // ❌ Pode falhar

// 3. Não ignore validação
await updateStatus(requestId, userInput); // ❌ Validar primeiro!

// 4. Não misture status antigos e novos em arrays
const statuses = ["Solicitado", "Em análise"]; // ❌ Inconsistente
```

## Testes

### Exemplo 11: Testar migração em componentes

```typescript
// service-request-details.component.spec.ts
import { StatusMigrationUtil } from "@/src/utils/status-migration.util";

describe("ServiceRequestDetailsComponent", () => {
  it("deve exibir status migrado corretamente", () => {
    const request = {
      id: 1,
      status: "Em execução" as ServiceStatus, // Status deprecated
      // ... outros campos
    };

    component.request.set(request);

    const displayStatus = component.displayStatus();
    expect(displayStatus).toBe("Em Progresso"); // Status novo
    expect(component.needsMigration()).toBe(true);
  });

  it("não deve marcar status novos como deprecated", () => {
    const request = {
      id: 1,
      status: "Solicitado" as ServiceStatus,
      // ... outros campos
    };

    component.request.set(request);

    expect(component.displayStatus()).toBe("Solicitado");
    expect(component.needsMigration()).toBe(false);
  });
});
```

---

## Resumo

O `StatusMigrationUtil` fornece uma camada de compatibilidade durante a migração, permitindo que:

1. ✅ Código novo use apenas os 11 status simplificados
2. ✅ Dados antigos continuem funcionando
3. ✅ Migração seja gradual e controlada
4. ✅ Auditoria e relatórios sejam fáceis
5. ✅ Validação seja consistente

**Próximo passo:** Use este utilitário na **Fase 3** para migrar componentes de visualização!

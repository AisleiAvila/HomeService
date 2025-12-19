# 🔧 Antes e Depois - Código Corrigido

## Mudança 1: Reorganização de Order (Principal)

### ❌ ANTES (Erro de Compilação)

```typescript
export class AdminOverviewComponent implements OnInit {
    selectedPeriod = signal<'all' | '7' | '30' | '90'>('all');
    selectedProfessional = signal<string | 'all'>('all');

    // ❌ sparklineData tentava usar filteredRequests que ainda não existia!
    sparklineData = computed(() => {
        for (let i = 6; i >= 0; i--) {
            const dayRevenue = this.filteredRequests()  // ❌ ERRO: não definido ainda
                .filter(r => r.payment_status === "Paid" && r.completed_at?.startsWith(dateStr))
```

### ✅ DEPOIS (Correto)

```typescript
export class AdminOverviewComponent implements OnInit {
    // ORDEM CORRETA:
    selectedPeriod = signal<'all' | '7' | '30' | '90'>('all');
    selectedProfessional = signal<string | 'all'>('all');

    professionalsList = computed(() => { ... });

    // ✅ Agora filteredRequests está DEFINIDO ANTES
    filteredRequests = computed(() => {
        const period = this.selectedPeriod();
        const selectedProId = this.selectedProfessional();
        const requests = this.dataService.serviceRequests();

        let filtered = requests;

        // Filtrar por período
        if (period !== 'all') {
            const now = new Date();
            const days = parseInt(period, 10);
            const startDate = new Date(now);
            startDate.setDate(startDate.getDate() - days);

            filtered = filtered.filter(r => {
                if (!r.created_at) return false;
                const requestDate = new Date(r.created_at);
                return requestDate >= startDate && requestDate <= now;
            });
        }

        // Filtrar por profissional
        if (selectedProId !== 'all') {
            filtered = filtered.filter(r => String(r.professional_id) === selectedProId);
        }

        return filtered;
    });

    // ✅ sparklineData agora pode usar filteredRequests com segurança
    sparklineData = computed(() => {
        for (let i = 6; i >= 0; i--) {
            const dayRevenue = this.filteredRequests()  // ✅ SEGURO: já foi definido acima
                .filter(r => r.payment_status === "Paid" && r.completed_at?.startsWith(dateStr))
```

---

## Mudança 2: Atualizar sparklineData

### ❌ ANTES

```typescript
sparklineData = computed(() => {
  const now = new Date();
  const last7Days: Record<string, number[]> = {
    totalRevenue: [],
    pendingApprovals: [],
    activeServices: [],
    totalProfessionals: [],
  };

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    // ❌ Usa dados SEM FILTRO
    const dayRevenue = this.dataService
      .serviceRequests()
      .filter(
        (r) =>
          r.payment_status === "Paid" && r.completed_at?.startsWith(dateStr)
      )
      .reduce((sum, r) => sum + this.validateCost(r.valor), 0);
    last7Days.totalRevenue.push(dayRevenue);

    // ❌ Usa dados SEM FILTRO
    const dayActive = this.dataService
      .serviceRequests()
      .filter(
        (r) =>
          r.status !== "Concluído" &&
          r.status !== "Cancelado" &&
          r.created_at?.startsWith(dateStr)
      ).length;
    last7Days.activeServices.push(dayActive);
  }

  return last7Days;
});
```

### ✅ DEPOIS

```typescript
sparklineData = computed(() => {
  const now = new Date();
  const last7Days: Record<string, number[]> = {
    totalRevenue: [],
    pendingApprovals: [],
    activeServices: [],
    totalProfessionals: [],
  };

  // Gerar dados dos últimos 7 dias - usando filteredRequests para respeitar os filtros selecionados
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    // ✅ Usa filteredRequests COM FILTROS APLICADOS
    const dayRevenue = this.filteredRequests()
      .filter(
        (r) =>
          r.payment_status === "Paid" && r.completed_at?.startsWith(dateStr)
      )
      .reduce((sum, r) => sum + this.validateCost(r.valor), 0);
    last7Days.totalRevenue.push(dayRevenue);

    // ✅ Usa filteredRequests COM FILTROS APLICADOS
    const dayActive = this.filteredRequests().filter(
      (r) =>
        r.status !== "Concluído" &&
        r.status !== "Cancelado" &&
        r.created_at?.startsWith(dateStr)
    ).length;
    last7Days.activeServices.push(dayActive);
  }

  return last7Days;
});
```

---

## Mudança 3: Atualizar stats

### ❌ ANTES

```typescript
stats = computed(() => {
    // ❌ Usa dados SEM FILTRO - mostra TODOS os registos sempre
    const requests = this.dataService.serviceRequests();
    const users = this.dataService.users();

    // ... resto do código ...
    const completed = requests.filter(
        (r) => (r.status === "Concluído" || r.status === ("Completed" as any)) && r.valor != null
    );
    const totalRevenue = completed
        .filter((r) => r.payment_status === "Paid")
        .reduce((sum, r) => sum + this.validateCost(r.valor), 0);

    // ... resto do código ...
    return [
        {
            id: "totalRevenue",
            value: this.formatCost(totalRevenue), // ❌ Sempre mostra TOTAL, nunca filtrado
            ...
        },
        ...
    ];
});
```

### ✅ DEPOIS

```typescript
stats = computed(() => {
    // ✅ Usa filteredRequests COM FILTROS APLICADOS
    const requests = this.filteredRequests(); // ✅ Use filtered requests based on selected period and professional
    const users = this.dataService.users();

    // ... resto do código ...
    const completed = requests.filter(
        (r) => (r.status === "Concluído" || r.status === ("Completed" as any)) && r.valor != null
    );
    const totalRevenue = completed
        .filter((r) => r.payment_status === "Paid")
        .reduce((sum, r) => sum + this.validateCost(r.valor), 0);

    // ... resto do código ...
    return [
        {
            id: "totalRevenue",
            value: this.formatCost(totalRevenue), // ✅ Agora mostra valor FILTRADO corretamente
            ...
        },
        ...
    ];
});
```

---

## Comparação Visual

### ❌ Cenário ANTES: Seleção de Filtros não funcionava

```
User selects:
  Period: "Last 30 Days"
  Professional: "Professional 01"
           │
           ▼
┌─────────────────────────────────────────┐
│ filteredRequests computed               │
│                                         │
│ Período: últimos 30 dias               │
│ Profissional: Prof 01                   │
│                                         │
│ Resultado: 5 registos (correto)        │
└────────────┬────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌─────────┐      ┌──────────┐
│ Stats   │      │ Sparkline│
│ Cards   │      │ Charts   │
├─────────┤      ├──────────┤
│Receita: │      │Day Data: │
│€10.000  │ ❌   │€1 €2 €3  │ ❌
│(TOTAL)  │      │(SEM FLT) │
│❌ ERRADO│      │❌ ERRADO │
└─────────┘      └──────────┘

Gráficos grandes:
│          │ ✅ CORRETO
│ ▓ ▓ ▓   │ (última fix anterior)
│▓ ▓ ▓ ▓ │
│▓▓▓▓▓▓▓ │
└────────┘
```

### ✅ Cenário DEPOIS: Filtros funcionam TODOS

```
User selects:
  Period: "Last 30 Days"
  Professional: "Professional 01"
           │
           ▼
┌─────────────────────────────────────────┐
│ filteredRequests computed               │
│                                         │
│ Período: últimos 30 dias               │
│ Profissional: Prof 01                   │
│                                         │
│ Resultado: 5 registos (correto)        │
└────────────┬────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌─────────┐      ┌──────────┐
│ Stats   │      │ Sparkline│
│ Cards   │      │ Charts   │
├─────────┤      ├──────────┤
│Receita: │      │Day Data: │
│€800     │ ✅   │€50 €100  │ ✅
│(FILTRADO)      │(FILTRADO)│
│✅ CORRETO      │✅ CORRETO│
└─────────┘      └──────────┘

Gráficos grandes:
│          │ ✅ CORRETO
│   ▓ ▓   │ (já estava assim antes)
│ ▓ ▓ ▓ ▓ │
│▓ ▓▓▓▓▓ │
└────────┘

TODOS OS COMPONENTES AGORA REFLETEM OS FILTROS!
```

---

## Técnica: Por que funcionava para gráficos mas não para stats?

### Gráficos (Funcionavam ✅)

```typescript
statusPieChartData = computed(() => {
  const counts: Record<string, number> = {};
  for (const r of this.filteredRequests()) {
    // ✅ Já estava usando filteredRequests
    const status = r.status || "Unknown";
    counts[status] = (counts[status] || 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).filter(([_, count]) => count > 0)
  );
});
```

### Stats (Não funcionavam ❌)

```typescript
stats = computed(() => {
  const requests = this.dataService.serviceRequests(); // ❌ Estava usando dados brutos
  // ... resto usa requests (que é bruto)
});
```

**Razão**: Alguém havia corrigido os gráficos mas esqueceu os stats cards!

---

## Lição Aprendida

✅ **Centralizar fonte de dados** - Usar `filteredRequests` everywhere em vez de misturar `dataService.serviceRequests()` com `filteredRequests`

```typescript
// ✅ BOM
const allData = this.filteredRequests();
const chartData = computed(() => processData(this.filteredRequests()));

// ❌ RUIM
const allData = this.dataService.serviceRequests(); // Às vezes
const chartData = computed(() => processData(this.filteredRequests())); // Outras vezes
```

---

**Status Final**: ✅ **TODOS OS COMPONENTES AGORA REFLETEM OS FILTROS COMBINADOS CORRETAMENTE**

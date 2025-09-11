# Instruções do GitHub Copilot para a Plataforma HomeService

Este documento fornece orientações essenciais para agentes de codificação IA trabalharem na plataforma HomeService - uma aplicação multilíngue de gestão de serviços portuguesa construída com Angular 18 e Supabase.

## 🏗️ Visão Geral da Arquitetura

### Stack Tecnológico Principal

- **Frontend**: Angular 18 com componentes standalone e arquitetura baseada em signals
- **Backend**: Supabase (base de dados PostgreSQL, autenticação, funcionalidades em tempo real, armazenamento)
- **Estilização**: TailwindCSS com design responsivo mobile-first
- **Linguagem**: TypeScript com type safety rigoroso
- **Internacionalização**: Suporte para português e inglês

### Estrutura do Projeto

```
src/
├── app.component.ts           # Componente raiz com roteamento de vistas e gestão de modais
├── services/                  # Camada de lógica de negócio (13 serviços especializados)
├── components/                # Componentes de UI (19 componentes para diferentes funções de utilizador)
├── models/                    # Definições de tipos TypeScript
├── pipes/                     # Pipes personalizados (transformação i18n)
└── sql/                       # Base de dados de códigos postais portugueses (17 ficheiros de migração)
```

## 🎯 Padrões Angular Signals

### Arquitetura de Componentes

Todos os componentes seguem este padrão consistente:

```typescript
@Component({
  selector: "app-example",
  standalone: true,
  imports: [CommonModule, FormsModule, I18nPipe],
  templateUrl: "./example.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExampleComponent {
  // Signals de Input/Output para comunicação entre componentes
  user = input.required<User>();
  viewDetails = output<ServiceRequest>();

  // Injeção de serviços
  private dataService = inject(DataService);
  private i18n = inject(I18nService);

  // Computed signals para estado derivado
  private userRequests = computed(() => {
    const allRequests = this.dataService.serviceRequests();
    const currentUser = this.user();
    // Lógica de negócio aqui
    return filteredRequests;
  });
}
```

### Convenções Principais dos Signals

- Use `input.required<T>()` para inputs obrigatórios de componentes
- Use `output<T>()` para eventos de componentes
- Empregue `computed()` para estado derivado que depende de outros signals
- Aplique `signal()` para estado local do componente
- Aproveite `effect()` para efeitos secundários que respondem a mudanças de signals

### Injeção de Dependências

- Use a função `inject()` dentro de construtores de componentes ou inicializadores de campos
- Prefira injeção ao nível do campo em vez de injeção no construtor
- Serviços comuns: `DataService`, `AuthService`, `I18nService`, `NotificationService`

## 🔄 Padrões da Camada de Serviços

### Serviços Principais

1. **AuthService**: Autenticação de utilizador e gestão de sessão
2. **DataService**: Estado de dados centralizado com signals para pedidos de serviço, utilizadores, categorias
3. **SupabaseService**: Operações de base de dados e subscrições em tempo real
4. **I18nService**: Suporte multilingue com traduções português/inglês
5. **Portugal Address Validation Service**: Validação especializada de códigos postais para mais de 26.000 códigos portugueses

### Padrão de Implementação de Serviços

```typescript
@Injectable({
  providedIn: "root",
})
export class ExampleService {
  private supabase = inject(SupabaseService);

  // Use signals para estado reativo
  private _items = signal<Item[]>([]);
  items = this._items.asReadonly();

  async loadItems(): Promise<void> {
    const data = await this.supabase.from("items").select("*");
    this._items.set(data || []);
  }
}
```

## 🗄️ Integração com Base de Dados e Supabase

### Fluxo de Autenticação

- Verificação de email obrigatória para todos os utilizadores
- Acesso baseado em funções: `client`, `professional`, `admin`
- Estado de autenticação em tempo real via observable `AuthService.user$`

### Padrões de Base de Dados

- Use políticas RLS (Row Level Security) para controlo de acesso aos dados
- Aproveite subscrições em tempo real para atualizações em direto
- Validação de códigos postais portugueses através de tabelas dedicadas

### Operações Supabase

```typescript
// Operações CRUD padrão
await this.supabase.client
  .from("service_requests")
  .select("*, profiles(*)")
  .eq("status", "pending");

// Subscrições em tempo real
this.supabase.client
  .channel("service_requests")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "service_requests",
    },
    () => this.refreshData()
  )
  .subscribe();
```

## 🌍 Sistema de Endereços Portugueses

### Validação de Códigos Postais

A plataforma inclui validação abrangente de códigos postais portugueses:

```typescript
// Use o Serviço de Validação de Endereços de Portugal
const validationService = inject(PortugalAddressValidationService);

// Valide códigos postais no formato XXXX-XXX
const isValid = await validationService.validatePostalCode("1000-001");

// Obtenha sugestões de localidade
const suggestions = await validationService.getLocalitySuggestions("Lisboa");
```

### Estrutura de Dados de Endereço

```typescript
interface Address {
  street: string;
  number: string;
  postal_code: string; // Formato: XXXX-XXX
  locality: string;
  district: string;
  country: string; // Sempre 'Portugal' para esta plataforma
}
```

## 🎨 Convenções de UI/UX

### Padrões TailwindCSS

- Design responsivo mobile-first com breakpoints `sm:`, `md:`, `lg:`
- Use a classe `mobile-safe` para prevenir overflow horizontal
- Espaçamento consistente com a escala de espaçamento do Tailwind
- Suporte para tema escuro/claro via propriedades CSS personalizadas

### Comunicação entre Componentes

- Pai para filho: Use signals `input()`
- Filho para pai: Use signals `output()`
- Estado global: Acesse através de serviços injetados (DataService, AuthService)

### Sistema de Modais

A aplicação usa um sistema de modais centralizado:

```typescript
// Mostrar modais via signals do componente app
showServiceRequestForm = signal(false);
showServiceRequestDetails = signal(false);
showChat = signal(false);
```

## 🔧 Fluxo de Desenvolvimento

### Criação de Componentes

1. Gere componente standalone com deteção de mudanças OnPush
2. Importe módulos necessários (CommonModule, FormsModule, I18nPipe)
3. Implemente gestão de estado baseada em signals
4. Use computed signals para estado derivado
5. Aplique tipos TypeScript adequados de `maintenance.models.ts`

### Integração de Serviços

1. Injete serviços necessários usando a função `inject()`
2. Subscreva a dados em tempo real via signals do DataService
3. Gerir estado de autenticação através do AuthService
4. Implemente tratamento de erros adequado com NotificationService

### Segurança de Tipos

- Importe tipos de `models/maintenance.models.ts`
- Use configuração TypeScript rigorosa
- Aproveite tipos de união para campos de estado: `'Pending' | 'Approved' | 'Completed'`
- Aplique interfaces adequadas para todas as estruturas de dados

## 🚀 Considerações de Performance

### Otimização de Deteção de Mudanças

- Todos os componentes usam `ChangeDetectionStrategy.OnPush`
- Signals acionam automaticamente atualizações quando os valores mudam
- Computed signals apenas recalculam quando as dependências mudam

### Integração de Bibliotecas de Terceiros

Para bibliotecas como FullCalendar que usam callbacks:

```typescript
// Use runInInjectionContext para acesso seguro ao DI em callbacks
private handleEventClick = (clickInfo: EventClickArg) => {
  runInInjectionContext(this.injector, () => {
    // Seguro usar inject() ou aceder ao DI aqui
    const data = this.dataService.findRequest(id);
  });
};
```

## 📱 Responsividade Mobile

### Abordagem Mobile-First

- Desenhe componentes primeiro para ecrãs móveis
- Use breakpoints responsivos para ecrãs maiores
- Implemente interfaces amigáveis ao toque
- Assegure tratamento adequado do viewport

### Padrões Responsivos

```html
<!-- Layouts de grelha mobile-first -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <!-- Conteúdo -->
</div>

<!-- Padrões de navegação móvel -->
<nav class="fixed bottom-0 md:relative md:bottom-auto">
  <!-- Itens de navegação -->
</nav>
```

## 🔍 Debug e Testes

### Registo na Consola

A plataforma inclui registo abrangente:

```typescript
console.log("Dashboard - Total requests:", allRequests.length);
console.log("Dashboard - Current user:", currentUser);
```

### Tratamento de Erros

- Use NotificationService para mensagens de erro voltadas para o utilizador
- Implemente blocos try-catch adequados para operações assíncronas
- Registe erros para debug enquanto fornece mensagens amigáveis ao utilizador

## 📈 Padrões de Lógica de Negócio

### Gestão de Funções de Utilizador

```typescript
// Filtragem baseada em função
if (currentUser.role === "client") {
  return allRequests.filter((r) => r.client_id === currentUser.id);
} else if (currentUser.role === "professional") {
  return allRequests.filter((r) => r.professional_id === currentUser.id);
}
```

### Ciclo de Vida do Pedido de Serviço

1. **Criado**: Pedido inicial pelo cliente
2. **Pendente**: Aguardando resposta do profissional
3. **Orçamentado**: Profissional forneceu orçamento
4. **Aprovado**: Cliente aprovou orçamento
5. **Em Progresso**: Trabalho em andamento
6. **Concluído**: Serviço terminado
7. **Cancelado**: Pedido cancelado

## 🛠️ Padrões Comuns a Seguir

### Estrutura de Template de Componente

```html
<div class="container mx-auto p-4">
  <!-- Estado de carregamento -->
  @if (loading()) {
  <div class="text-center">{{ 'loading' | i18n }}</div>
  }

  <!-- Conteúdo principal -->
  @else {
  <!-- Use @switch para roteamento de vista -->
  @switch (currentView()) { @case ('overview') {
  <!-- Conteúdo de visão geral -->
  } @case ('details') {
  <!-- Conteúdo de detalhes -->
  } } }
</div>
```

### Implementação de Método de Serviço

```typescript
async updateServiceRequest(id: string, updates: Partial<ServiceRequest>): Promise<void> {
  try {
    const { error } = await this.supabase.client
      .from('service_requests')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    await this.refreshServiceRequests();
    this.notificationService.show('Pedido de serviço atualizado com sucesso', 'success');
  } catch (error) {
    console.error('Erro ao atualizar pedido de serviço:', error);
    this.notificationService.show('Falha ao atualizar pedido de serviço', 'error');
  }
}
```

## 🎯 Notas de Implementação Importantes

1. **Sempre use signals** para gestão de estado reativo
2. **Mantenha segurança de tipos** com interfaces TypeScript adequadas
3. **Siga princípios** de design responsivo mobile-first
4. **Implemente tratamento adequado de erros** com feedback ao utilizador
5. **Use validação de códigos postais portugueses** para inputs de endereço
6. **Aproveite funcionalidades em tempo real** para atualizações de dados em direto
7. **Aplique convenções de nomenclatura consistentes** para componentes e serviços
8. **Assegure acessibilidade** com etiquetas ARIA adequadas e HTML semântico

Este guia assegura desenvolvimento de código consistente, sustentável e escalável alinhado com a arquitetura e requisitos de negócio da plataforma HomeService.

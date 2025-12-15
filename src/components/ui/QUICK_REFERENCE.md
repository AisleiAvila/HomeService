# 🚀 Quick Reference Cards

Cópie e cole estes snippets na sua aplicação.

---

## 🔘 Button Component

### Basic Usage

```html
<app-button (onClick)="submit()"> Enviar </app-button>
```

### Todos os Props

```html
<!-- Variant Primary (Padrão) -->
<app-button variant="primary">Primary</app-button>

<!-- Variant Secondary -->
<app-button variant="secondary">Secondary</app-button>

<!-- Variant Outline -->
<app-button variant="outline">Outline</app-button>

<!-- Variant Ghost -->
<app-button variant="ghost">Ghost</app-button>

<!-- Variant Danger -->
<app-button variant="danger">Danger</app-button>

<!-- Tamanho Pequeno -->
<app-button size="sm">Small</app-button>

<!-- Tamanho Médio (Padrão) -->
<app-button size="md">Medium</app-button>

<!-- Tamanho Grande -->
<app-button size="lg">Large</app-button>

<!-- Desabilitado -->
<app-button [disabled]="true">Disabled</app-button>

<!-- Com Loading -->
<app-button [loading]="isLoading()">Carregando...</app-button>

<!-- Loading com Texto Custom -->
<app-button [loading]="isLoading()" loadingText="Salvando...">
  Salvar
</app-button>

<!-- Com Ícone -->
<app-button icon="save">Salvar</app-button>

<!-- Apenas Ícone -->
<app-button iconOnly icon="plus" ariaLabel="Adicionar"></app-button>

<!-- Com ARIA Label -->
<app-button ariaLabel="Enviar formulário" (onClick)="submit()"> ➤ </app-button>

<!-- Tipo do Botão -->
<app-button type="submit">Enviar</app-button>
<app-button type="reset">Limpar</app-button>
<app-button type="button">Ação</app-button>
```

---

## 📝 Input Component

### Basic Usage

```html
<app-input
  label="Nome"
  placeholder="Digite seu nome"
  (valueChange)="name.set($event)"
>
</app-input>
```

### Todos os Props

```html
<!-- Tipo Texto -->
<app-input type="text" label="Nome"></app-input>

<!-- Tipo Email -->
<app-input type="email" label="Email" placeholder="seu@email.com"></app-input>

<!-- Tipo Password -->
<app-input type="password" label="Senha"></app-input>

<!-- Tipo Number -->
<app-input type="number" label="Idade"></app-input>

<!-- Tipo Telefone -->
<app-input type="tel" label="Telefone"></app-input>

<!-- Tipo URL -->
<app-input type="url" label="Website"></app-input>

<!-- Tipo Search -->
<app-input type="search" label="Buscar..."></app-input>

<!-- Com Label -->
<app-input label="Email *" placeholder="obrigatório"></app-input>

<!-- Obrigatório -->
<app-input required label="Nome"> </app-input>

<!-- Com Helper Text -->
<app-input label="Senha" helperText="Mínimo 8 caracteres"> </app-input>

<!-- Com Erro -->
<app-input label="Email" [error]="'Email inválido'" placeholder="seu@email.com">
</app-input>

<!-- Com Ícone Esquerda -->
<app-input label="Email" iconLeft="envelope"> </app-input>

<!-- Com Ícone Direita -->
<app-input label="Localidade" iconRight="location-dot"> </app-input>

<!-- Com Ambos Ícones -->
<app-input label="Código Postal" iconLeft="map-pin" iconRight="search">
</app-input>

<!-- Com Loading -->
<app-input label="Buscando..." [loading]="isSearching()"> </app-input>

<!-- Com Success -->
<app-input label="Email verificado" [success]="true"> </app-input>

<!-- Com Max Length -->
<app-input label="Bio" maxLength="100" placeholder="Máx 100 caracteres">
</app-input>

<!-- Desabilitado -->
<app-input label="Campo Desabilitado" [disabled]="true" value="Apenas leitura">
</app-input>

<!-- Com Value Binding -->
<app-input label="Nome" [value]="name()" (valueChange)="name.set($event)">
</app-input>

<!-- Com ARIA Label -->
<app-input ariaLabel="Campo de busca" placeholder="Buscar..."> </app-input>

<!-- Events -->
<app-input
  (valueChange)="onValueChange($event)"
  (onChange)="onChange($event)"
  (onFocus)="onFocus()"
  (onBlur)="onBlur()"
>
</app-input>
```

---

## ⏳ Skeleton Component

### Individual Skeletons

```html
<!-- Linha de Texto -->
<app-skeleton type="text"></app-skeleton>

<!-- Avatar Circular -->
<app-skeleton type="avatar" [circle]="true"></app-skeleton>

<!-- Avatar Quadrado -->
<app-skeleton type="avatar" [circle]="false"></app-skeleton>

<!-- Card -->
<app-skeleton type="card"></app-skeleton>

<!-- Linha Simples -->
<app-skeleton type="line"></app-skeleton>

<!-- Retângulo Custom -->
<app-skeleton type="rectangle" width="200px" height="100px"> </app-skeleton>

<!-- Múltiplos (com count) -->
<app-skeleton type="text" [count]="3"></app-skeleton>
```

### Skeleton Groups

```html
<!-- Card com Avatar -->
<app-skeleton-group type="card-with-avatar"></app-skeleton-group>

<!-- Bloco de Texto -->
<app-skeleton-group type="text-block"></app-skeleton-group>

<!-- Card Completo -->
<app-skeleton-group type="card"></app-skeleton-group>

<!-- Layout Tabela -->
<app-skeleton-group type="table"></app-skeleton-group>
```

### Padrão de Carregamento

```html
@if (isLoading()) {
<app-skeleton-group type="card"></app-skeleton-group>
} @else {
<!-- Seu conteúdo aqui -->
}
```

---

## 🔔 Alert Component

### Basic Usage

```html
<app-alert
  type="success"
  title="Sucesso!"
  message="Operação realizada com sucesso"
>
</app-alert>
```

### Todos os Tipos

```html
<!-- Sucesso -->
<app-alert type="success" title="✓ Sucesso" message="Dados salvos com sucesso">
</app-alert>

<!-- Erro -->
<app-alert type="error" title="✗ Erro" message="Falha ao salvar dados">
</app-alert>

<!-- Aviso -->
<app-alert type="warning" title="⚠ Aviso" message="Esta ação é permanente">
</app-alert>

<!-- Informação -->
<app-alert type="info" title="ℹ Info" message="Informação importante">
</app-alert>
```

### Com Auto-close

```html
<!-- Fechar em 3 segundos -->
<app-alert type="success" message="Operação concluída!" [autoClose]="3000">
</app-alert>

<!-- Fechar em 5 segundos -->
<app-alert [autoClose]="5000" message="Ação será desfeita em 5s"> </app-alert>
```

### Com Botão de Fechar

```html
<app-alert
  type="info"
  message="Clique X para fechar"
  [closeable]="true"
  (onClose)="handleClose()"
>
</app-alert>
```

### Condicional (if/else)

```html
@if (successMessage()) {
<app-alert
  type="success"
  [message]="successMessage()"
  [autoClose]="3000"
  [closeable]="true"
>
</app-alert>
} @if (errorMessage()) {
<app-alert
  type="error"
  title="Erro"
  [message]="errorMessage()"
  [closeable]="true"
>
</app-alert>
}
```

---

## 🌀 Loading Component

### Spinner (Padrão)

```html
<app-loading type="spinner" text="Carregando..."> </app-loading>
```

### Dots Animation

```html
<app-loading type="dots" text="Processando"> </app-loading>
```

### Progress Bar

```html
<app-loading type="progress" text="Enviando arquivo" [progress]="65">
</app-loading>
```

### Full Screen (Modal)

```html
<app-loading type="spinner" text="Por favor, aguarde..." [fullScreen]="true">
</app-loading>
```

### Overlay (Sobrepõe conteúdo)

```html
<app-loading type="spinner" [overlay]="true"> </app-loading>

<!-- Conteúdo por baixo -->
<div>Conteúdo bloqueado enquanto carrega</div>
```

---

## 📋 Exemplos de Combinação

### Form de Login

```typescript
@Component({
  imports: [ButtonComponent, InputComponent, AlertComponent],
})
export class LoginComponent {
  email = signal("");
  password = signal("");
  isLoading = signal(false);
  error = signal("");

  async login() {
    this.isLoading.set(true);
    // Lógica...
  }
}
```

```html
<div class="space-y-4">
  @if (error()) {
  <app-alert type="error" [message]="error()"></app-alert>
  }

  <app-input
    label="Email"
    type="email"
    iconLeft="envelope"
    (valueChange)="email.set($event)"
  >
  </app-input>

  <app-input
    label="Senha"
    type="password"
    iconLeft="lock"
    (valueChange)="password.set($event)"
  >
  </app-input>

  <app-button
    variant="primary"
    [loading]="isLoading()"
    [disabled]="!email() || !password()"
    (onClick)="login()"
  >
    Entrar
  </app-button>
</div>
```

### Lista com Carregamento

```html
@if (isLoading()) {
<app-skeleton-group type="card"></app-skeleton-group>
} @else if (items().length > 0) {
<div class="space-y-2">
  @for (item of items(); track item.id) {
  <div class="border p-4 rounded">{{ item.name }}</div>
  }
</div>
} @else {
<div class="text-center text-gray-500">Nenhum item encontrado</div>
}
```

### Modal com Formulário

```typescript
isOpen = signal(false);

open() { this.isOpen.set(true); }
close() { this.isOpen.set(false); }
```

```html
@if (isOpen()) {
<div class="fixed inset-0 bg-black bg-opacity-50 z-40" (click)="close()"></div>

<div class="fixed inset-0 z-50 flex items-center justify-center">
  <div class="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
    <h2 class="text-xl font-bold">Novo Item</h2>

    <app-input label="Nome"></app-input>
    <app-input label="Email" type="email"></app-input>

    <div class="flex gap-2">
      <app-button variant="secondary" (onClick)="close()">
        Cancelar
      </app-button>
      <app-button variant="primary" (onClick)="save()"> Criar </app-button>
    </div>
  </div>
</div>
}
```

---

## 💡 Dicas & Truques

### Usar em Todas as Páginas

```typescript
// common.component.ts
export const COMMON_COMPONENTS = [
  ButtonComponent,
  InputComponent,
  AlertComponent,
  SkeletonComponent,
  LoadingComponent
];

// Em cada componente
@Component({
  imports: [...COMMON_COMPONENTS, CommonModule]
})
```

### Criar Variante Custom

```html
<!-- Override via CSS variables -->
<div style="--natan-primary: #ff6b6b">
  <app-button variant="primary">Cor Custom</app-button>
</div>
```

### Loading State Pattern

```typescript
// Sempre use este padrão
@Component({
  imports: [ButtonComponent, LoadingComponent],
})
export class MyComponent {
  isLoading = signal(false);

  async doSomething() {
    this.isLoading.set(true);
    try {
      await someAsyncOperation();
    } finally {
      this.isLoading.set(false);
    }
  }
}
```

### Validação Em Tempo Real

```typescript
email = signal("");
emailError = computed(() => {
  const e = this.email();
  if (!e) return "";
  if (!e.includes("@")) return "Email inválido";
  return "";
});
```

```html
<app-input
  label="Email"
  type="email"
  [error]="emailError()"
  [success]="!emailError() && email().length > 0"
  (valueChange)="email.set($event)"
>
</app-input>
```

---

## 📱 Responsive Patterns

```html
<!-- Mobile First -->
<div class="flex flex-col md:flex-row gap-4">
  <app-button class="flex-1">Botão 1</app-button>
  <app-button class="flex-1">Botão 2</app-button>
</div>

<!-- Grid Responsivo -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  @for (item of items(); track item.id) {
  <app-skeleton type="card"></app-skeleton>
  }
</div>

<!-- Container -->
<div class="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
  <!-- Conteúdo -->
</div>
```

---

## 🎨 Dark Mode

```typescript
// App Component
isDarkMode = signal(false);

toggleDarkMode() {
  this.isDarkMode.update(v => !v);
  document.documentElement.classList.toggle('dark');
}
```

```html
<!-- Em app.component.html -->
<div [class.dark]="isDarkMode()">
  <!-- Seus componentes aqui automaticamente terão tema escuro -->
</div>
```

---

## 🔍 Importar Tudo em Um Lugar

```typescript
// component.ts
import {
  ButtonComponent,
  InputComponent,
  SkeletonComponent,
  AlertComponent,
  LoadingComponent,
} from "@/components/ui";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-my-page",
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    InputComponent,
    SkeletonComponent,
    AlertComponent,
    LoadingComponent,
  ],
  template: `<!-- seu template -->`,
})
export class MyPageComponent {}
```

---

**Última Atualização**: 2024  
**Para documentação completa**: Veja [UI_COMPONENTS_GUIDE.md](./UI_COMPONENTS_GUIDE.md)

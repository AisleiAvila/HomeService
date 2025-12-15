# Componentes de UI - Guia de Uso

## 📦 Componentes Implementados

### 1. Button Component (`app-button`)

Componente reutilizável e consistente para todos os botões da aplicação.

#### Props

```typescript
@Input() type: 'button' | 'submit' | 'reset' = 'button'
@Input() variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' = 'primary'
@Input() size: 'sm' | 'md' | 'lg' = 'md'
@Input() disabled: boolean = false
@Input() loading: boolean = false
@Input() loadingText: string = 'Carregando...'
@Input() icon: string | null = null          // Class do ícone (ex: 'fas fa-plus')
@Input() iconOnly: boolean = false            // Mostra apenas ícone
@Input() ariaLabel: string = ''

@Output() onClick: EventEmitter<void>
```

#### Exemplos

```html
<!-- Botão Primário -->
<app-button variant="primary" size="md"> Salvar </app-button>

<!-- Botão com Ícone -->
<app-button variant="primary" icon="fas fa-plus"> Adicionar Novo </app-button>

<!-- Botão Loading -->
<app-button variant="primary" [loading]="isLoading" [disabled]="isLoading">
  Processando...
</app-button>

<!-- Botão Desabilitado -->
<app-button variant="primary" [disabled]="true"> Não disponível </app-button>

<!-- Diferentes Variantes -->
<app-button variant="secondary">Secundário</app-button>
<app-button variant="outline">Outline</app-button>
<app-button variant="ghost">Ghost</app-button>
<app-button variant="danger">Deletar</app-button>
```

#### Variantes

- **primary**: Vermelho coral - ação principal
- **secondary**: Preto/cinza - ação secundária
- **outline**: Borda transparente - ação terciária
- **ghost**: Sem borda - ações leves
- **danger**: Vermelho escuro - ações destrutivas

---

### 2. Input Component (`app-input`)

Componente de entrada com validação, ícones e feedback.

#### Props

```typescript
@Input() type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' = 'text'
@Input() label: string = ''
@Input() placeholder: string = ''
@Input() value: string = ''
@Input() disabled: boolean = false
@Input() required: boolean = false
@Input() error: string = ''                 // Mensagem de erro
@Input() helperText: string = ''            // Texto de ajuda
@Input() loading: boolean = false           // Mostra spinner
@Input() success: boolean = false           // Mostra check
@Input() iconLeft: string = ''              // Ícone esquerda (ex: 'fas fa-envelope')
@Input() maxLength: number = 0              // 0 = sem limite

@Output() valueChange: EventEmitter<string>
@Output() onChange: EventEmitter<Event>
@Output() onFocus: EventEmitter<void>
@Output() onBlur: EventEmitter<void>
```

#### Exemplos

```html
<!-- Input Básico -->
<app-input
  label="Nome"
  placeholder="Digite seu nome"
  [value]="name"
  (valueChange)="name = $event"
>
</app-input>

<!-- Email com Ícone -->
<app-input
  type="email"
  label="Email"
  placeholder="seu@email.com"
  iconLeft="fas fa-envelope"
  helperText="Usaremos para contato"
>
</app-input>

<!-- Input com Validação -->
<app-input
  label="CPF"
  placeholder="000.000.000-00"
  [error]="cpfError"
  [value]="cpf"
  (valueChange)="cpf = $event; validateCpf()"
>
</app-input>

<!-- Input com Loading -->
<app-input
  label="Pesquisar Profissional"
  placeholder="Digite um nome..."
  [loading]="searching"
>
</app-input>

<!-- Input com Sucesso -->
<app-input
  label="Endereço"
  [success]="addressVerified"
  iconLeft="fas fa-map-pin"
  [value]="address"
>
</app-input>

<!-- Input com Contador -->
<app-input
  label="Descrição"
  [maxLength]="200"
  [value]="description"
  (valueChange)="description = $event"
  placeholder="Máximo 200 caracteres"
>
</app-input>

<!-- Input Desabilitado -->
<app-input label="ID da Solicitação" [disabled]="true" [value]="requestId">
</app-input>
```

---

### 3. Skeleton Component (`app-skeleton`)

Para estados de carregamento.

#### Props

```typescript
@Input() type: 'text' | 'avatar' | 'card' | 'line' | 'rectangle' = 'text'
@Input() width: string = '100%'
@Input() height: string = '1rem'
@Input() circle: boolean = false
```

#### Exemplos

```html
<!-- Skeleton de Texto -->
<app-skeleton type="text" width="80%"></app-skeleton>

<!-- Avatar -->
<app-skeleton type="avatar"></app-skeleton>

<!-- Card -->
<app-skeleton type="card"></app-skeleton>

<!-- Customizado -->
<app-skeleton width="200px" height="100px" circle="true"></app-skeleton>
```

---

### 4. Skeleton Group Component (`app-skeleton-group`)

Para layouts completos em carregamento.

#### Props

```typescript
@Input() type: 'card-with-avatar' | 'text-block' | 'card' | 'table'
```

#### Exemplos

```html
<!-- Card com Avatar e Texto -->
<app-skeleton-group type="card-with-avatar"></app-skeleton-group>

<!-- Bloco de Texto -->
<app-skeleton-group type="text-block"></app-skeleton-group>

<!-- Card Completo -->
<app-skeleton-group type="card"></app-skeleton-group>

<!-- Tabela -->
<app-skeleton-group type="table"></app-skeleton-group>
```

---

### 5. Alert Component (`app-alert`)

Para mensagens de feedback ao usuário.

#### Props

```typescript
@Input() type: 'success' | 'error' | 'warning' | 'info' = 'info'
@Input() title: string = ''
@Input() message: string = ''
@Input() closeable: boolean = true
@Input() visible: boolean = true
@Input() autoClose: number = 0              // ms, 0 = nunca fecha

@Output() onClose: EventEmitter<void>
```

#### Exemplos

```html
<!-- Alert de Sucesso -->
<app-alert
  type="success"
  title="Sucesso!"
  message="Seu pedido foi criado com sucesso"
>
</app-alert>

<!-- Alert de Erro -->
<app-alert
  type="error"
  title="Erro ao salvar"
  message="Verifique os dados e tente novamente"
>
</app-alert>

<!-- Alert com Auto-Close -->
<app-alert type="info" message="Operação concluída" [autoClose]="3000">
</app-alert>

<!-- Alert Não Fechável -->
<app-alert
  type="warning"
  title="Atenção"
  message="Este pedido requer verificação"
  [closeable]="false"
>
</app-alert>
```

---

### 6. Loading Component (`app-loading`)

Para estados de carregamento da página.

#### Props

```typescript
@Input() type: 'spinner' | 'dots' | 'progress' = 'spinner'
@Input() text: string = ''
@Input() progress: number = 0               // 0-100 para type='progress'
@Input() fullScreen: boolean = false        // Tela inteira
@Input() overlay: boolean = false           // Sobreposição
```

#### Exemplos

```html
<!-- Spinner Simples -->
<app-loading type="spinner" text="Carregando..."></app-loading>

<!-- Dots Animation -->
<app-loading type="dots" text="Processando..."></app-loading>

<!-- Progress Bar -->
<app-loading type="progress" [progress]="65" text="65% completo"></app-loading>

<!-- Full Screen -->
<app-loading type="spinner" [fullScreen]="true"></app-loading>

<!-- Com Overlay -->
<div class="relative">
  <app-loading type="dots" [overlay]="true"></app-loading>
  <!-- Conteúdo -->
</div>
```

---

## 🎨 Integração com Design System

Todos os componentes usam as cores do design system:

- **Vermelho Coral** (`#ea5455`) - Primário
- **Preto/Cinza** (`#333333`) - Secundário
- **Cinza Claro** (`#9e9e9e`) - Terciário

### Importação Rápida

```typescript
import { ButtonComponent } from "@/components/ui/button.component";
import { InputComponent } from "@/components/ui/input.component";
import {
  AlertComponent,
  LoadingComponent,
} from "@/components/ui/feedback.component";
import {
  SkeletonComponent,
  SkeletonGroupComponent,
} from "@/components/ui/skeleton.component";

@Component({
  imports: [
    ButtonComponent,
    InputComponent,
    AlertComponent,
    LoadingComponent,
    SkeletonComponent,
    SkeletonGroupComponent,
  ],
})
export class MyComponent {}
```

---

## 📋 Exemplo Completo: Formulário

```html
<div class="card-brand p-6 space-y-6">
  <h2 class="text-2xl font-bold text-brand-primary-600">Criar Novo Pedido</h2>

  <form (ngSubmit)="onSubmit()" class="space-y-4">
    <!-- Nome -->
    <app-input
      label="Seu Nome"
      placeholder="Digite seu nome completo"
      [value]="form.name"
      (valueChange)="form.name = $event"
      [error]="errors.name"
      required
    >
    </app-input>

    <!-- Email -->
    <app-input
      type="email"
      label="Email"
      placeholder="seu@email.com"
      iconLeft="fas fa-envelope"
      [value]="form.email"
      (valueChange)="form.email = $event"
      [error]="errors.email"
      required
    >
    </app-input>

    <!-- Descrição -->
    <app-input
      label="Descrição do Serviço"
      placeholder="Descreva detalhadamente..."
      [value]="form.description"
      (valueChange)="form.description = $event"
      [maxLength]="200"
      required
    >
    </app-input>

    <!-- Botões -->
    <div class="flex gap-3 pt-4">
      <app-button variant="ghost" size="md" (onClick)="onCancel()">
        Cancelar
      </app-button>
      <app-button
        variant="primary"
        size="md"
        type="submit"
        [loading]="isSubmitting"
        [disabled]="!isFormValid || isSubmitting"
      >
        <i class="fas fa-check mr-2"></i>
        Criar Pedido
      </app-button>
    </div>
  </form>

  <!-- Alerts -->
  <app-alert
    *ngIf="successMessage"
    type="success"
    title="Sucesso!"
    [message]="successMessage"
    [autoClose]="3000"
  >
  </app-alert>

  <app-alert
    *ngIf="errorMessage"
    type="error"
    title="Erro"
    [message]="errorMessage"
    [closeable]="true"
  >
  </app-alert>
</div>
```

---

## 🔄 Best Practices

1. **Sempre use `app-button`** em vez de `<button>` nativo
2. **Use `app-input`** para todos os campos de entrada
3. **Mostre `app-skeleton`** enquanto carrega dados
4. **Use `app-alert`** para feedback ao usuário
5. **Loading state**: coloque ícone de loading + desabilite o botão
6. **Validação**: mostre erro abaixo do input
7. **Success feedback**: use check e cores verdes

---

## 🧪 Testar os Componentes

Adicione esta rota no `app.routes.ts`:

```typescript
{
  path: 'ui-components',
  component: UiComponentsShowcaseComponent
}
```

Acesse: `http://localhost:4200/ui-components`

---

**Versão:** 1.0.0  
**Atualizado:** 15 de dezembro de 2025

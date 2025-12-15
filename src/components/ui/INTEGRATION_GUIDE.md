# Guia de Integração - UI Components

## 📋 Sumário

Este guia mostra como integrar a biblioteca de componentes de UI na sua aplicação HomeService.

## 🚀 Adição às Rotas

Adicione as seguintes rotas ao arquivo `src/app/app.routes.ts`:

```typescript
import { UiComponentsShowcaseComponent } from "@/components/ui/ui-components-showcase.component";
import { DesignSystemShowcaseComponent } from "@/components/ui/design-system-showcase.component";

export const routes: Routes = [
  // ... suas rotas existentes ...

  // Rotas de Documentação/Desenvolvimento
  {
    path: "ui-components",
    component: UiComponentsShowcaseComponent,
    data: { title: "Componentes de UI" },
  },
  {
    path: "design-system",
    component: DesignSystemShowcaseComponent,
    data: { title: "Design System" },
  },
];
```

## 📦 Usando em Componentes

### Opção 1: Importar Componentes Individuais

```typescript
import { Component } from "@angular/core";
import { ButtonComponent } from "@/components/ui/button.component";
import { InputComponent } from "@/components/ui/input.component";

@Component({
  selector: "app-meu-componente",
  standalone: true,
  imports: [ButtonComponent, InputComponent],
  template: `
    <app-button variant="primary" (onClick)="handleClick()">
      Clique aqui
    </app-button>

    <app-input
      label="Nome"
      placeholder="Digite seu nome"
      (valueChange)="onNameChange($event)"
    >
    </app-input>
  `,
})
export class MeuComponent {}
```

### Opção 2: Importar Índice Central

```typescript
import { Component } from "@angular/core";
import {
  ButtonComponent,
  InputComponent,
  AlertComponent,
} from "@/components/ui";

@Component({
  selector: "app-formulario",
  standalone: true,
  imports: [ButtonComponent, InputComponent, AlertComponent],
  template: `
    <div class="form-container">
      <!-- Seu formulário -->
    </div>
  `,
})
export class FormularioComponent {}
```

## 🎯 Exemplos Práticos

### Exemplo 1: Formulário de Cadastro

```typescript
import { Component, inject } from "@angular/core";
import { ButtonComponent } from "@/components/ui/button.component";
import { InputComponent } from "@/components/ui/input.component";
import { AlertComponent } from "@/components/ui/feedback.component";
import { DataService } from "@/services/data.service";

@Component({
  selector: "app-signup-form",
  standalone: true,
  imports: [ButtonComponent, InputComponent, AlertComponent],
  template: `
    <div class="p-6 space-y-4">
      <h1 class="text-2xl font-bold text-natan-black">Criar Conta</h1>

      <app-alert
        *ngIf="error()"
        type="error"
        [title]="'Erro ao criar conta'"
        [message]="error()"
        [closeable]="true"
      >
      </app-alert>

      <app-input
        label="Email"
        type="email"
        placeholder="seu@email.com"
        [error]="emailError()"
        (valueChange)="email.set($event)"
      >
      </app-input>

      <app-input
        label="Senha"
        type="password"
        placeholder="••••••••"
        [error]="passwordError()"
        (valueChange)="password.set($event)"
      >
      </app-input>

      <app-button
        variant="primary"
        [loading]="isLoading()"
        [disabled]="isLoading() || !isFormValid()"
        (onClick)="handleSignup()"
      >
        Criar Conta
      </app-button>
    </div>
  `,
})
export class SignupFormComponent {
  private dataService = inject(DataService);

  email = signal("");
  password = signal("");
  error = signal("");
  isLoading = signal(false);

  isFormValid = computed(() => {
    return this.email().length > 0 && this.password().length >= 6;
  });

  async handleSignup() {
    this.isLoading.set(true);
    try {
      await this.dataService.signup(this.email(), this.password());
      this.error.set("");
      // Redirecionar para dashboard
    } catch (err: any) {
      this.error.set(err.message);
    } finally {
      this.isLoading.set(false);
    }
  }
}
```

### Exemplo 2: Lista com Carregamento

```typescript
import { Component, inject, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  SkeletonComponent,
  SkeletonGroupComponent,
} from "@/components/ui/skeleton.component";
import { DataService } from "@/services/data.service";

@Component({
  selector: "app-service-list",
  standalone: true,
  imports: [CommonModule, SkeletonComponent, SkeletonGroupComponent],
  template: `
    <div class="p-4 space-y-4">
      <h2 class="text-xl font-bold">Meus Pedidos</h2>

      <!-- Loading State -->
      @if (isLoading()) {
      <app-skeleton-group type="card"></app-skeleton-group>
      }

      <!-- Conteúdo Carregado -->
      @else if (services().length > 0) {
      <div class="grid gap-4">
        @for (service of services(); track service.id) {
        <div class="border rounded-lg p-4 bg-white shadow-card">
          <h3 class="font-semibold">{{ service.title }}</h3>
          <p class="text-gray-600">{{ service.description }}</p>
          <span
            class="inline-block mt-2 px-3 py-1 rounded-full text-sm"
            [ngClass]="statusClass(service.status)"
          >
            {{ service.status }}
          </span>
        </div>
        }
      </div>
      }

      <!-- Vazio -->
      @else {
      <div class="text-center p-8 text-gray-500">Nenhum pedido encontrado</div>
      }
    </div>
  `,
})
export class ServiceListComponent {
  private dataService = inject(DataService);

  services = this.dataService.serviceRequests;
  isLoading = this.dataService.isLoading;

  statusClass(status: string) {
    const classes: Record<string, string> = {
      Pending: "bg-yellow-100 text-yellow-800",
      Approved: "bg-green-100 text-green-800",
      Completed: "bg-gray-100 text-gray-800",
      Cancelled: "bg-red-100 text-red-800",
    };
    return classes[status] || "bg-gray-100 text-gray-800";
  }
}
```

### Exemplo 3: Modal com Formulário

```typescript
import { Component, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ButtonComponent } from "@/components/ui/button.component";
import { InputComponent } from "@/components/ui/input.component";
import { AlertComponent } from "@/components/ui/feedback.component";

@Component({
  selector: "app-edit-profile-modal",
  standalone: true,
  imports: [CommonModule, ButtonComponent, InputComponent, AlertComponent],
  template: `
    <!-- Overlay -->
    @if (isOpen()) {
    <div
      class="fixed inset-0 bg-black bg-opacity-50 z-40"
      (click)="close()"
    ></div>
    }

    <!-- Modal -->
    <div
      *ngIf="isOpen()"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div class="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
        <h2 class="text-xl font-bold text-natan-black">Editar Perfil</h2>

        <app-alert
          *ngIf="success()"
          type="success"
          title="Sucesso"
          message="Perfil atualizado com sucesso!"
          [autoClose]="3000"
          [closeable]="true"
        >
        </app-alert>

        <app-input
          label="Nome"
          placeholder="Seu nome"
          [value]="name()"
          (valueChange)="name.set($event)"
        >
        </app-input>

        <app-input
          label="Email"
          type="email"
          placeholder="seu@email.com"
          [value]="email()"
          (valueChange)="email.set($event)"
        >
        </app-input>

        <div class="flex gap-2 pt-4">
          <app-button
            variant="secondary"
            [disabled]="isSaving()"
            (onClick)="close()"
          >
            Cancelar
          </app-button>

          <app-button
            variant="primary"
            [loading]="isSaving()"
            [disabled]="isSaving() || !isFormValid()"
            (onClick)="save()"
          >
            Guardar
          </app-button>
        </div>
      </div>
    </div>
  `,
})
export class EditProfileModalComponent {
  isOpen = signal(false);
  isSaving = signal(false);
  success = signal(false);

  name = signal("");
  email = signal("");

  isFormValid = computed(() => {
    return this.name().length > 0 && this.email().length > 0;
  });

  open() {
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  async save() {
    this.isSaving.set(true);
    try {
      // Salvar dados
      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.success.set(true);
      setTimeout(() => this.close(), 2000);
    } finally {
      this.isSaving.set(false);
    }
  }
}
```

## 🎨 Temas e Personalizações

### Usando Componentes com Temas Escuros

Os componentes suportam temas via CSS variables. Para ativar modo escuro:

```typescript
// Em app.component.ts
export class AppComponent {
  private document = inject(DOCUMENT);
  isDarkMode = signal(false);

  toggleDarkMode() {
    this.isDarkMode.update((val) => !val);
    const root = this.document.documentElement;
    if (this.isDarkMode()) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }
}
```

### Criar Variante Personalizada de Botão

```typescript
// Em seu componente
<app-button
  [style.--natan-primary]="'#ff6b6b'"
  variant="primary"
  size="lg">
  Botão Personalizado
</app-button>
```

## 📱 Responsividade

Todos os componentes seguem a abordagem mobile-first com suporte completo para breakpoints responsivos:

```html
<!-- Container responsivo -->
<div class="p-4 md:p-6 lg:p-8">
  <app-button size="sm" class="md:size-md lg:size-lg">
    Botão Responsivo
  </app-button>
</div>
```

## ♿ Acessibilidade

Todos os componentes incluem atributos ARIA adequados:

- `aria-label`: Descrição para leitores de tela
- `aria-invalid`: Indica campos com erro
- `aria-busy`: Indica estado de carregamento
- `role`: Define papel do elemento

Exemplo:

```typescript
<app-button
  ariaLabel="Enviar formulário"
  [disabled]="isSubmitting()"
  [loading]="isSubmitting()">
  Enviar
</app-button>
```

## 🔍 Verificar Componentes em Ação

1. Execute a aplicação: `npm start`
2. Navegue para: `http://localhost:4200/ui-components`
3. Explore todos os componentes e suas variantes

## 📚 Recursos Adicionais

- Documentação Completa: [UI_COMPONENTS_GUIDE.md](./UI_COMPONENTS_GUIDE.md)
- Design System: [DESIGN_SYSTEM.md](./../../DESIGN_SYSTEM.md)
- Cores da Marca: [CORES_LOGO_NATAN.md](./../../CORES_LOGO_NATAN.md)

## 💡 Dicas e Boas Práticas

1. **Use Signals para Estado**: Sempre use signals para estado reativo
2. **Valide Inputs**: Use a propriedade `error` para feedback de validação
3. **Indicadores de Carregamento**: Use `loading` true durante operações async
4. **Feedback ao Usuário**: Combine com `AlertComponent` para mensagens
5. **Acessibilidade**: Sempre forneça `ariaLabel` em botões sem texto
6. **Temas**: Respeite preferências do usuário de modo escuro

## 🐛 Troubleshooting

### Componentes não aparecem

- Verifique se a pasta `src/components/ui` existe
- Confirme que os imports estão corretos
- Execute `npm start` para rebuild

### Estilos não aplicam

- Verifique se o TailwindCSS está configurado
- Confirme que as classes customizadas estão em `tailwind.config.cjs`
- Limpe cache do navegador (Ctrl+Shift+Del)

### TypeScript errors

- Instale tipos necessários: `npm install --save-dev @types/node`
- Verifique tsconfig.json paths
- Execute `npm install` para atualizar dependências

---

**Criado para**: Plataforma HomeService - Natan Construtora
**Última atualização**: 2024
**Mantém compatibilidade com**: Angular 18+, TypeScript 5.0+, Tailwind CSS 3.0+

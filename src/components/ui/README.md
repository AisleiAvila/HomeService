# 🎨 Biblioteca de Componentes de UI - Natan Construtora

Uma biblioteca completa e reutilizável de componentes Angular 18 seguindo o design system da marca Natan Construtora.

## 📦 Componentes Inclusos

### 🔘 Button Component

Botão versátil com múltiplas variantes, tamanhos e estados.

**Variantes:**

- `primary` - Vermelho coral (#ea5455) - Ações principais
- `secondary` - Preto (#333333) - Ações secundárias
- `outline` - Borda com fundo transparente
- `ghost` - Sem fundo, apenas texto
- `danger` - Vermelho escuro para ações destrutivas

**Tamanhos:** `sm`, `md`, `lg`

**Estados:** Normal, Hover, Active, Disabled, Loading

```html
<app-button variant="primary" size="md" [loading]="isLoading">
  Enviar
</app-button>
```

---

### 📝 Input Component

Campo de entrada unificado com suporte a validação, ícones e estado de carregamento.

**Tipos Suportados:**

- text, email, password, number, tel, url, search

**Recursos:**

- ✅ Rótulo (label) integrado
- ✅ Mensagens de erro e helper
- ✅ Ícones esquerda/direita com animação
- ✅ Indicador de sucesso (✓ verde)
- ✅ Spinner de carregamento
- ✅ Contador de caracteres
- ✅ Estado required

```html
<app-input
  label="Email"
  type="email"
  placeholder="seu@email.com"
  [error]="emailError()"
  iconLeft="envelope"
  (valueChange)="email.set($event)"
>
</app-input>
```

---

### ⏳ Skeleton Component

Componentes de placeholder para estados de carregamento.

**Tipos Disponíveis:**

- `text` - Linha de texto
- `avatar` - Círculo para avatar
- `card` - Retângulo completo
- `line` - Linha simples
- `rectangle` - Retângulo customizável

**Grupos Predefinidos:**

- `card-with-avatar` - Card com avatar e linhas
- `text-block` - Bloco de texto (3 linhas)
- `card` - Card completo
- `table` - Layout tipo tabela

```html
<!-- Individual -->
<app-skeleton type="avatar" [circle]="true"></app-skeleton>

<!-- Grupo -->
<app-skeleton-group type="card-with-avatar"></app-skeleton-group>
```

---

### 🔔 Alert Component

Componente de notificação com 4 tipos de feedback.

**Tipos:**

- `success` - Verde (#10b981)
- `error` - Vermelho (#ef4444)
- `warning` - Amarelo (#f59e0b)
- `info` - Azul (#3b82f6)

**Recursos:**

- ✅ Auto-fechamento configurável
- ✅ Botão X para fechar manualmente
- ✅ Ícones contextualmente apropriados
- ✅ Acessibilidade (role="alert")

```html
<app-alert
  type="success"
  title="Sucesso"
  message="Operação realizada com sucesso!"
  [autoClose]="3000"
  [closeable]="true"
>
</app-alert>
```

---

### 🌀 Loading Component

Indicadores de carregamento com múltiplas visualizações.

**Tipos:**

- `spinner` - Ícone giratório clássico
- `dots` - Animação de 3 pontos
- `progress` - Barra de progresso

**Modos:**

- Normal (inline)
- `fullScreen` - Tela cheia
- `overlay` - Sobrepõe conteúdo

```html
<app-loading type="spinner" text="Carregando dados..." [fullScreen]="true">
</app-loading>
```

---

## 🚀 Início Rápido

### 1. Importar Componentes

```typescript
import { ButtonComponent, InputComponent } from "@/components/ui";

@Component({
  imports: [ButtonComponent, InputComponent],
})
export class MyComponent {}
```

### 2. Usar no Template

```html
<app-button variant="primary" (onClick)="submit()"> Enviar </app-button>

<app-input label="Nome" [error]="errors.name" (valueChange)="name.set($event)">
</app-input>
```

### 3. Gerenciar Estados com Signals

```typescript
import { signal, computed } from "@angular/core";

export class MyComponent {
  formData = signal({ name: "", email: "" });
  isSubmitting = signal(false);

  isFormValid = computed(() => {
    return formData().name.length > 0 && formData().email.length > 0;
  });

  async submit() {
    this.isSubmitting.set(true);
    try {
      // Enviar dados
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
```

---

## 📖 Documentação Completa

Veja [UI_COMPONENTS_GUIDE.md](./UI_COMPONENTS_GUIDE.md) para:

- ✅ API detalhada de cada componente
- ✅ 25+ exemplos de código
- ✅ Padrões de validação
- ✅ Formulários completos
- ✅ Boas práticas

---

## 🎯 Guia de Integração

Veja [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) para:

- ✅ Adicionar rotas na aplicação
- ✅ Exemplos práticos (formulários, listas, modais)
- ✅ Temas e personalizações
- ✅ Dicas de acessibilidade
- ✅ Troubleshooting

---

## 🎨 Design System

Veja [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md) para:

- ✅ Cores da marca Natan Construtora
- ✅ Tokens de design (spacing, shadows, etc)
- ✅ Tipografia
- ✅ Componentes de exemplo

---

## 🌍 Cores da Marca

- **Vermelho Coral** `#ea5455` - Ação, energia, chamada
- **Preto** `#333333` - Profissionalismo, estrutura
- **Cinza Claro** `#9e9e9e` - Hierarquia, desativado

---

## ✨ Recursos Principais

### 🎯 Consistência Visual

Todos os componentes seguem o design system unificado da Natan Construtora.

### ♿ Acessibilidade

- WCAG 2.1 Level AA
- Atributos ARIA completos
- Navegação por teclado
- Suporte a leitores de tela

### 📱 Responsivo

- Mobile-first
- Funciona em todos os dispositivos
- Otimizado para toque

### 🚀 Performance

- Change detection otimizado (OnPush)
- Signals para reatividade eficiente
- Sem dependências externas desnecessárias

### 🌙 Tema Escuro

- Suporte completo a dark mode
- CSS variables para customização
- Respeita preferências do sistema

---

## 📋 Estrutura de Arquivos

```
src/components/ui/
├── button.component.ts           # Componente de botão
├── input.component.ts            # Componente de input
├── skeleton.component.ts         # Componentes de skeleton
├── feedback.component.ts         # Componentes de alerta e loading
├── ui-components-showcase.ts     # Demonstração interativa
├── index.ts                      # Exportações centralizadas
├── README.md                     # Este arquivo
├── UI_COMPONENTS_GUIDE.md        # Documentação detalhada
└── INTEGRATION_GUIDE.md          # Guia de integração
```

---

## 🔧 Configuração

Os componentes usam:

- **Angular 18** com standalone components
- **Tailwind CSS** para estilização
- **TypeScript** com strict mode
- **Font Awesome** para ícones

Nenhuma configuração adicional necessária - apenas importe e use!

---

## 💡 Exemplos de Uso

### Formulário de Login

```typescript
@Component({
  selector: "app-login",
  standalone: true,
  imports: [ButtonComponent, InputComponent, AlertComponent],
  template: `
    <div class="max-w-md mx-auto p-6 space-y-4">
      <h1 class="text-2xl font-bold">Login</h1>

      <app-alert *ngIf="error()" type="error" title="Erro" [message]="error()">
      </app-alert>

      <app-input label="Email" type="email" (valueChange)="email.set($event)">
      </app-input>

      <app-input
        label="Senha"
        type="password"
        (valueChange)="password.set($event)"
      >
      </app-input>

      <app-button variant="primary" [loading]="isLoading()" (onClick)="login()">
        Entrar
      </app-button>
    </div>
  `,
})
export class LoginComponent {
  email = signal("");
  password = signal("");
  isLoading = signal(false);
  error = signal("");

  async login() {
    this.isLoading.set(true);
    // Lógica de login...
  }
}
```

### Lista com Carregamento

```html
@if (isLoading()) {
<app-skeleton-group type="card"></app-skeleton-group>
} @else { @for (item of items(); track item.id) {
<div class="border rounded-lg p-4">
  <h3>{{ item.title }}</h3>
  <p>{{ item.description }}</p>
</div>
} }
```

---

## 🎬 Como Visualizar

1. **Execute a aplicação:**

   ```bash
   npm start
   ```

2. **Acesse a demonstração interativa:**

   ```
   http://localhost:4200/ui-components
   ```

3. **Explore todos os componentes:**
   - Veja todas as variantes
   - Teste estados interativos
   - Copie exemplos de código

---

## 🤝 Contribuindo

Para adicionar novos componentes:

1. Crie arquivo: `src/components/ui/novo.component.ts`
2. Implemente com padrão standalone
3. Adicione à exportação em `index.ts`
4. Documente em `UI_COMPONENTS_GUIDE.md`
5. Mostre exemplo em `ui-components-showcase.component.ts`

---

## 📝 Licença

Desenvolvido para Natan Construtora - Plataforma HomeService

---

## 📞 Suporte

Para dúvidas ou problemas:

1. Verifique [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Troubleshooting
2. Explore exemplos em `ui-components-showcase.component.ts`
3. Consulte [UI_COMPONENTS_GUIDE.md](./UI_COMPONENTS_GUIDE.md)

---

**Última Atualização**: 2024  
**Compatível com**: Angular 18+, Tailwind CSS 3.0+, TypeScript 5.0+

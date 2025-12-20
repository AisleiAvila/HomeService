# 📋 Guia: Padrão para Formulários com Botões Fixos

**Objetivo**: Garantir que botões de ação estejam **sempre visíveis** em formulários longos dentro de containers com scroll.

---

## 🎯 Padrão Recomendado

### Estrutura HTML

```html
<!-- Wrapper Principal -->
<div class="w-full h-full flex flex-col mobile-safe relative">
  <!-- Estado de Carregamento -->
  <ng-container *ngIf="loading">
    <div class="text-center text-gray-500 py-8">{{ 'loading' | i18n }}</div>
  </ng-container>

  <!-- Conteúdo Principal -->
  <ng-container *ngIf="!loading && data">
    <!-- Formulário com Layout Flex -->
    <form
      class="w-full flex flex-col h-full mobile-safe relative"
      (ngSubmit)="save()"
    >
      <!-- Card Container com Subdivisão -->
      <div
        class="bg-gradient-to-r from-brand-primary-600 to-brand-primary-500 rounded-lg shadow-md overflow-hidden flex flex-col h-full"
      >
        <!-- 1. HEADER (Nunca scrollável) -->
        <div
          class="px-6 py-4 border-b border-white border-opacity-20 flex-shrink-0"
        >
          <h2 class="text-2xl font-bold text-white">{{ 'title' | i18n }}</h2>
          <p class="text-white text-sm mt-1">{{ 'subtitle' | i18n }}</p>
        </div>

        <!-- 2. CONTEÚDO (Scrollável) -->
        <div class="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-800">
          <!-- Seção 1 -->
          <div class="mb-6">
            <h3
              class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4"
            >
              {{ 'section1' | i18n }}
            </h3>
            <!-- Campos -->
          </div>

          <!-- Seção 2 -->
          <div class="mb-6">
            <h3
              class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4"
            >
              {{ 'section2' | i18n }}
            </h3>
            <!-- Campos -->
          </div>

          <!-- Mensagens de Erro -->
          <div
            *ngIf="error"
            class="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-4"
          >
            <div class="flex items-center text-red-800 dark:text-red-200">
              <i class="fas fa-exclamation-triangle mr-2"></i>
              <span class="text-sm font-medium">{{ error }}</span>
            </div>
          </div>
        </div>

        <!-- 3. FOOTER COM BOTÕES (Nunca scrollável) -->
        <div
          class="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex-shrink-0"
        >
          <div class="flex flex-col sm:flex-row gap-3 mobile-safe">
            <button
              type="button"
              (click)="cancel()"
              class="w-full sm:flex-1 px-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              {{ 'cancel' | i18n }}
            </button>
            <button
              type="submit"
              class="w-full sm:flex-1 px-4 py-3 sm:py-2 bg-brand-primary-600 dark:bg-brand-primary-700 text-white rounded-lg hover:bg-brand-primary-700 dark:hover:bg-brand-primary-800 transition-colors font-medium"
            >
              {{ 'submit' | i18n }}
            </button>
          </div>
        </div>
      </div>
    </form>
  </ng-container>
</div>
```

---

## 🔑 Elementos-Chave

### 1. Wrapper Principal

```html
<div class="w-full h-full flex flex-col mobile-safe relative"></div>
```

- `w-full h-full`: Ocupa 100% da largura e altura disponível
- `flex flex-col`: Layout vertical
- `mobile-safe`: Proteção contra overflow

### 2. Header (Fixo)

```html
<div
  class="px-6 py-4 border-b border-white border-opacity-20 flex-shrink-0"
></div>
```

- `flex-shrink-0`: Nunca encolhe, mantém altura original
- Aparece sempre no topo

### 3. Conteúdo (Scrollável)

```html
<div class="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-800"></div>
```

- `flex-1`: Ocupa todo espaço disponível
- `overflow-y-auto`: Permite scroll vertical
- Conteúdo do formulário aqui

### 4. Footer (Fixo)

```html
<div
  class="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex-shrink-0"
></div>
```

- `flex-shrink-0`: Nunca encolhe, mantém altura original
- `border-t`: Borda superior para separação
- Botões de ação aqui

---

## 📐 Diagrama de Fluxo

```
┌─────────────────────────────────────────┐
│ Wrapper (w-full h-full flex flex-col)  │
├─────────────────────────────────────────┤
│ Header (flex-shrink-0)                  │
│ - Título                                │
│ - Subtítulo                             │
├─────────────────────────────────────────┤
│ Conteúdo (flex-1 overflow-y-auto)      │
│ - Seção 1                               │
│ - Seção 2                               │
│ - Campos                                │
│ - Mensagens de Erro                     │
│ [Scroll aqui]                           │
├─────────────────────────────────────────┤
│ Footer (flex-shrink-0)                  │
│ [Cancelar] [Enviar]                    │
│ Sempre visível!                         │
└─────────────────────────────────────────┘
```

---

## 🎯 Componentes para Atualizar

### Prioridade Alta (Formulários Longos)

- [ ] `service-request-form.component.html` - Novo pedido
- [ ] `admin-service-request-form.component.html` - Admin cria pedido
- [ ] `professional-edit-page.component.html` - Editar profissional

### Prioridade Média (Formulários Moderados)

- [ ] `profile.component.html` - Editar perfil
- [ ] `scheduling-form.component.html` - Agendar serviço
- [ ] `category-management.component.html` - Modals de categoria

### Prioridade Baixa (Formulários Pequenos)

- [ ] `register.component.html` - Registar
- [ ] `login.component.html` - Entrar

---

## ✅ Checklist de Implementação

Para cada componente:

```
☐ Adicionar h-full flex flex-col ao wrapper
☐ Adicionar flex flex-col h-full ao form
☐ Adicionar flex flex-col h-full ao card
☐ Adicionar flex-shrink-0 ao header
☐ Adicionar flex-1 overflow-y-auto ao conteúdo
☐ Mover botões para footer separado
☐ Adicionar flex-shrink-0 ao footer
☐ Adicionar border-t ao footer
☐ Testar em desktop
☐ Testar em mobile
☐ Testar scroll
☐ Testar dark mode
```

---

## 💡 Casos de Uso

### ✅ Quando Usar Este Padrão

- Formulários com muitos campos
- Conteúdo dinâmico que cresce
- Botões de ação importantes
- Containers com altura limitada
- Dentro de rotas/modals

### ❌ Quando Não Usar

- Formulários muito pequenos (3-4 campos)
- Páginas normais de scroll vertical
- Componentes sem botões de ação

---

## 🔍 Exemplos de Verificação

### Antes (Problema)

```html
<div class="w-full">
  <form>
    <div class="overflow-hidden">
      <div>Header</div>
      <div class="p-6">
        <!-- Campos muito longos -->
        <!-- Botões desaparecem -->
      </div>
    </div>
  </form>
</div>
```

### Depois (Correto)

```html
<div class="w-full h-full flex flex-col">
  <form class="w-full flex flex-col h-full">
    <div class="flex flex-col h-full overflow-hidden">
      <div class="flex-shrink-0">Header</div>
      <div class="flex-1 overflow-y-auto p-6">
        <!-- Campos com scroll -->
      </div>
      <div class="flex-shrink-0 border-t">
        <!-- Botões sempre visíveis -->
      </div>
    </div>
  </form>
</div>
```

---

## 🚀 Próximos Passos

1. **Identificar componentes** que precisam da correção
2. **Aplicar padrão** a cada um
3. **Testar responsividade** em mobile/desktop
4. **Documentar mudanças** em cada componente
5. **Revisar dark mode** compatibilidade

---

## 📚 Referências

- Tailwind Flexbox: https://tailwindcss.com/docs/display#flex
- Flex Grow/Shrink: https://tailwindcss.com/docs/flex
- Overflow: https://tailwindcss.com/docs/overflow

---

## 📝 Notas

- Este padrão garante **consistência** em toda a aplicação
- Implementação **progressiva** (não precisa tudo de uma vez)
- Reutilizável em **novos componentes**
- Compatível com **responsive design**

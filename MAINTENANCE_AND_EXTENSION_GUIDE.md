# 🛠️ Guia de Manutenção e Extensão da Identidade Visual

## 📖 Visão Geral

Este guia fornece instruções para manter, estender e atualizar a identidade visual Natan Construtora na plataforma HomeService.

---

## 🎨 Paleta de Cores da Marca

### Cores Primárias Definidas

```css
/* CSS Custom Properties (em src/styles.css) */
:root {
  --brand-primary-50: #f9ecec;
  --brand-primary-100: #f3d9d9;
  --brand-primary-200: #e7b3b3;
  --brand-primary-300: #db8d8d;
  --brand-primary-400: #cf6767;
  --brand-primary-500: #ea5455; /* VERMELHO PRIMÁRIO */
  --brand-primary-600: #c94545;
  --brand-primary-700: #a93535;
  --brand-primary-800: #892525;
  --brand-primary-900: #691515;

  --brand-secondary-50: #f5f5f5;
  --brand-secondary-100: #eeeeee;
  --brand-secondary-200: #e0e0e0;
  --brand-secondary-300: #bdbdbd;
  --brand-secondary-400: #9e9e9e;
  --brand-secondary-500: #757575;
  --brand-secondary-600: #616161;
  --brand-secondary-700: #333333; /* PRETO SECUNDÁRIO */
  --brand-secondary-800: #212121;
  --brand-secondary-900: #000000;

  --brand-accent-50: #f9f9f9;
  --brand-accent-100: #f0f0f0;
  --brand-accent-200: #e0e0e0;
  --brand-accent-300: #9e9e9e; /* CINZA ACENTUAL */
  --brand-accent-400: #808080;
  --brand-accent-500: #757575;
}
```

### Mapeamento no Tailwind

```javascript
// tailwind.config.js
extend: {
  colors: {
    'brand-primary': {
      50: 'var(--brand-primary-50)',
      100: 'var(--brand-primary-100)',
      200: 'var(--brand-primary-200)',
      300: 'var(--brand-primary-300)',
      400: 'var(--brand-primary-400)',
      500: 'var(--brand-primary-500)',
      600: 'var(--brand-primary-600)',
      700: 'var(--brand-primary-700)',
      800: 'var(--brand-primary-800)',
      900: 'var(--brand-primary-900)',
    },
    'brand-secondary': { /* ... */ },
    'brand-accent': { /* ... */ },
  },
}
```

---

## 🔄 Como Atualizar Cores Globalmente

### Método 1: Atualizar CSS Custom Properties (Recomendado)

Se precisar mudar a cor primária (ex: mais clara/escura):

1. Abra `src/styles.css`
2. Localize a seção `:root { }`
3. Atualize os valores de `--brand-primary-*`:

```css
:root {
  /* Antes */
  --brand-primary-500: #ea5455;

  /* Depois (exemplo) */
  --brand-primary-500: #e74c3c;
}
```

**Vantagem**: Todas as classes `brand-primary-*` em todos os componentes serão atualizadas automaticamente!

### Método 2: Tailwind Config

Se quiser adicionar cores adicionais:

```javascript
// tailwind.config.js
colors: {
  'brand-tertiary': {
    500: '#ff6b6b',
  },
}
```

Então use em componentes:

```html
<button class="bg-brand-tertiary-500">Ação Especial</button>
```

---

## 📝 Convenções para Novos Componentes

### Padrão de Cores por Contexto

#### Texto Primário (Títulos, Labels)

```html
<h1 class="text-brand-primary-700">Título Principal</h1>
<label class="text-brand-primary-700">Label de Input</label>
```

#### Texto Secundário (Descrições, Hints)

```html
<p class="text-brand-secondary-600">Descrição secundária</p>
<span class="text-brand-accent-300">Dica ou suporte</span>
```

#### Botões Primários (CTAs)

```html
<!-- Forte -->
<button class="bg-brand-primary-500 text-white hover:bg-brand-primary-600">
  Ação Principal
</button>

<!-- Com gradiente -->
<button class="bg-gradient-to-r from-brand-primary-500 to-brand-primary-600">
  Ação Premium
</button>
```

#### Botões Secundários

```html
<button
  class="border border-brand-primary-200 text-brand-primary-600 hover:bg-brand-primary-50"
>
  Ação Secundária
</button>
```

#### Inputs e Forms

```html
<!-- Label -->
<label class="text-brand-primary-700">Campo Obrigatório</label>

<!-- Input -->
<input
  class="border border-brand-primary-200 
         focus:ring-2 focus:ring-brand-primary-400 
         focus:border-brand-primary-400
         placeholder-brand-primary-300"
/>

<!-- Input com erro -->
<input class="border border-semantic-error focus:ring-semantic-error" />
```

#### Ícones e Destaques

```html
<!-- Ícone primário -->
<i class="fas fa-star text-brand-primary-500"></i>

<!-- Ícone destaque -->
<i class="fas fa-check text-brand-primary-600"></i>

<!-- Ícone acentual -->
<i class="fas fa-info text-brand-accent-300"></i>
```

#### Gradientes

```html
<!-- Gradiente simples -->
<div class="bg-gradient-to-r from-brand-primary-500 to-brand-primary-600">
  <!-- Gradiente complexo (como landing) -->
  <div
    class="bg-gradient-to-br from-brand-secondary-700 via-brand-secondary-600 to-brand-primary-600"
  >
    <!-- Gradiente suave -->
    <div class="bg-gradient-to-r from-brand-primary-100 to-transparent"></div>
  </div>
</div>
```

#### Shadows e Borders

```html
<!-- Shadow com cor brand -->
<div class="shadow-lg hover:shadow-xl hover:shadow-brand-primary-500/20">
  <!-- Border destaque -->
  <div class="border-2 border-brand-primary-500"></div>
</div>
```

---

## 🔍 Checklist para Novo Componente

Ao criar um novo componente, verifique:

- [ ] Texto principal usa `text-brand-primary-700`
- [ ] Labels usam `text-brand-primary-700`
- [ ] Botões primários usam `bg-brand-primary-500`
- [ ] Inputs focados usam `focus:ring-brand-primary-400`
- [ ] Ícones importantes usam `text-brand-primary-*`
- [ ] Não há cores `indigo-*`, `blue-*`, `slate-*` remanescentes
- [ ] Hover states estão definidos com cores brand
- [ ] Gradientes usam apenas cores brand
- [ ] Responsividade mantida (classes `sm:`, `md:`, `lg:`)
- [ ] Acessibilidade preservada (contrast ratio > 4.5:1)

---

## 🚀 Expandindo para Novos Componentes

### Exemplo: Novo Modal Component

```typescript
// new-modal.component.ts
@Component({
  selector: "app-new-modal",
  standalone: true,
  template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div
        class="bg-white rounded-lg shadow-2xl p-6 max-w-md border-2 border-brand-primary-100"
      >
        <!-- Header -->
        <h2 class="text-2xl font-bold text-brand-primary-700">{{ title }}</h2>

        <!-- Content -->
        <p class="mt-4 text-brand-secondary-600">{{ description }}</p>

        <!-- Actions -->
        <div class="flex gap-3 mt-6">
          <button
            (click)="onCancel()"
            class="flex-1 px-4 py-2 border border-brand-primary-200 text-brand-primary-600 rounded-lg hover:bg-brand-primary-50"
          >
            Cancelar
          </button>
          <button
            (click)="onConfirm()"
            class="flex-1 px-4 py-2 bg-brand-primary-500 text-white rounded-lg hover:bg-brand-primary-600"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  `,
})
export class NewModalComponent {
  title = input.required<string>();
  description = input.required<string>();

  onCancel = output<void>();
  onConfirm = output<void>();
}
```

---

## 🎨 Variações de Cor por Tipo

### Estados de Sucesso ✅

```html
<div class="bg-semantic-success text-white">Operação bem-sucedida!</div>
<!-- Usa --semantic-success (verde) -->
```

### Estados de Erro ❌

```html
<div class="bg-semantic-error text-white">Erro na operação!</div>
<!-- Usa --semantic-error (vermelho de erro) -->
```

### Estados de Aviso ⚠️

```html
<div class="bg-semantic-warning text-white">Aviso importante!</div>
<!-- Usa --semantic-warning (amarelo) -->
```

### Estados de Informação ℹ️

```html
<div class="bg-semantic-info text-white">Informação útil</div>
<!-- Usa --semantic-info (azul de info) -->
```

---

## 📱 Responsividade com Cores Brand

### Exemplo: Card Responsivo

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div
    class="p-4 border border-brand-primary-200 rounded-lg hover:shadow-lg hover:shadow-brand-primary-500/20"
  >
    <!-- Conteúdo -->
  </div>
</div>
```

### Exemplo: Menu Responsivo

```html
<nav class="bg-gradient-to-r from-brand-secondary-700 to-brand-secondary-800">
  <ul class="flex flex-col md:flex-row gap-2">
    <li>
      <a
        href="#"
        class="text-white hover:text-brand-primary-300 transition-colors"
      >
        Link
      </a>
    </li>
  </ul>
</nav>
```

---

## 🔄 Migrando Componentes Antigos

Se encontrar componentes ainda usando cores antigas:

### Encontrar Cores Antigas

```bash
# Buscar por padrões de cor antigos
grep -r "indigo-" src/components/
grep -r "blue-" src/components/
grep -r "slate-" src/components/
```

### Substituir Automaticamente (Script)

```bash
# Substitui indigo por brand-primary
find src/ -name "*.html" -type f -exec sed -i 's/indigo-/brand-primary-/g' {} +

# Substitui blue por brand-primary ou brand-accent
find src/ -name "*.html" -type f -exec sed -i 's/blue-/brand-primary-/g' {} +

# Substitui slate por brand-secondary
find src/ -name "*.html" -type f -exec sed -i 's/slate-/brand-secondary-/g' {} +
```

### Substitui Manualmente (VS Code)

1. Abra Find and Replace (Ctrl+H)
2. Ative "Use Regular Expression" (Alt+R)
3. Padrão: `(indigo|blue|slate)-(\d+)`
4. Substituir: Depende do contexto

---

## 📊 Documentação de Componentes

Ao documentar componentes, use cores brand:

### Template de Documentação

```markdown
## ComponentName

### Uso Básico

\`\`\`html
<app-component-name [title]="'Título'"></app-component-name>
\`\`\`

### Variações

#### Primária

<button class="bg-brand-primary-500">Ação Principal</button>

#### Secundária

<button class="bg-brand-secondary-700">Ação Secundária</button>

#### Destaque

<button class="bg-brand-primary-600">Ação em Destaque</button>
```

---

## 🧪 Testes de Cores

### Acessibilidade WCAG

Verifique contraste usando:

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Polypane Accessibility Inspector](https://polypane.app/)

```
Verificações recomendadas:
- brand-primary-700 texto em brand-primary-100 fundo ✅
- brand-secondary-700 texto em white fundo ✅
- brand-primary-500 texto em white fundo ✅
```

### Teste Cross-Browser

```bash
# Chrome, Firefox, Safari, Edge
npm run build
npm run serve
# Abrir em diferentes navegadores
```

### Teste Responsivo

```bash
# Verificar em diferentes tamanhos de tela
# Desktop: 1920x1080
# Tablet: 768x1024
# Mobile: 375x667
```

---

## 📚 Referências Rápidas

### Cores Brand por Uso Comum

| Uso            | Classe Tailwind                | Hex     |
| -------------- | ------------------------------ | ------- |
| Título         | `text-brand-primary-700`       | #a93535 |
| Label          | `text-brand-primary-700`       | #a93535 |
| Botão CTA      | `bg-brand-primary-500`         | #ea5455 |
| Botão Hover    | `hover:bg-brand-primary-600`   | #c94545 |
| Input Border   | `border-brand-primary-200`     | #e7b3b3 |
| Input Focus    | `focus:ring-brand-primary-400` | #cf6767 |
| Ícone Primário | `text-brand-primary-500`       | #ea5455 |
| Ícone Acentual | `text-brand-accent-300`        | #9e9e9e |
| Fundo Escuro   | `bg-brand-secondary-700`       | #333333 |
| Fundo Claro    | `bg-brand-primary-50`          | #f9ecec |

### Atalhos de Desenvolvimento

```javascript
// Rapid color selection em VS Code
// Instale: Color Highlight
// As cores brand aparecerão coloridas no editor
```

---

## 🆘 Troubleshooting

### Cor não está sendo aplicada?

1. Verificar se classe está correta: `class="bg-brand-primary-500"`
2. Verificar se Tailwind é compilado: `npm run build`
3. Verificar se custom property existe em `styles.css`
4. Limpar cache: `rm -rf dist/ && npm run build`

### Gradiente não funciona?

```html
<!-- ❌ Errado -->
<div class="bg-brand-primary-100 to-brand-primary-200">
  <!-- ✅ Correto -->
  <div
    class="bg-gradient-to-r from-brand-primary-100 to-brand-primary-200"
  ></div>
</div>
```

### Transições não suaves?

```html
<!-- Adicionar transition -->
<button
  class="bg-brand-primary-500 hover:bg-brand-primary-600 transition-colors duration-200"
></button>
```

---

## 📋 Checklist de Implementação

Para qualquer novo componente:

- [ ] Importa as cores brand do Tailwind
- [ ] Texto primário é `brand-primary-700`
- [ ] Botões são `brand-primary-500`
- [ ] Inputs focados são `brand-primary-400`
- [ ] Sem cores hardcoded `#ea5455`
- [ ] Usa custom properties via Tailwind
- [ ] Testado em mobile/tablet/desktop
- [ ] Contraste WCAG validado
- [ ] Documentação criada
- [ ] Code review aprovado

---

## 📞 Suporte e Questões

Para dúvidas sobre a implementação:

1. Consulte este guia
2. Verifique exemplos em componentes existentes
3. Teste em navegador com dev tools
4. Valide contraste de cores
5. Consulte equipe de design

---

**Última Atualização**: 2024
**Versão**: 1.0
**Status**: ✅ Completo e Pronto para Uso

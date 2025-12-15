# Sistema de Design - Natan Construtora

## 🎨 Paleta de Cores da Marca

### Cores Primárias

#### Azul Primário - Confiança e Profissionalismo

```css
brand-primary-500: #1e40af; /* Cor principal */
```

- Representa solidez, confiança e profissionalismo
- Usada em botões principais, links e elementos de destaque
- Variações de 50 a 950 para diferentes contextos

#### Laranja Secundário - Energia e Construção

```css
brand-secondary-500: #f97316; /* Cor principal */
```

- Representa energia, ação e o setor de construção
- Usada em CTAs secundários e elementos de alerta positivo
- Associada à inovação e dinamismo

#### Amarelo/Dourado Accent - Excelência e Inovação

```css
brand-accent-500: #eab308; /* Cor principal */
```

- Representa excelência, qualidade premium
- Usada para destacar conquistas e diferenciais
- Elementos de destaque especial

### Cores Semânticas

```css
semantic-success: #059669  /* Ações bem-sucedidas */
semantic-warning: #f59e0b  /* Avisos e atenção */
semantic-error: #dc2626    /* Erros e ações críticas */
semantic-info: #3b82f6     /* Informações neutras */
```

## 🧩 Componentes do Design System

### Botões

#### Botão Primário

```html
<button class="btn-brand">Ação Principal</button>
```

- Fundo: azul primário
- Texto: branco
- Shadow: brand
- Hover: elevação e darkening

#### Botão Secundário

```html
<button class="btn-brand-secondary">Ação Secundária</button>
```

- Fundo: laranja secundário
- Texto: branco
- Shadow: brand
- Hover: elevação e darkening

#### Botão Outline

```html
<button class="btn-brand-outline">Ação Terciária</button>
```

- Borda: azul primário
- Texto: azul primário
- Fundo transparente
- Hover: fundo azul claro

#### Botão Ghost

```html
<button class="btn-brand-ghost">Ação Leve</button>
```

- Sem borda
- Texto: azul primário
- Hover: fundo azul claro

### Cards

#### Card Padrão

```html
<div class="card-brand p-6">Conteúdo do card</div>
```

- Fundo: branco
- Shadow: card (leve)
- Borda: neutral-200
- Hover: elevação shadow

#### Card Elevado

```html
<div class="card-brand-elevated p-6">Conteúdo destacado</div>
```

- Shadow: brand-lg (elevado)
- Usado para elementos importantes

### Inputs

#### Input Padrão

```html
<input type="text" class="input-brand" placeholder="Digite aqui..." />
```

- Borda: 2px neutral-300
- Focus: borda primary + ring primary
- Transição suave
- Border radius: brand (0.75rem)

#### Input com Erro

```html
<input type="text" class="input-brand input-brand-error" />
```

- Borda: error
- Focus: ring error

### Badges

```html
<!-- Badge Primário -->
<span class="badge-brand">Novo</span>

<!-- Badge Sucesso -->
<span class="badge-success">Aprovado</span>

<!-- Badge Aviso -->
<span class="badge-warning">Pendente</span>

<!-- Badge Erro -->
<span class="badge-error">Rejeitado</span>
```

### Gradientes

```html
<!-- Gradiente Primário -->
<div class="gradient-brand p-6 text-white">Conteúdo com gradiente</div>

<!-- Gradiente Secundário/Accent -->
<div class="gradient-brand-secondary p-6 text-white">
  Conteúdo com gradiente colorido
</div>
```

## 🎭 Skeleton Loaders

Para estados de carregamento:

```html
<!-- Texto -->
<div class="skeleton-text"></div>

<!-- Avatar -->
<div class="skeleton-avatar"></div>

<!-- Card customizado -->
<div class="skeleton h-32 w-full"></div>
```

## 📐 Sistema de Espaçamento

Baseado em escala de 4px:

```
spacing-unit: 0.25rem (4px)
```

Use multiplicadores:

- `p-2` = 0.5rem = 8px
- `p-4` = 1rem = 16px
- `p-6` = 1.5rem = 24px
- `p-8` = 2rem = 32px

## 🎬 Animações

### Animações Disponíveis

```html
<!-- Fade In -->
<div class="animate-fade-in">Conteúdo</div>

<!-- Slide Up -->
<div class="animate-slide-up">Conteúdo</div>

<!-- Slide Down -->
<div class="animate-slide-down">Conteúdo</div>

<!-- Scale In -->
<div class="animate-scale-in">Conteúdo</div>
```

### Transições

```css
transition-fast: 150ms
transition-base: 250ms
transition-slow: 350ms
```

## 🌗 Suporte a Dark Mode

O sistema está preparado para dark mode:

```html
<html class="dark">
  <!-- Modo escuro ativado -->
</html>
```

Cores ajustadas automaticamente via CSS variables.

## 📦 Border Radius

```css
rounded-brand: 0.75rem; /* 12px - padrão da marca */
```

Usado em botões, cards, inputs para consistência visual.

## 🎯 Shadows

```css
shadow-brand: 0 4px 14px rgba(30, 64, 175, 0.15)
shadow-brand-lg: 0 10px 40px rgba(30, 64, 175, 0.20)
shadow-card: 0 2px 8px rgba(0, 0, 0, 0.08)
shadow-card-hover: 0 4px 16px rgba(0, 0, 0, 0.12)
```

## 💡 Exemplos de Uso

### Formulário Completo

```html
<form class="card-brand p-6 space-y-4">
  <h2 class="text-2xl font-bold text-brand-primary-700">Novo Pedido</h2>

  <div>
    <label class="block text-sm font-medium text-neutral-700 mb-2">
      Nome
    </label>
    <input type="text" class="input-brand" placeholder="Digite seu nome" />
  </div>

  <div class="flex gap-3">
    <button type="button" class="btn-brand-ghost flex-1">Cancelar</button>
    <button type="submit" class="btn-brand flex-1">Salvar</button>
  </div>
</form>
```

### Dashboard Card

```html
<div class="card-brand-elevated p-6 animate-fade-in">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-brand-primary-700">Estatísticas</h3>
    <span class="badge-success">+12%</span>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <p class="text-sm text-neutral-600">Total</p>
      <p class="text-2xl font-bold text-brand-primary-600">142</p>
    </div>
    <div>
      <p class="text-sm text-neutral-600">Ativos</p>
      <p class="text-2xl font-bold text-brand-secondary-600">98</p>
    </div>
  </div>
</div>
```

## 🚀 Implementação

As classes estão disponíveis globalmente através do Tailwind CSS configurado em `tailwind.config.cjs` e `styles.css`.

Para usar, simplesmente adicione as classes aos seus componentes Angular.

## 📱 Responsividade

Todas as classes suportam prefixos responsivos:

```html
<button class="btn-brand w-full md:w-auto">Responsivo</button>
```

Breakpoints:

- `sm:` 640px
- `md:` 768px
- `lg:` 1024px
- `xl:` 1280px
- `2xl:` 1536px

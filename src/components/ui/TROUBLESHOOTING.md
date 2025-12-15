# 🔧 Troubleshooting Rápido

## ❌ Problemas Comuns e Soluções

### 1. "Module not found: Can't resolve '@/components/ui'"

**Causa**: Path alias não configurado ou projeto não recompilou.

**Solução**:

```bash
# Opção 1: Verifique tsconfig.json
# Procure por:
"paths": {
  "@/*": ["src/*"]
}

# Opção 2: Reinicie o servidor
Ctrl+C
npm start

# Opção 3: Se ainda não funcionar, use import direto
import { ButtonComponent } from './components/ui/button.component';
```

---

### 2. Componentes não aparecem no navegador

**Causa**: Rotas não adicionadas ou componentes não importados.

**Solução**:

```typescript
// Verificar 1: Adicione rotas em src/app/app.routes.ts
import { UiComponentsShowcaseComponent } from '@/components/ui';

export const routes: Routes = [
  {
    path: 'ui-components',
    component: UiComponentsShowcaseComponent
  }
];

// Verificar 2: Importe na sua component
import { ButtonComponent } from '@/components/ui';

@Component({
  imports: [ButtonComponent]
})
```

---

### 3. Estilos Tailwind não aplicam

**Causa**: Tailwind não compilou ou classes não reconhecidas.

**Solução**:

```bash
# Recompile Tailwind
npm run build

# Limpe cache navegador
Ctrl + Shift + Del

# Se persistir, verifique tailwind.config.cjs
module.exports = {
  content: [
    'src/**/*.{html,ts}' // Deve incluir src/
  ],
  theme: {
    extend: {
      colors: {
        'natan-primary': '#ea5455'
        // ... resto das cores
      }
    }
  }
}
```

---

### 4. "ERROR in browser console: Cannot read property 'set' of undefined"

**Causa**: Signal não inicializado ou using signals sem importar.

**Solução**:

```typescript
import { signal, computed } from "@angular/core";

export class MyComponent {
  // ✅ Correto
  mySignal = signal("inicial");

  constructor() {
    // ✅ Ou assim
    this.mySignal.set("novo valor");
  }

  // ❌ Errado
  // myValue = 'não é signal';
  // this.myValue.set('erro');
}
```

---

### 5. TypeScript erros: "Type '...' is not assignable to type '...'"

**Causa**: Tipo errado sendo passado ao componente.

**Solução**:

```typescript
// ❌ Errado
<app-button [loading]="'true'"></app-button>  <!-- string, não boolean -->

// ✅ Correto
<app-button [loading]="isLoading()"></app-button>  <!-- boolean signal -->
```

---

### 6. Input não responde a mudanças de valor

**Causa**: Usando `ngModel` em vez de `(valueChange)`.

**Solução**:

```html
<!-- ❌ Errado -->
<app-input [(ngModel)]="email"></app-input>

<!-- ✅ Correto com Signals -->
<app-input [value]="email()" (valueChange)="email.set($event)"> </app-input>

<!-- ✅ Ou com computed -->
<app-input (valueChange)="updateEmail($event)"> </app-input>
```

```typescript
updateEmail(value: string) {
  this.email.set(value);
}
```

---

### 7. Button não dispara evento de clique

**Causa**: Usando `(click)` em vez de `(onClick)`.

**Solução**:

```html
<!-- ❌ Errado -->
<app-button (click)="submit()"></app-button>

<!-- ✅ Correto -->
<app-button (onClick)="submit()"></app-button>
```

---

### 8. Componente SkeletonGroup não aparece

**Causa**: Não importando CommonModule ou tipando errado.

**Solução**:

```typescript
import { CommonModule } from "@angular/common";
import { SkeletonComponent, SkeletonGroupComponent } from "@/components/ui";

@Component({
  imports: [CommonModule, SkeletonComponent, SkeletonGroupComponent],
})
export class MyComponent {}
```

```html
<!-- Verificar type válido -->
<app-skeleton-group type="card">
  <!-- 'card', 'card-with-avatar', 'text-block', 'table' -->
</app-skeleton-group>
```

---

### 9. Dark mode não funciona

**Causa**: Classe `dark` não aplicada ou CSS variables não definidas.

**Solução**:

```typescript
// Em app.component.ts
import { DOCUMENT } from "@angular/common";

export class AppComponent {
  constructor(private document: DOCUMENT) {}

  toggleDarkMode() {
    const root = this.document.documentElement;
    root.classList.toggle("dark");
  }
}
```

```html
<!-- Em index.html -->
<!DOCTYPE html>
<html [class.dark]="isDarkMode()">
  <!-- ou toggle via toggle() -->
  <body>
    ...
  </body>
</html>
```

```css
/* Em styles.css */
:root {
  --natan-primary: #ea5455;
  --natan-text: #333333;
}

:root.dark {
  --natan-primary: #ff6b6b; /* Versão clara para dark mode */
  --natan-text: #ffffff;
}
```

---

### 10. Build falha com erros TypeScript

**Causa**: Tipos incompatíveis ou missing dependencies.

**Solução**:

```bash
# 1. Instale dependências
npm install

# 2. Reinstale types
npm install --save-dev @types/node

# 3. Limpe cache e rebuild
rm -rf node_modules
npm install
npm start

# 4. Verifique tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "esModuleInterop": true
  }
}
```

---

### 11. Performance lenta - muitas re-renders

**Causa**: Change detection não otimizado ou signals não usados.

**Solução**:

```typescript
// ❌ Errado - ChangeDetectionStrategy default
@Component({
  selector: 'app-my',
  template: `{{ data }}`
})

// ✅ Correto - Use OnPush
import { ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-my',
  template: `{{ data() }}`,  // Use signals
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyComponent {
  data = signal({/* ... */});
}
```

---

### 12. CSS variables não funcionam em componentes

**Causa**: Scoped styles ou específico scope CSS.

**Solução**:

```typescript
// ✅ Usar view encapsulation global
@Component({
  styles: [`
    :host {
      --natan-primary: #ea5455;  /* Herda do global */
    }
  `],
  encapsulation: ViewEncapsulation.None  // Opcional
})
```

---

### 13. Ícones Font Awesome não aparecem

**Causa**: Não importando CommonModule com font awesome.

**Solução**:

```typescript
import { CommonModule } from '@angular/common';

@Component({
  imports: [CommonModule],
  template: `<i class="fas fa-envelope"></i>`
})
```

```html
<!-- Verifique que tem Font Awesome CDN em index.html -->
<link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
/>
```

---

### 14. Input ícones não aparecem ou fora de posição

**Causa**: Classes Tailwind conflitantes ou padding errado.

**Solução**:

```html
<!-- ✅ Correto -->
<app-input iconLeft="envelope" iconRight="check" label="Email" class="my-4">
</app-input>

<!-- ❌ Evite sobrescrever classes internas -->
<!-- <app-input class="p-10"></app-input> -->
```

---

### 15. Alert com autoClose não fecha

**Causa**: Timeout não atingido ou [autoClose] como string.

**Solução**:

```html
<!-- ❌ Errado -->
<app-alert type="success" autoClose="3000">
  <!-- string, não number -->
</app-alert>

<!-- ✅ Correto -->
<app-alert type="success" [autoClose]="3000">
  <!-- binding com colchetes -->
</app-alert>
```

---

### 16. Spinner não gira ou animação não funciona

**Causa**: Keyframe animation conflitante ou CSS não carregou.

**Solução**:

```css
/* Adicione ao styles.css se faltar */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
```

---

### 17. Componentes cortados em mobile (overflow)

**Causa**: Sem max-width ou padding mobile.

**Solução**:

```html
<!-- ✅ Use container responsivo -->
<div class="p-4 md:p-6 lg:p-8">
  <app-button>Botão responsivo</app-button>
</div>

<!-- ✅ Ou classe mobile-safe -->
<div class="mobile-safe">
  <app-input label="Nome"></app-input>
</div>
```

```css
/* Em styles.css */
.mobile-safe {
  max-width: 100%;
  overflow-x: hidden;
  padding: 1rem;
}

@media (min-width: 768px) {
  .mobile-safe {
    padding: 2rem;
  }
}
```

---

### 18. Erro ao usar componente em \*ngIf

**Causa**: Control flow (if/else) syntax incorreta em Angular 18.

**Solução**:

```html
<!-- ❌ Errado - sintaxe antiga -->
<app-button *ngIf="isVisible"></app-button>

<!-- ✅ Correto - novo control flow -->
@if (isVisible()) {
<app-button></app-button>
}

<!-- ✅ Com else -->
@if (isLoading()) {
<app-loading></app-loading>
} @else {
<div>Conteúdo</div>
}

<!-- ✅ Com switch -->
@switch (status()) { @case ('idle') {
<app-button>Enviar</app-button>
} @case ('loading') {
<app-loading></app-loading>
} @default {
<p>Desconhecido</p>
} }
```

---

### 19. Botão desabilitado ainda clicável

**Causa**: Evento `onClick` dispara mesmo com `disabled`.

**Solução**:

```typescript
// ✅ Correto - verificar dentro da função
submit() {
  if (this.isSubmitting()) return;  // Guard clause
  this.isSubmitting.set(true);
}

// ✅ Ou no template
<app-button
  [disabled]="isSubmitting()"
  (onClick)="submit()">
  Enviar
</app-button>
```

---

### 20. Espaçamento inconsistente entre componentes

**Causa**: Diferentes paddings em cada componente.

**Solução**:

```html
<!-- ✅ Use classes wrapper consistentes -->
<div class="space-y-4">
  <!-- Spacing vertical -->
  <app-input label="Campo 1"></app-input>
  <app-input label="Campo 2"></app-input>
  <app-button>Enviar</app-button>
</div>

<!-- ✅ Ou grid para layouts -->
<div class="grid gap-4 md:grid-cols-2">
  <app-input></app-input>
  <app-input></app-input>
</div>
```

---

## 🎓 Checklist de Debug

Quando algo não funciona, siga esta ordem:

1. **Console do Navegador** (F12)

   - Tem erros vermelhos?
   - Tem warnings amarelos?

2. **Verificar Componente**

   - Está importado?
   - Está em `imports: [...]`?

3. **Verificar Template**

   - Syntax está correta?
   - Inputs com `[...]`?
   - Outputs com `(...)`?

4. **Verificar TypeScript**

   - Tipos estão certos?
   - Signals inicializados?

5. **Verificar CSS**

   - Classes Tailwind reconhecidas?
   - Build executado?
   - Cache limpo?

6. **Reiniciar**

   ```bash
   Ctrl+C
   npm start
   ```

7. **Se persistir**
   - Limpe `node_modules`: `rm -rf node_modules && npm install`
   - Verifique versão Angular: `npm ls @angular/core`
   - Checke documentação: [UI_COMPONENTS_GUIDE.md](./UI_COMPONENTS_GUIDE.md)

---

## 📞 Recursos Adicionais

- **Documentação Oficial Angular**: https://angular.io/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Supabase Docs**: https://supabase.com/docs

---

## 💾 Comandos Úteis

```bash
# Desenvolvimento
npm start                    # Inicia servidor dev

# Build
npm run build               # Build production
npm run build -- --watch    # Build em watch mode

# Testes
npm test                    # Roda testes
npm run lint                # Verifica lint

# Limpeza
rm -rf node_modules        # Remove node_modules
npm install                # Reinstala dependências

# Debug
ng serve --poll 2000       # Serve com polling (WSL/Docker)
ng serve --open            # Abre navegador automaticamente
```

---

**Última atualização**: 2024  
**Para suporte completo**: Veja [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)

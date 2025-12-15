# Implementação do Campo de Vínculo com Natan Construtora

## 📋 Visão Geral

Foi implementado um novo campo na plataforma HomeService para identificar se um profissional é funcionário da Natan Construtora ou um prestador de serviços independente.

## 🔄 Alterações Realizadas

### 1. **Base de Dados (SQL)**

**Arquivo:** `scripts/add_natan_affiliation_field.sql`

- Adicionado campo `is_natan_employee` (BOOLEAN) na tabela `users`
- Valor padrão: `false` (prestador independente)
- Criado índice para otimizar consultas por vínculo
- Adicionado comentário explicativo na coluna

**Para aplicar as alterações:**

```sql
-- Execute este script no SQL Editor do Supabase Dashboard
-- Localização: scripts/add_natan_affiliation_field.sql
```

### 2. **Modelo de Dados TypeScript**

**Arquivo:** [src/models/maintenance.models.ts](src/models/maintenance.models.ts)

```typescript
export interface User {
  // ... campos existentes ...
  is_natan_employee?: boolean; // Indica se é funcionário da Natan Construtora
}
```

### 3. **Sistema de Internacionalização (i18n)**

**Arquivo:** [src/i18n.service.ts](src/i18n.service.ts)

**Traduções adicionadas:**

**Inglês:**

- `isNatanEmployee`: "Natan Construtora Employee"
- `natanEmployeeYes`: "Yes, employee of Natan Construtora"
- `natanEmployeeNo`: "No, independent service provider"
- `natanAffiliation`: "Natan Construtora Affiliation"

**Português:**

- `isNatanEmployee`: "Funcionário da Natan Construtora"
- `natanEmployeeYes`: "Sim, funcionário da Natan Construtora"
- `natanEmployeeNo`: "Não, prestador de serviços independente"
- `natanAffiliation`: "Vínculo com Natan Construtora"

### 4. **Componente de Perfil**

**Arquivos modificados:**

- [src/components/profile/profile.component.ts](src/components/profile/profile.component.ts)
- [src/components/profile/profile.component.html](src/components/profile/profile.component.html)

**Funcionalidades adicionadas:**

- Signal `isNatanEmployee` para controlar o estado do campo
- Inicialização do campo com base no usuário atual
- Detecção de mudanças e salvamento do campo
- UI para edição (checkbox com descrição) - **visível apenas para profissionais**

**Card adicionado ao perfil:**

```html
<!-- Vínculo com Natan Construtora (apenas para profissionais) -->
<div
  class="rounded-xl border border-indigo-100 bg-white/80 shadow-sm p-4 md:p-6 mb-4"
>
  <h3 class="text-lg font-bold text-indigo-700 mb-2">
    {{ "natanAffiliation" | i18n }}
  </h3>
  <div class="flex flex-col gap-3">
    <label class="flex items-center gap-3 cursor-pointer">
      <input type="checkbox" [(ngModel)]="isNatanEmployee" />
      <span>{{ "natanEmployeeYes" | i18n }}</span>
    </label>
    <p class="text-xs text-gray-500">
      {{ isNatanEmployee ? ("natanEmployeeYes" | i18n) : ("natanEmployeeNo" |
      i18n) }}
    </p>
  </div>
</div>
```

### 5. **Gestão de Utilizadores (Admin)**

**Arquivos modificados:**

- [src/components/admin-dashboard/users-management/users-management.component.ts](src/components/admin-dashboard/users-management/users-management.component.ts)
- [src/components/admin-dashboard/users-management/users-management.component.html](src/components/admin-dashboard/users-management/users-management.component.html)

**Funcionalidades adicionadas:**

#### Formulário de Criação de Profissional

- Signal `newClientIsNatanEmployee` para novo profissional
- Campo checkbox visível apenas quando o role selecionado é "professional"
- Valor enviado para o backend no registro

#### Formulário de Edição de Profissional

- Signal `editingClientIsNatanEmployee` para edição
- Campo checkbox visível apenas quando o role é "professional"
- Valor atualizado ao salvar edições
- Reset correto ao cancelar edição

**UI adicionada aos modais:**

```html
<!-- Visível apenas se o role for 'professional' -->
@if(newClientRole() === 'professional') {
<div>
  <label class="flex items-center gap-3 cursor-pointer">
    <input
      type="checkbox"
      [checked]="newClientIsNatanEmployee()"
      (change)="newClientIsNatanEmployee.set($any($event.target).checked)"
      class="form-checkbox h-5 w-5 text-green-600"
    />
    <span>{{ "natanEmployeeYes" | i18n }}</span>
  </label>
  <p class="text-xs text-gray-500">
    {{ newClientIsNatanEmployee() ? ("natanEmployeeYes" | i18n) :
    ("natanEmployeeNo" | i18n) }}
  </p>
</div>
}
```

## 🎯 Como Usar

### Para Profissionais:

1. Acesse seu **Perfil**
2. Na seção **"Vínculo com Natan Construtora"**, marque a checkbox se você é funcionário da Natan Construtora
3. Clique em **Salvar Alterações**

### Para Administradores:

#### Ao Criar um Novo Profissional:

1. Vá para **Gestão de Utilizadores**
2. Clique em **Adicionar Cliente**
3. Preencha os dados do profissional
4. Selecione "Profissional" no campo **Tipo de Perfil**
5. Marque a checkbox **"Sim, funcionário da Natan Construtora"** se aplicável
6. Clique em **Adicionar**

#### Ao Editar um Profissional Existente:

1. Vá para **Gestão de Utilizadores**
2. Clique no botão de **Editar** (ícone de lápis) do profissional
3. Ajuste o campo **"Sim, funcionário da Natan Construtora"** conforme necessário
4. Clique em **Salvar**

## 🔍 Consultas na Base de Dados

### Ver todos os profissionais com vínculo:

```sql
SELECT id, name, email, is_natan_employee
FROM users
WHERE role = 'professional' AND is_natan_employee = true;
```

### Ver todos os prestadores independentes:

```sql
SELECT id, name, email, is_natan_employee
FROM users
WHERE role = 'professional' AND (is_natan_employee = false OR is_natan_employee IS NULL);
```

### Estatísticas:

```sql
SELECT
    COUNT(*) as total_profissionais,
    COUNT(*) FILTER (WHERE is_natan_employee = true) as funcionarios_natan,
    COUNT(*) FILTER (WHERE is_natan_employee = false OR is_natan_employee IS NULL) as prestadores_independentes
FROM users
WHERE role = 'professional';
```

## 📝 Notas Técnicas

### Padrões Seguidos:

- ✅ Arquitetura baseada em **Angular Signals**
- ✅ **ChangeDetection OnPush** para performance
- ✅ **Type safety** com TypeScript
- ✅ **i18n** completo (Português e Inglês)
- ✅ Design **responsive mobile-first** com TailwindCSS
- ✅ **Acessibilidade** com aria-labels apropriados

### Considerações de Performance:

- Índice criado na coluna `is_natan_employee` filtrado por `role = 'professional'`
- Computed signals utilizados para reatividade eficiente
- Queries otimizadas com filtros apropriados

## 🚀 Próximos Passos Sugeridos

1. **Filtros Avançados**: Adicionar filtro por vínculo no painel de gestão de utilizadores
2. **Relatórios**: Incluir estatísticas de profissionais por vínculo nos relatórios financeiros
3. **Dashboard**: Adicionar indicador visual no dashboard para identificar rapidamente o tipo de profissional
4. **Notificações**: Considerar fluxos de notificação diferentes para funcionários vs. prestadores independentes

## ✅ Checklist de Implementação

- [x] Script SQL criado e documentado
- [x] Modelo TypeScript atualizado
- [x] Traduções adicionadas (PT/EN)
- [x] Componente de perfil atualizado
- [x] Gestão de utilizadores atualizada
- [x] Formulário de criação de profissional atualizado
- [x] Formulário de edição de profissional atualizado
- [x] UI responsiva e acessível implementada
- [x] Documentação completa criada

## 📞 Suporte

Para dúvidas ou problemas relacionados a esta funcionalidade, consulte este documento ou entre em contato com a equipe de desenvolvimento.

---

**Data de Implementação:** 14 de Dezembro de 2025  
**Versão da Plataforma:** Angular 18 + Supabase

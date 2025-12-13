# Implementação: Logradouro Manual para Códigos Postais sem Designação

## Resumo

Implementada funcionalidade que permite ao usuário informar manualmente o logradouro quando o código postal consultado não possui `designacao_postal` (logradouro) associado.

## Mudanças Implementadas

### 1. Banco de Dados

**Arquivo:** `scripts/add_street_manual_to_service_requests.sql`

- Adicionada coluna `street_manual` (TEXT, nullable) à tabela `service_requests`
- Campo armazena o logradouro informado manualmente pelo usuário

**Como executar:**

```bash
# Execute o script SQL no Supabase ou PostgreSQL
psql -d sua_database < scripts/add_street_manual_to_service_requests.sql
```

### 2. Componente de Formulário

**Arquivo:** `src/components/service-request-form/service-request-form.component.ts`

**Novos Signals:**

- `street_manual`: Armazena o logradouro informado manualmente
- `hasStreetFromPostalCode`: Indica se o código postal possui logradouro

**Lógica de Validação:**

- Quando há logradouro do código postal: campo é readonly
- Quando NÃO há logradouro: campo se torna editável e obrigatório
- Validação dinâmica: `hasStreetFromPostalCode() || validFields().street_manual`

**Fluxo:**

1. Usuário digita código postal
2. Sistema busca dados do código postal
3. Se `designacao_postal` estiver vazio:
   - `hasStreetFromPostalCode` = false
   - Campo `street_manual` se torna editável
   - Mensagem informativa é exibida
4. Usuário preenche o logradouro manualmente
5. Campo é validado (mínimo 5 caracteres)

### 3. Template HTML

**Arquivo:** `src/components/service-request-form/service-request-form.component.html`

Implementado com diretiva `@if`:

```html
@if (hasStreetFromPostalCode()) {
<!-- Campo readonly com valor do código postal -->
} @else {
<!-- Campo editável para entrada manual -->
<!-- Mensagem informativa -->
}
```

### 4. Service Layer

**Arquivo:** `src/services/data.service.ts`

Adicionado campo `street_manual` ao payload do insert:

```typescript
street_manual: payload.street_manual,
```

### 5. Interface TypeScript

**Arquivo:** `src/models/maintenance.models.ts`

Atualizada interface `ServiceRequestPayload`:

```typescript
street_manual?: string | null; // Logradouro informado manualmente
```

### 6. Traduções

**Arquivo:** `src/i18n.service.ts`

Adicionadas traduções:

- **Inglês:** "This postal code does not have an associated street. Please enter it manually."
- **Português:** "Este código postal não possui logradouro associado. Por favor, informe-o manualmente."

## Validação de Formulário

O formulário só será válido quando:

- Código postal possui logradouro automático, OU
- Usuário preencheu `street_manual` com mínimo 5 caracteres

## UX/UI

### Visual Feedback

- ✅ Ícone verde quando campo válido
- ❌ Ícone vermelho quando campo inválido
- ℹ️ Mensagem informativa em amarelo quando campo manual ativo

### Acessibilidade

- Labels apropriados
- ARIA labels configurados
- Focus states visíveis

## Casos de Uso

### Caso 1: Código Postal COM Logradouro

```
Código Postal: 1000-001
Resultado: "Praça dos Restauradores" (readonly)
```

### Caso 2: Código Postal SEM Logradouro

```
Código Postal: 9999-999
Resultado: Campo editável para entrada manual
Usuário digita: "Rua da Paz"
Sistema salva em: service_requests.street_manual
```

## Migração de Dados Existentes

Registros existentes:

- Campo `street_manual` será NULL
- Logradouro continua em `street` (da designacao_postal)
- Não há impacto em dados existentes

## Testes Recomendados

1. **Teste com código postal válido com logradouro:**

   - Verificar que campo é readonly
   - Verificar que valor é preenchido automaticamente

2. **Teste com código postal sem logradouro:**

   - Verificar que campo se torna editável
   - Verificar mensagem informativa
   - Testar validação (mínimo 5 caracteres)
   - Verificar salvamento no banco

3. **Teste de validação:**
   - Tentar submeter formulário sem preencher logradouro manual
   - Verificar mensagem de erro

## Próximos Passos

1. Executar script SQL no banco de dados de produção
2. Testar em ambiente de desenvolvimento
3. Verificar integração com outros componentes que exibem endereços
4. Considerar exibir `street_manual` em vez de `street` quando disponível

## Notas Técnicas

- Campo `street_manual` tem precedência sobre `street` quando preenchido
- Componentes que exibem endereços devem verificar ambos os campos
- Sistema mantém compatibilidade retroativa com registros existentes

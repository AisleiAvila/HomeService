# Correção: Receita Total não refletindo pagamentos efetuados

## Problema Identificado

Na funcionalidade **Visão Geral** (Admin Overview), o card de **Receita Total** não estava exibindo serviços concluídos com pagamento efetuado.

### Causa Raiz

O problema tinha **duas causas**:

1. **Código de cálculo estava correto** - O componente [admin-overview.component.ts](src/components/admin-dashboard/admin-overview/admin-overview.component.ts) filtra corretamente apenas serviços com `status === "Concluído"` E `payment_status === "Paid"`.

2. **Dados no banco estavam incorretos** - Os métodos de workflow não estavam atualizando o campo `payment_status` quando o pagamento era registrado:
   - `registerPayment()` atualizava `ispaid: true` mas não `payment_status: "Paid"`
   - `finalizeService()` não garantia que `completed_at` fosse definido

### Exemplo do Problema

Serviço #38:

- ✅ Status: "Concluído"
- ✅ Valor: €100.00
- ✅ ispaid: true
- ❌ **payment_status: "Unpaid"** (deveria ser "Paid")

## Solução Implementada

### 1. Correção do Código (Prevenção)

Atualizado [workflow-simplified.service.ts](src/services/workflow-simplified.service.ts):

**Método `registerPayment()`:**

```typescript
// ANTES
.update({
  payment_date: new Date().toISOString(),
  payment_amount: paymentData.amount,
  payment_method: paymentData.method,
  payment_notes: paymentData.notes,
  paid_by_admin_id: adminId,
  status: "Pagamento Feito",
  ispaid: true,
})

// DEPOIS
.update({
  payment_date: new Date().toISOString(),
  payment_amount: paymentData.amount,
  payment_method: paymentData.method,
  payment_notes: paymentData.notes,
  paid_by_admin_id: adminId,
  status: "Pagamento Feito",
  ispaid: true,
  payment_status: "Paid", // ✅ ADICIONADO
})
```

**Método `finalizeService()`:**

```typescript
// ANTES
.update({
  finalized_at: new Date().toISOString(),
  finalized_by_admin_id: adminId,
  admin_notes: adminNotes,
  status: "Concluído",
})

// DEPOIS
.update({
  finalized_at: new Date().toISOString(),
  finalized_by_admin_id: adminId,
  admin_notes: adminNotes,
  status: "Concluído",
  completed_at: new Date().toISOString(), // ✅ ADICIONADO
})
```

### 2. Correção dos Dados Existentes

Executado script [fix-payment-status.js](fix-payment-status.js) que:

1. Identificou 1 serviço com pagamento registrado mas `payment_status` incorreto
2. Atualizou `payment_status` para "Paid" quando:
   - `ispaid = true` OU
   - `payment_date IS NOT NULL` OU
   - `status = 'Pagamento Feito'`
3. Garantiu que serviços concluídos tenham `completed_at` definido

### 3. Scripts de Diagnóstico

Criados scripts auxiliares:

- **[debug-receita-total.js](debug-receita-total.js)** - Diagnóstico completo da receita total
- **[fix-payment-status.js](fix-payment-status.js)** - Correção automatizada dos dados
- **[scripts/fix_payment_status.sql](scripts/fix_payment_status.sql)** - Queries SQL para correção manual

## Resultado

### Antes da Correção

- 💶 Receita Total: **€0.00**
- 📊 Serviços contados: **0**
- ⚠️ Diferença não contabilizada: **€100.00**

### Após a Correção

- 💶 Receita Total: **€100.00** ✅
- 📊 Serviços contados: **1** ✅
- ✅ Diferença não contabilizada: **€0.00** ✅

## Testes Realizados

1. ✅ Diagnóstico pré-correção identificou o problema
2. ✅ Script de correção atualizou dados existentes
3. ✅ Diagnóstico pós-correção confirmou a solução
4. ✅ Card de Receita Total agora reflete valores corretos

## Próximos Passos

Para evitar este problema no futuro:

1. ✅ Código corrigido previne novos casos
2. 📝 Adicionar testes automatizados para validar sincronização de `ispaid` e `payment_status`
3. 📝 Considerar criar uma constraint no banco para garantir consistência:
   ```sql
   ALTER TABLE service_requests
   ADD CONSTRAINT check_payment_consistency
   CHECK (
     (ispaid = true AND payment_status = 'Paid') OR
     (ispaid = false AND payment_status != 'Paid') OR
     (ispaid IS NULL)
   );
   ```

## Arquivos Modificados

- ✏️ [src/services/workflow-simplified.service.ts](src/services/workflow-simplified.service.ts)
- 📄 [fix-payment-status.js](fix-payment-status.js) (novo)
- 📄 [debug-receita-total.js](debug-receita-total.js) (novo)
- 📄 [scripts/fix_payment_status.sql](scripts/fix_payment_status.sql) (novo)
- 📄 [CORRECAO_RECEITA_TOTAL.md](CORRECAO_RECEITA_TOTAL.md) (este arquivo)

---

**Data da Correção:** 15 de dezembro de 2025  
**Status:** ✅ Concluído e testado

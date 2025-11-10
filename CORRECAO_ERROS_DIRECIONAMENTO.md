# Correção de Erros - Direcionamento de Solicitações

## ✅ Problemas Identificados e Corrigidos

### 1. Erro no Campo `timestamp` da tabela `enhanced_notifications`

**Problema:** O código estava tentando inserir um campo `timestamp` que não existe na tabela `enhanced_notifications`. A tabela usa `created_at` ao invés de `timestamp`.

**Solução Aplicada:**
- ✅ Atualizado `notification.service.ts` - removido o campo `timestamp` da inserção (será gerado automaticamente pelo banco)
- ✅ Atualizado `maintenance.models.ts` - interface `Notification` agora usa `created_at` ao invés de `timestamp`

### 2. Status "Aguardando confirmação do profissional" não existe no banco de dados

**Problema:** O código TypeScript define o status, mas o banco de dados PostgreSQL pode não ter este valor no enum ou constraint de status.

**Ação Necessária:** Você precisa adicionar o status ao banco de dados Supabase.

---

## 🔧 Passos para Corrigir no Supabase

### Passo 1: Verificar o Tipo da Coluna Status

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Execute a seguinte query:

```sql
-- Verificar o tipo da coluna status
SELECT 
  column_name, 
  data_type, 
  udt_name,
  column_default
FROM information_schema.columns 
WHERE table_name = 'service_requests' 
AND column_name = 'status';

-- Verificar se há constraints na coluna status
SELECT 
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'service_requests'
AND con.conname LIKE '%status%';
```

### Passo 2: Adicionar o Novo Status

✅ **Confirmado:** A tabela `service_requests` **NÃO usa ENUM**. Execute o seguinte:

```sql
-- Verificar se há constraint na coluna status
SELECT 
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'service_requests'
AND pg_get_constraintdef(con.oid) LIKE '%status%';
```

**Se a query acima retornar uma constraint (ex: CHECK constraint):**

```sql
-- Remover constraint antiga
ALTER TABLE service_requests 
DROP CONSTRAINT IF EXISTS service_requests_status_check;

-- Adicionar nova constraint com todos os valores permitidos
ALTER TABLE service_requests 
ADD CONSTRAINT service_requests_status_check 
CHECK (status IN (
  'Pending',
  'Quoted', 
  'Approved',
  'In Progress',
  'Completed',
  'Canceled',
  'Aguardando confirmação do profissional'
));
```

**Se a query acima NÃO retornar nenhuma constraint:**

✅ **Não precisa fazer nada!** A coluna aceita qualquer texto e o novo status já funcionará.

### Passo 3: Verificar a Tabela `enhanced_notifications`

Execute esta query para confirmar que a tabela usa `created_at` e não `timestamp`:

```sql
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'enhanced_notifications'
ORDER BY ordinal_position;
```

Se o campo `created_at` não tiver um valor padrão, adicione:

```sql
ALTER TABLE enhanced_notifications 
ALTER COLUMN created_at SET DEFAULT NOW();
```

---

## ✅ Verificação Final

Após executar os comandos SQL necessários no Supabase:

1. Volte para a aplicação
2. Recarregue a página (F5)
3. Tente direcionar uma solicitação novamente
4. Verifique no console do navegador se os erros HTTP 400 desapareceram

---

## 📋 Resumo das Alterações no Código

### Arquivos Modificados:

1. **`src/services/notification.service.ts`**
   - Removido o campo `timestamp` ao criar notificações (ambos os métodos)
   - O banco gerará automaticamente o `created_at`

2. **`src/models/maintenance.models.ts`**
   - Interface `Notification` agora usa `created_at` ao invés de `timestamp`
   - Interface `EnhancedNotification` herda corretamente o campo

3. **`src/components/admin-dashboard/admin-dashboard.component.html`**
   - Botão "Direcionar para Profissional" agora oculto quando status é "Aguardando confirmação do profissional"
   - Aplicado tanto na versão desktop quanto mobile
   - Botões de ação exibem apenas ícones com tooltips explicativos

4. **`src/components/service-list/service-list.component.ts`**
   - Adicionados outputs `confirmAssignment` e `rejectAssignment` para profissionais

5. **`src/components/service-list/service-list.component.html`**
   - Adicionados botões de confirmação/recusa para profissionais quando status é "Aguardando confirmação do profissional"
   - Aplicado tanto na versão desktop (tabela) quanto mobile (cards)

6. **`src/components/dashboard/dashboard.component.ts`**
   - Implementados métodos `handleConfirmAssignment()` e `handleRejectAssignment()`
   - Confirmação: muda status para "Agendado"
   - Recusa: muda status para "Buscando profissional" e remove o profissional

7. **`src/components/dashboard/dashboard.component.html`**
   - Conectados eventos `confirmAssignment` e `rejectAssignment` aos handlers

8. **`src/i18n.service.ts`**
   - Adicionadas traduções PT/EN:
     - `confirmAssignment`: "Confirmar Atribuição" / "Confirm Assignment"
     - `rejectAssignment`: "Rejeitar Atribuição" / "Reject Assignment"
     - `assignmentConfirmed`: "Atribuição confirmada com sucesso" / "Assignment confirmed successfully"
     - `assignmentRejected`: "Atribuição rejeitada com sucesso" / "Assignment rejected successfully"
     - `errorConfirmingAssignment`: Mensagens de erro PT/EN
     - `errorRejectingAssignment`: Mensagens de erro PT/EN

### Arquivo SQL Criado:

- **`sql/add_awaiting_professional_confirmation_status.sql`**
  - Script com queries de diagnóstico e opções de correção

---

## 🐛 Como Identificar Outros Problemas

Se ainda houver erros após estas correções:

1. Abra o **Console do Navegador** (F12)
2. Vá na aba **Network**
3. Tente direcionar uma solicitação
4. Clique na requisição que falhou (com status 400)
5. Veja a aba **Response** para detalhes do erro

---

## 📞 Próximos Passos

Depois de corrigir no Supabase, teste o fluxo completo:

### Fluxo de Direcionamento pelo Admin:
1. ✅ Admin direciona solicitação para profissional
2. ✅ Status muda para "Aguardando confirmação do profissional"
3. ✅ Profissional recebe notificação
4. ✅ Data, hora e duração são salvos corretamente
5. ✅ Botão "Direcionar para Profissional" desaparece da lista do admin

### Fluxo de Confirmação/Recusa pelo Profissional:
1. ✅ Profissional vê solicitações com status "Aguardando confirmação do profissional" em seu dashboard
2. ✅ Profissional pode **Confirmar** a atribuição:
   - Status muda para "Agendado"
   - Serviço fica disponível para iniciar na data/hora programada
3. ✅ Profissional pode **Rejeitar** a atribuição:
   - Status muda para "Buscando profissional"
   - Profissional é removido da solicitação
   - Admin pode atribuir a outro profissional

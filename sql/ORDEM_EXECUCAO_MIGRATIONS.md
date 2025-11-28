# Ordem de Execução dos Scripts SQL - HomeService

## 📋 Ordem Correta de Execução

Execute os scripts **na ordem numérica** conforme listado abaixo. Cada migração deve ser executada **uma única vez** e **em sequência**.

---

## ✅ Migrações Principais (Ordem de Execução)

### **1. Adicionar campos às subcategorias**

📁 **Arquivo:** `sql/001_add_subcategory_fields.up.sql`

**O que faz:**

- Adiciona campos `type`, `average_time_minutes`, `price`, `description` à tabela `service_subcategories`
- Permite diferenciar entre serviços "precificados" e "orçados"

**Quando executar:** Primeira migração a ser executada

---

### **2. Tornar subcategoria obrigatória**

📁 **Arquivo:** `sql/002_make_subcategory_required.up.sql`

**O que faz:**

- Torna o campo `subcategory_id` obrigatório em `service_requests`
- Atualiza registros existentes que não têm subcategoria

**Quando executar:** Após executar a migração 001

⚠️ **Pré-requisito:** Certifique-se de que todas as categorias têm pelo menos uma subcategoria

---

### **3. Remover papel de cliente do schema**

📁 **Arquivo:** `sql/migrations/003_remove_client_role_schema.up.sql`

**O que faz:**

- Remove o papel "client" do sistema (clientes não serão mais cadastrados)
- Torna `client_id` opcional em `service_requests`
- Remove todos os usuários com role "client"

**Quando executar:** Após executar as migrações 001 e 002

⚠️ **ATENÇÃO:** Esta migração é **destrutiva** e remove permanentemente dados de clientes!

---

### **4. [Pulado] - Migração 004**

Esta numeração foi pulada ou mesclada com a migração 003.

---

### **5. Remover RLS de papel de cliente**

📁 **Arquivo:** `sql/migrations/005_remove_client_role_rls.up.sql`

**O que faz:**

- Remove políticas RLS relacionadas ao papel "client"
- Ajusta permissões de acesso às tabelas

**Quando executar:** Após executar a migração 003

---

### **6. Adicionar fotos e respostas de profissionais** ⭐ **NOVA**

📁 **Arquivo:** `sql/migrations/006_add_photos_and_professional_responses.up.sql`

**O que faz:**

- Adiciona campos `photos` e `attachments` em `service_requests`
- Cria tabela `professional_responses` para múltiplos orçamentos
- Configura índices e permissões
- Cria trigger para `updated_at`

**Quando executar:** Após executar as migrações 001-005

---

## 📂 Scripts Auxiliares (Executar conforme necessário)

Estes scripts não fazem parte da sequência principal de migrações, mas podem ser úteis:

### **Endereços Portugueses**

📁 **Arquivo:** `database-portugal-addresses.sql`

**O que faz:**

- Adiciona validação de códigos postais portugueses
- Adiciona campos de freguesia e concelho
- Cria funções de validação

**Quando executar:** Após as migrações principais, se necessário

---

### **Adicionar status de confirmação de profissional**

📁 **Arquivo:** `sql/add_awaiting_professional_confirmation_status.sql`

**O que faz:**

- Adiciona novo status "Aguardando confirmação do profissional"

**Quando executar:** Conforme necessário

---

### **Campos de SMS e telefone**

📁 **Arquivos:**

- `sql/add_phone_verified_to_users.sql`
- `sql/add_sms_code_to_users.sql`
- `sql/add_receive_sms_notifications_to_users.sql`

**O que faz:**

- Adiciona campos relacionados a verificação de telefone por SMS

**Quando executar:** Se for implementar verificação por SMS

---

### **Políticas RLS para Subcategorias**

📁 **Arquivos:**

- `sql/service_subcategories-policies.sql`
- `sql/fix_subcategories_rls.sql`
- `sql/disable_rls_subcategories.sql`

**O que faz:**

- Configura ou desabilita Row Level Security para subcategorias

**Quando executar:** Apenas se estiver tendo problemas com RLS

---

## 🚀 Como Executar

### Método 1: Via Supabase Dashboard (Recomendado)

1. Acesse https://supabase.com/dashboard
2. Entre no seu projeto HomeService
3. Navegue para **SQL Editor**
4. Para cada migração (na ordem):
   - Copie o conteúdo do arquivo `.up.sql`
   - Cole no SQL Editor
   - Clique em **Run** (ou `Ctrl+Enter`)
   - Verifique se não há erros

### Método 2: Via CLI do Supabase

```bash
supabase db push
```

---

## ✅ Checklist de Execução

Marque cada migração conforme for executando:

- [ ] 001_add_subcategory_fields.up.sql
- [ ] 002_make_subcategory_required.up.sql
- [ ] 003_remove_client_role_schema.up.sql
- [ ] 005_remove_client_role_rls.up.sql
- [ ] 006_add_photos_and_professional_responses.up.sql ⭐ **NOVA**

---

## 🔄 Como Reverter (Rollback)

Se precisar reverter uma migração, execute o arquivo `.down.sql` correspondente:

```sql
-- Exemplo: Reverter migração 006
-- Execute: 006_add_photos_and_professional_responses.down.sql
```

⚠️ **ATENÇÃO:** Reverter migrações pode causar perda de dados!

---

## 📊 Validação Pós-Migração

Após executar todas as migrações, valide com:

```sql
-- Verificar estrutura de service_requests
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'service_requests'
ORDER BY ordinal_position;

-- Verificar se tabela professional_responses existe
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'professional_responses';

-- Verificar subcategorias
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'service_subcategories'
ORDER BY ordinal_position;
```

---

## 🐛 Troubleshooting

### "relation already exists"

Uma tabela ou coluna já foi criada. Pule esta parte da migração ou execute o rollback primeiro.

### "column does not exist"

Verifique se executou todas as migrações anteriores na ordem correta.

### "constraint violation"

Pode haver dados inconsistentes. Revise os dados antes de executar a migração.

---

## 📞 Status das Migrações

| #   | Nome                            | Status     | Data Criação |
| --- | ------------------------------- | ---------- | ------------ |
| 001 | Add Subcategory Fields          | ✅ Estável | -            |
| 002 | Make Subcategory Required       | ✅ Estável | -            |
| 003 | Remove Client Role Schema       | ✅ Estável | -            |
| 005 | Remove Client Role RLS          | ✅ Estável | -            |
| 006 | Photos & Professional Responses | 🆕 Nova    | 28/11/2025   |

---

**Última atualização:** 28 de Novembro de 2025

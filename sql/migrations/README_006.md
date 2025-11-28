# Migração 006: Fotos e Respostas de Profissionais

## 📋 O que esta migração faz?

Esta migração adiciona suporte para:

1. **Fotos e Anexos** nos pedidos de serviço

   - Campo `photos` (array de URLs)
   - Campo `attachments` (array de URLs de documentos)

2. **Respostas de Profissionais** (professional_responses)
   - Tabela dedicada para armazenar múltiplos orçamentos
   - Cada profissional pode enviar sua proposta
   - Informações incluem: valor, duração estimada, observações
   - Status da resposta (pending, responded, accepted, rejected)

## 🚀 Como Aplicar

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto HomeService
3. Navegue para **SQL Editor**
4. Copie e cole o conteúdo de `006_add_photos_and_professional_responses.up.sql`
5. Clique em **Run** ou pressione `Ctrl+Enter`

### Opção 2: Via CLI do Supabase

```bash
supabase db push
```

## 📊 Estrutura da Nova Tabela

### professional_responses

| Campo                    | Tipo          | Descrição                           |
| ------------------------ | ------------- | ----------------------------------- |
| id                       | SERIAL        | ID único da resposta                |
| service_request_id       | INTEGER       | FK para service_requests            |
| professional_id          | INTEGER       | FK para users (profissional)        |
| professional_auth_id     | TEXT          | UUID do Supabase Auth               |
| quote_amount             | NUMERIC(10,2) | Valor do orçamento                  |
| quote_notes              | TEXT          | Observações sobre o orçamento       |
| estimated_duration_hours | NUMERIC(5,2)  | Duração estimada                    |
| response_status          | TEXT          | pending/responded/accepted/rejected |
| responded_at             | TIMESTAMP     | Data/hora da resposta               |
| created_at               | TIMESTAMP     | Data de criação                     |
| updated_at               | TIMESTAMP     | Data de atualização                 |

### Campos Adicionados em service_requests

| Campo       | Tipo   | Descrição                   |
| ----------- | ------ | --------------------------- |
| photos      | TEXT[] | Array de URLs de fotos      |
| attachments | TEXT[] | Array de URLs de documentos |

## 🔒 Políticas RLS Criadas

1. **Visualização**: Usuários autenticados podem ver respostas de seus próprios pedidos
2. **Inserção**: Apenas profissionais podem criar respostas
3. **Atualização**: Profissionais podem atualizar suas próprias respostas, admins podem atualizar qualquer uma
4. **Exclusão**: Profissionais podem deletar suas próprias respostas, admins podem deletar qualquer uma

## ✅ Validação

Após executar a migração, verifique se tudo foi criado corretamente:

```sql
-- Verificar se as colunas foram adicionadas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'service_requests'
AND column_name IN ('photos', 'attachments');

-- Verificar se a tabela foi criada
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'professional_responses';

-- Verificar políticas RLS
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'professional_responses';
```

## 🔄 Como Reverter

Se precisar reverter esta migração:

```sql
-- Execute o script de rollback
-- Copie e cole o conteúdo de 006_add_photos_and_professional_responses.down.sql
```

⚠️ **ATENÇÃO**: Reverter a migração irá **deletar permanentemente** todos os dados da tabela `professional_responses` e remover as colunas `photos` e `attachments` de `service_requests`.

## 📝 Próximos Passos

Após aplicar a migração:

1. ✅ As interfaces TypeScript já estão atualizadas
2. ✅ O componente Service Request Details já está preparado
3. ⏭️ Implementar upload de fotos no formulário de criação de pedidos
4. ⏭️ Criar interface para profissionais enviarem orçamentos
5. ⏭️ Atualizar o DataService para buscar professional_responses

## 🐛 Troubleshooting

### Erro: "relation professional_responses already exists"

A tabela já foi criada anteriormente. Execute o script de rollback primeiro:

```sql
DROP TABLE IF EXISTS public.professional_responses CASCADE;
```

Depois execute novamente o script de migração.

### Erro: "column photos already exists"

As colunas já foram adicionadas. Você pode pular esta migração ou remover as colunas primeiro:

```sql
ALTER TABLE public.service_requests
DROP COLUMN IF EXISTS photos,
DROP COLUMN IF EXISTS attachments;
```

## 📞 Suporte

Se encontrar problemas, verifique:

1. Permissões de usuário no Supabase
2. Logs do SQL Editor
3. Console do navegador para erros de RLS

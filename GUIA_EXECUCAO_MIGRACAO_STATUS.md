# Guia de Execução da Migração de Status

## 📋 Pré-requisitos

Antes de executar a migração de status, certifique-se de que:

- ✅ **Fase 1-5 concluídas**: Código da aplicação já migrado para o novo sistema de status
- ✅ **Build bem-sucedido**: `ng build --configuration production` sem erros
- ✅ **Schema atualizado**: Script `remove_client_role.sql` já executado
- ✅ **Backup disponível**: Supabase possui backups automáticos habilitados

## 🎯 Objetivo da Migração

Este script migra os status de solicitações de serviço do **sistema antigo (23+ status com orçamentos)** para o **novo sistema simplificado (11 status sem orçamentos)**.

### Mapeamento de Status

| Status Antigo                      | →   | Status Novo            |
| ---------------------------------- | --- | ---------------------- |
| Em análise, InAnalysis, Requested  | →   | Solicitado             |
| Aguardando esclarecimentos         | →   | Solicitado             |
| Buscando profissional              | →   | Solicitado             |
| Profissional selecionado           | →   | Atribuído              |
| Orçamento enviado, QuoteSent       | →   | Aguardando Confirmação |
| Aguardando aprovação do orçamento  | →   | Aguardando Confirmação |
| Orçamento aprovado, QuoteApproved  | →   | Aceito                 |
| Aprovado, Approved                 | →   | Aceito                 |
| Aguardando data de execução        | →   | Aceito                 |
| Orçamento rejeitado, QuoteRejected | →   | Recusado               |
| Rejeitado, Rejected                | →   | Recusado               |
| Agendado, Scheduled                | →   | Data Definida          |
| Em execução, InProgress            | →   | Em Progresso           |
| Concluído - Aguardando aprovação   | →   | Aguardando Finalização |
| Pago, Paid                         | →   | Pagamento Feito        |
| Finalizado, Completed              | →   | Concluído              |
| Cancelled, Canceled                | →   | Cancelado              |

## 🧪 Ambiente de Teste (OBRIGATÓRIO)

### 1. Preparar Ambiente de Desenvolvimento

```bash
# Criar snapshot do banco de desenvolvimento
# No painel Supabase:
# Settings → Database → Create Snapshot → "pre-status-migration"
```

### 2. Executar Migração em Teste

1. Acesse o **SQL Editor** do Supabase (ambiente de desenvolvimento)
2. Abra o arquivo `sql/migrations/migrate_status_to_new_system.sql`
3. Copie **TODO** o conteúdo do script
4. Cole no SQL Editor
5. Clique em **Run** (não faça commit ainda)

### 3. Revisar Resultados

O script exibe 4 relatórios de validação:

#### Relatório 1: Distribuição ANTES da Migração

```sql
status               | total_requests | percentage
---------------------|----------------|------------
Em análise           | 45             | 22.5
Agendado             | 38             | 19.0
Finalizado           | 32             | 16.0
...
```

#### Relatório 2: Status que Serão Migrados

```sql
Em análise
Agendado
Finalizado
Orçamento enviado
...
```

#### Relatório 3: Distribuição APÓS a Migração

```sql
status                    | total_requests
--------------------------|----------------
Solicitado                | 67
Data Definida             | 38
Concluído                 | 32
Aguardando Confirmação    | 15
...
```

#### Relatório 4: Mudanças Detalhadas

```sql
status_antigo       | status_novo              | total_migrados
--------------------|--------------------------|----------------
Em análise          | Solicitado               | 45
Agendado            | Data Definida            | 38
Finalizado          | Concluído                | 32
...
```

### 4. Validar Resultados

Verifique se:

- [ ] **Total de registros**: Antes = Depois (nenhum registro perdido)
- [ ] **Status inválidos**: Relatório "Identificar qualquer status..." retorna 0 linhas
- [ ] **Distribuição lógica**: Status novos fazem sentido (ex: "Solicitado" agrupa vários status iniciais)
- [ ] **Registros críticos**: Pedidos importantes mantiveram sentido (ex: Finalizados → Concluídos)

### 5. Testar Aplicação

Após confirmar a migração no banco de testes:

```bash
# Iniciar aplicação Angular em modo de desenvolvimento
ng serve

# Testar:
# ✅ Dashboard carrega sem erros
# ✅ Filtros de status funcionam
# ✅ Detalhes de solicitações exibem status corretos
# ✅ Gráficos e relatórios exibem dados corretos
# ✅ Fluxo de trabalho funciona (criar, atribuir, aceitar, concluir)
```

### 6. Decisão

**✅ Tudo OK?** → Prossiga para produção (próxima seção)

**❌ Problemas encontrados?** → Execute ROLLBACK e revise:

```sql
-- No SQL Editor, execute:
ROLLBACK;

-- Analise os logs de erro
-- Revise o script se necessário
-- Repita o processo de teste
```

## 🚀 Produção (Após Sucesso em Teste)

### 1. Backup de Segurança

```bash
# No painel Supabase (Produção):
# Settings → Database → Create Snapshot → "pre-status-migration-prod-2025-01-29"

# Verificar que snapshot foi criado com sucesso
# Settings → Database → Snapshots → Confirmar presença do backup
```

### 2. Agendar Janela de Manutenção

**Recomendado**: Execute durante período de baixo uso (ex: madrugada, fim de semana)

**Tempo estimado**: 2-5 minutos para bancos com até 10.000 registros

**Impacto**:

- ⚠️ Aplicação continuará funcionando durante migração
- ⚠️ Alguns usuários podem ver status em transição temporariamente
- ✅ Transação garante consistência (tudo ou nada)

### 3. Executar Migração

1. **Acesse SQL Editor** do Supabase (produção)
2. **Abra** `sql/migrations/migrate_status_to_new_system.sql`
3. **Copie TODO** o conteúdo
4. **Cole** no SQL Editor
5. **Execute** o script (Run)
6. **Aguarde** conclusão (acompanhe progress no console)

### 4. Revisar Relatórios (Produção)

Mesma validação do ambiente de teste:

- [ ] Total de registros preservado
- [ ] Nenhum status inválido restante
- [ ] Distribuição de status lógica
- [ ] Registros críticos validados

### 5. Commit ou Rollback

**✅ Se tudo estiver correto**:

```sql
-- No SQL Editor, descomente e execute:
COMMIT;
```

**❌ Se houver qualquer problema**:

```sql
-- Execute IMEDIATAMENTE:
ROLLBACK;

-- Restaure o snapshot se necessário:
-- Settings → Database → Snapshots → pre-status-migration-prod-2025-01-29 → Restore
```

### 6. Deploy da Aplicação

Após COMMIT bem-sucedido:

```bash
# Build de produção
ng build --configuration production

# Deploy (ajuste conforme seu processo)
# Exemplo para Vercel:
vercel --prod

# Exemplo para Firebase:
firebase deploy --only hosting

# Exemplo para AWS/Azure:
# Siga seu processo específico de deploy
```

### 7. Monitoramento Pós-Migração

**Primeiras 24 horas** após deploy:

- [ ] Monitorar logs de erro da aplicação
- [ ] Verificar métricas de uso (dashboard analytics)
- [ ] Testar fluxos críticos manualmente:
  - [ ] Criar nova solicitação
  - [ ] Atribuir profissional
  - [ ] Aceitar serviço
  - [ ] Executar e concluir
  - [ ] Fazer pagamento
- [ ] Verificar notificações sendo enviadas corretamente
- [ ] Confirmar que relatórios exibem dados corretos

## 🔄 Plano de Rollback (Em Caso de Emergência)

### Cenário 1: Problemas Durante Execução do Script

```sql
-- Execute IMEDIATAMENTE no SQL Editor:
ROLLBACK;
```

### Cenário 2: Problemas Após COMMIT (Produção)

**Opção A - Restaurar Snapshot** (Mais Rápido):

1. Supabase Dashboard → Settings → Database → Snapshots
2. Selecione `pre-status-migration-prod-2025-01-29`
3. Clique em **Restore**
4. **ATENÇÃO**: Você perderá dados criados APÓS o snapshot

**Opção B - Migração Reversa** (Preserva Novos Dados):

```sql
-- Script de reversão (criar se necessário)
-- Reverte status novos para status antigos mais comuns

BEGIN;

UPDATE service_requests SET status = 'Em análise' WHERE status = 'Solicitado';
UPDATE service_requests SET status = 'Agendado' WHERE status = 'Data Definida';
UPDATE service_requests SET status = 'Em execução' WHERE status = 'Em Progresso';
UPDATE service_requests SET status = 'Finalizado' WHERE status = 'Concluído';
-- ... outros mapeamentos reversos ...

COMMIT;
```

**Opção C - Deploy de Versão Anterior** (Aplicação):

```bash
# Reverter deploy para commit anterior
git revert HEAD
git push origin main

# Redeploy versão anterior
# (conforme seu processo de deploy)
```

## 📊 Checklist Final

### Antes da Migração

- [ ] Backup de produção criado
- [ ] Migração testada em desenvolvimento com sucesso
- [ ] Aplicação testada após migração em dev
- [ ] Janela de manutenção agendada (se necessário)
- [ ] Equipe notificada sobre a migração

### Durante a Migração

- [ ] Script executado sem erros
- [ ] Relatórios de validação revisados
- [ ] Total de registros confirmado
- [ ] Status inválidos = 0

### Após a Migração

- [ ] COMMIT executado
- [ ] Deploy da aplicação realizado
- [ ] Testes manuais em produção OK
- [ ] Logs de erro monitorados (24h)
- [ ] Usuários não reportaram problemas

### Fase 6 Completa

- [ ] Migração de dados concluída
- [ ] Aplicação funcionando com novo sistema
- [ ] Documentação atualizada
- [ ] Pronto para Fase 7 (remoção de código deprecated)

## 🆘 Suporte e Troubleshooting

### Problema: "Transação muito longa"

**Solução**: Divida o script em batches menores (ex: migrar por categoria de status)

### Problema: "Timeout na execução"

**Solução**: Aumente o timeout do Supabase ou execute via CLI com `psql`

### Problema: "Status desconhecido encontrado"

**Solução**:

1. Execute query de identificação:

```sql
SELECT DISTINCT status FROM service_requests
WHERE status NOT IN ('Solicitado', 'Atribuído', ...);
```

2. Adicione mapeamento para status desconhecido no script
3. Re-execute

### Problema: "Aplicação exibe status incorretos"

**Solução**:

1. Limpe cache do navegador
2. Verifique se deploy foi bem-sucedido
3. Confirme que build de produção foi executado
4. Valide que StatusMigrationUtil está sendo usado

## 📝 Próximos Passos

Após conclusão bem-sucedida da Fase 6:

1. **Fase 7**: Remover código deprecated

   - ServiceStatusDeprecated type
   - workflow.service.ts
   - budget-approval-modal.component.ts
   - Campos quote\_\* (comentários no código)

2. **Fase 8**: Testes finais
   - Testes e2e completos
   - Testes de integração
   - Validação de performance

## 📞 Contatos de Emergência

- **Supabase Support**: https://supabase.com/dashboard/support
- **Backup Manual**: Use pg_dump via Supabase CLI se necessário

---

**Criado em**: 29/01/2025  
**Versão**: 1.0  
**Relacionado**: PLANO_MIGRACAO_STATUS.md (Fase 6)

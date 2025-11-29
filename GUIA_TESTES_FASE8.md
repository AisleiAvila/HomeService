# Guia de Testes End-to-End - Fase 8

## Sistema de 11 Status Simplificado

**Data:** 29/11/2025  
**Status da Migração:** ✅ Fases 1-7 Completas  
**Objetivo:** Validar funcionamento completo do novo sistema de status

---

## 📋 Pré-requisitos

### ✅ Checklist de Preparação

- [x] **Fase 1-5:** Código migrado (componentes + serviços + formulários)
- [x] **Fase 6:** Base de dados migrada (7 registros atualizados, COMMIT confirmado)
- [x] **Fase 7:** Código deprecated removido (build compilando sem erros)
- [ ] **Servidor:** Aplicação rodando em `http://localhost:4200`
- [ ] **Autenticação:** Contas de teste disponíveis (admin + profissional)

### 🔧 Como Iniciar

```bash
# Terminal 1: Iniciar aplicação
npm start

# Terminal 2 (opcional): Verificar logs
# Acessar http://localhost:4200
```

---

## 🎯 Sistema de 11 Status - Referência Rápida

| #   | Status                     | Descrição                            | Responsável        |
| --- | -------------------------- | ------------------------------------ | ------------------ |
| 1   | **Solicitado**             | Pedido criado pelo admin             | Admin              |
| 2   | **Atribuído**              | Admin atribuiu a profissional        | Admin              |
| 3   | **Aguardando Confirmação** | Sistema notificou profissional       | Sistema            |
| 4   | **Aceito**                 | Profissional aceitou trabalho        | Profissional       |
| 5   | **Recusado**               | Profissional recusou trabalho        | Profissional       |
| 6   | **Data Definida**          | Profissional agendou data            | Profissional       |
| 7   | **Em Progresso**           | Profissional executando serviço      | Profissional       |
| 8   | **Aguardando Finalização** | Profissional concluiu, aguarda admin | Profissional       |
| 9   | **Pagamento Feito**        | Admin registrou pagamento            | Admin              |
| 10  | **Concluído**              | Admin finalizou processo             | Admin              |
| 11  | **Cancelado**              | Cancelado a qualquer momento         | Admin/Profissional |

---

## 🧪 Cenários de Teste

### 📝 Cenário 1: Verificação de Dados Migrados

**Objetivo:** Confirmar que os 7 registros existentes estão com status corretos

**Passos:**

1. Fazer login como **admin**
2. Acessar **Dashboard** ou **Lista de Solicitações**
3. Verificar cada registro existente

**Validações:**

- [ ] Nenhum registro mostra status deprecated (ex: "Em análise", "Orçamento enviado")
- [ ] Todos os status exibidos estão no novo sistema de 11 status
- [ ] Workflow timeline exibe corretamente as fases
- [ ] Cores e ícones dos status estão corretos

**Resultados Esperados:**

- ✅ 100% dos registros com status do novo sistema
- ✅ Sem erros de console relacionados a status
- ✅ Interface exibe status em português correto

---

### 🆕 Cenário 2: Criação de Nova Solicitação (Admin)

**Objetivo:** Testar fluxo completo desde criação até conclusão

**Passos:**

1. Login como **admin**
2. Clicar em **"Nova Solicitação"** ou **"Criar Pedido"**
3. Preencher formulário:
   - Título: "Teste Migração - [Data/Hora]"
   - Descrição: "Teste do novo sistema de 11 status"
   - Categoria: Qualquer
   - Prioridade: Média
4. Submeter formulário

**Validações:**

- [ ] Status inicial: **"Solicitado"** ✅
- [ ] Registro aparece na lista de solicitações
- [ ] Não há campos de orçamento visíveis (quote\_\*)
- [ ] Workflow timeline mostra Fase 1 ativa

**Resultados Esperados:**

- ✅ Solicitação criada com status "Solicitado"
- ✅ Sem erros de console
- ✅ Interface atualiza automaticamente (se real-time ativo)

---

### 👤 Cenário 3: Atribuição a Profissional (Admin)

**Objetivo:** Admin atribui solicitação a profissional específico

**Passos:**

1. Na lista de solicitações, selecionar o registro criado
2. Clicar em **"Atribuir"** ou **"Selecionar Profissional"**
3. Escolher um profissional da lista
4. Confirmar atribuição

**Validações:**

- [ ] Status muda para: **"Atribuído"** ✅
- [ ] Nome do profissional aparece no card/detalhes
- [ ] Workflow timeline mostra Fase 1 completa
- [ ] Sistema dispara notificação para profissional (se configurado)

**Resultados Esperados:**

- ✅ Status atualizado para "Atribuído"
- ✅ Profissional vinculado ao registro
- ✅ Interface reflete a mudança imediatamente

---

### ✅ Cenário 4: Aceite pelo Profissional

**Objetivo:** Profissional aceita trabalho atribuído

**Passos:**

1. Fazer **logout** do admin
2. Login como **profissional** (o que foi atribuído)
3. Acessar **"Minhas Solicitações"** ou **Dashboard**
4. Selecionar a solicitação atribuída
5. Clicar em **"Aceitar"** ou **"Confirmar"**

**Validações:**

- [ ] Status muda para: **"Aceito"** ✅
- [ ] Botões de ação mudam (ex: "Agendar Data" fica disponível)
- [ ] Workflow timeline avança para Fase 2
- [ ] Admin recebe notificação de aceite (se configurado)

**Resultados Esperados:**

- ✅ Status "Aceito" confirmado
- ✅ Profissional pode prosseguir com próximas ações
- ✅ Sem opções de aprovar/rejeitar orçamento (removidas)

---

### ❌ Cenário 4b: Recusa pelo Profissional (Alternativo)

**Objetivo:** Profissional recusa trabalho atribuído

**Passos:**

1. Login como **profissional**
2. Selecionar solicitação em "Atribuído" ou "Aguardando Confirmação"
3. Clicar em **"Recusar"**
4. Informar motivo (opcional)
5. Confirmar recusa

**Validações:**

- [ ] Status muda para: **"Recusado"** ✅
- [ ] Registro fica inativo para profissional
- [ ] Admin pode reatribuir a outro profissional
- [ ] Workflow timeline indica recusa

**Resultados Esperados:**

- ✅ Status "Recusado" registrado
- ✅ Admin notificado da recusa
- ✅ Solicitação volta para controle do admin

---

### 📅 Cenário 5: Agendamento de Data (Profissional)

**Objetivo:** Profissional define data de execução do serviço

**Passos:**

1. Login como **profissional**
2. Selecionar solicitação com status "Aceito"
3. Clicar em **"Agendar Data"** ou **"Definir Data"**
4. Selecionar data e hora de execução
5. Confirmar agendamento

**Validações:**

- [ ] Status muda para: **"Data Definida"** ✅
- [ ] Data agendada aparece nos detalhes (execution_date)
- [ ] Workflow timeline avança
- [ ] Calendário/schedule reflete a data

**Resultados Esperados:**

- ✅ Status "Data Definida" confirmado
- ✅ Data salva corretamente no banco
- ✅ Admin visualiza data agendada

---

### 🔧 Cenário 6: Execução do Serviço (Profissional)

**Objetivo:** Profissional inicia e completa execução do trabalho

#### Parte A: Iniciar Trabalho

**Passos:**

1. Login como **profissional**
2. Selecionar solicitação com "Data Definida"
3. Clicar em **"Iniciar Trabalho"** ou **"Começar Execução"**
4. Confirmar início

**Validações:**

- [ ] Status muda para: **"Em Progresso"** ✅
- [ ] Timestamp de início registrado (work_start_time)
- [ ] Botão muda para "Finalizar Trabalho"
- [ ] Workflow timeline mostra Fase 3 ativa

#### Parte B: Concluir Trabalho

**Passos:** 5. Clicar em **"Finalizar Trabalho"** ou **"Marcar como Concluído"** 6. Informar observações (opcional) 7. Confirmar conclusão

**Validações:**

- [ ] Status muda para: **"Aguardando Finalização"** ✅
- [ ] Timestamp de conclusão registrado (work_end_time)
- [ ] Admin recebe notificação de conclusão
- [ ] Profissional não pode mais editar

**Resultados Esperados:**

- ✅ Transição Aceito → Data Definida → Em Progresso → Aguardando Finalização
- ✅ Timestamps corretos (início e fim do trabalho)
- ✅ Controle passa para admin

---

### 💰 Cenário 7: Pagamento e Conclusão (Admin)

**Objetivo:** Admin registra pagamento e finaliza processo

#### Parte A: Registrar Pagamento

**Passos:**

1. Login como **admin**
2. Selecionar solicitação com "Aguardando Finalização"
3. Clicar em **"Registrar Pagamento"** ou **"Pagar"**
4. Informar:
   - Valor pago (payment_amount)
   - Método de pagamento (payment_method)
   - Data de pagamento (payment_date)
5. Confirmar pagamento

**Validações:**

- [ ] Status muda para: **"Pagamento Feito"** ✅
- [ ] Dados de pagamento salvos corretamente
- [ ] Workflow timeline avança para Fase 4
- [ ] Botão "Finalizar" fica disponível

#### Parte B: Finalizar Solicitação

**Passos:** 6. Clicar em **"Finalizar"** ou **"Marcar como Concluído"** 7. Confirmar finalização

**Validações:**

- [ ] Status muda para: **"Concluído"** ✅
- [ ] Workflow timeline 100% completo
- [ ] Registro marcado como finalizado (finished_at)
- [ ] Sem ações disponíveis (apenas visualizar)

**Resultados Esperados:**

- ✅ Fluxo completo: Solicitado → ... → Concluído
- ✅ Todos os timestamps preenchidos
- ✅ Processo encerrado com sucesso

---

### 🚫 Cenário 8: Cancelamento em Diferentes Fases

**Objetivo:** Verificar que cancelamento funciona em qualquer etapa

#### Teste A: Cancelar em "Solicitado"

1. Criar nova solicitação (status: Solicitado)
2. Admin clica em "Cancelar"
3. Informar motivo: "Teste de cancelamento - Fase inicial"
4. Confirmar

**Validação:** Status = **"Cancelado"** ✅

#### Teste B: Cancelar em "Aceito"

1. Criar e atribuir solicitação (status: Aceito)
2. Admin OU profissional clica em "Cancelar"
3. Informar motivo: "Teste de cancelamento - Pós-aceite"
4. Confirmar

**Validação:** Status = **"Cancelado"** ✅

#### Teste C: Cancelar em "Em Progresso"

1. Levar solicitação até "Em Progresso"
2. Admin clica em "Cancelar"
3. Informar motivo: "Teste de cancelamento - Durante execução"
4. Confirmar

**Validação:** Status = **"Cancelado"** ✅

**Resultados Esperados:**

- ✅ Cancelamento funciona em todas as fases
- ✅ Motivo de cancelamento salvo (cancellation_reason)
- ✅ Registro fica inativo
- ✅ Workflow timeline indica cancelamento

---

## 📊 Testes de Visualização

### 🎨 Cenário 9: Componentes de UI

**Objetivo:** Validar que todos os componentes exibem status corretamente

**Componentes a Testar:**

#### 1. **Dashboard (Admin)**

- [ ] Cards de estatísticas mostram contagens corretas por status
- [ ] Gráficos (pie chart, bar chart) usam apenas 11 status
- [ ] Filtros de status funcionam corretamente
- [ ] Timeline temporal exibe evolução de status

#### 2. **Dashboard (Profissional)**

- [ ] Lista de trabalhos pendentes/ativos
- [ ] Status exibidos em português
- [ ] Ações disponíveis de acordo com status

#### 3. **Workflow Timeline**

- [ ] 4 fases exibidas corretamente:
  - Fase 1: Criação (Solicitado, Atribuído)
  - Fase 2: Confirmação (Aguardando Confirmação, Aceito/Recusado, Data Definida)
  - Fase 3: Execução (Em Progresso, Aguardando Finalização)
  - Fase 4: Conclusão (Pagamento Feito, Concluído, Cancelado)
- [ ] Fases completadas, ativas e pendentes visualmente distintas
- [ ] Barra de progresso reflete avanço correto

#### 4. **Service Request Details**

- [ ] Status atual exibido com cor e ícone corretos
- [ ] Histórico de mudanças de status (se implementado)
- [ ] Botões de ação contextualmente corretos

#### 5. **Lista de Solicitações**

- [ ] Filtros por status funcionam
- [ ] Ordenação por status possível
- [ ] Badge/tag de status visível em cada card

**Validações Gerais:**

- [ ] Sem status em inglês ou deprecated
- [ ] Cores consistentes (conforme StatusUtilsService)
- [ ] Textos i18n funcionando (português)
- [ ] Responsividade mobile mantida

---

## 🔍 Testes de Integridade

### ✅ Cenário 10: Verificação de Console e Erros

**Durante TODOS os testes acima:**

- [ ] Sem erros `TS2304` (Cannot find name 'ServiceStatusNew')
- [ ] Sem erros `TS2339` (Property does not exist)
- [ ] Sem warnings sobre tipos deprecated
- [ ] Sem `console.error` relacionados a status
- [ ] Transições de status sempre bem-sucedidas

### 🗄️ Cenário 11: Verificação de Banco de Dados

**Após completar um fluxo completo:**

1. Acessar Supabase Dashboard
2. Ir para **Table Editor → service_requests**
3. Verificar registro de teste

**Validações:**

- [ ] Coluna `status` contém apenas valores do novo sistema
- [ ] Campos `quote_*` estão `null` ou vazios (não mais usados)
- [ ] Timestamps preenchidos corretamente:
  - `created_at`
  - `execution_date`
  - `work_start_time`
  - `work_end_time`
  - `payment_date`
  - `finished_at`
- [ ] `professional_id` preenchido após atribuição
- [ ] `payment_amount` e `payment_method` preenchidos após pagamento

---

## 📈 Métricas de Sucesso

### ✅ Critérios de Aceitação da Fase 8

Para considerar a Fase 8 **COMPLETA**, todos os itens abaixo devem ser ✅:

#### Funcionalidades Core

- [ ] **Criar solicitação** → Status "Solicitado" ✅
- [ ] **Atribuir profissional** → Status "Atribuído" ✅
- [ ] **Aceitar trabalho** → Status "Aceito" ✅
- [ ] **Recusar trabalho** → Status "Recusado" ✅
- [ ] **Agendar data** → Status "Data Definida" ✅
- [ ] **Iniciar trabalho** → Status "Em Progresso" ✅
- [ ] **Concluir trabalho** → Status "Aguardando Finalização" ✅
- [ ] **Registrar pagamento** → Status "Pagamento Feito" ✅
- [ ] **Finalizar** → Status "Concluído" ✅
- [ ] **Cancelar (qualquer fase)** → Status "Cancelado" ✅

#### Integridade de Dados

- [ ] **0** status deprecated encontrados
- [ ] **100%** registros com status do novo sistema
- [ ] **0** erros de build TypeScript
- [ ] **0** erros de console em runtime

#### UI/UX

- [ ] Workflow timeline exibe 4 fases corretamente
- [ ] Cores e ícones consistentes
- [ ] Textos em português (i18n)
- [ ] Responsividade mantida
- [ ] Sem componentes de orçamento visíveis

#### Testes Manuais

- [ ] Pelo menos **1 fluxo completo** executado (Solicitado → Concluído)
- [ ] Pelo menos **1 cancelamento** testado
- [ ] Pelo menos **1 recusa** testada (opcional)
- [ ] Dashboard admin e profissional validados

---

## 🐛 Registro de Problemas Encontrados

**Use esta seção para documentar bugs ou inconsistências:**

### Problema 1: [Descrever]

- **Cenário:**
- **Passos para reproduzir:**
- **Resultado esperado:**
- **Resultado obtido:**
- **Severidade:** Crítico / Alto / Médio / Baixo
- **Status:** Pendente / Corrigido

### Problema 2: [Descrever]

- ...

---

## ✅ Checklist Final

Antes de considerar a migração **100% COMPLETA**:

- [ ] Todas as 8 fases concluídas (1-7: ✅, 8: ⏳)
- [ ] Build compilando sem erros (`npm run build`)
- [ ] Aplicação rodando sem erros (`npm start`)
- [ ] Todos os cenários de teste executados
- [ ] Métricas de sucesso atingidas (0 status deprecated, 100% funcional)
- [ ] Documentação atualizada (PLANO_MIGRACAO_STATUS.md)
- [ ] Código deprecated removido (Fase 7 completa)
- [ ] Base de dados migrada (Fase 6 completa, COMMIT confirmado)

---

## 🚀 Próximos Passos Pós-Teste

Após validar a Fase 8:

1. **Commit final:**

   ```bash
   git add .
   git commit -m "✅ Fase 8 completa: Testes end-to-end validados - Sistema de 11 status 100% funcional"
   git push origin main
   ```

2. **Deploy para produção:**

   - Fazer backup da base de dados de produção
   - Executar `migrate_status_to_new_system.sql` em produção
   - Deploy da aplicação atualizada
   - Monitorar logs pós-deploy

3. **Monitoramento:**

   - Acompanhar uso em produção nas primeiras 48h
   - Validar que não há regressões
   - Coletar feedback de usuários (admin e profissionais)

4. **Limpeza final:**
   - Remover scripts temporários de migração
   - Arquivar documentação de migração
   - Atualizar README com novo sistema de status

---

## 📞 Suporte

Em caso de problemas durante os testes:

1. Verificar console do navegador (F12)
2. Verificar logs do terminal (`npm start`)
3. Consultar `PLANO_MIGRACAO_STATUS.md` para detalhes da migração
4. Revisar commits das Fases 1-7

**Boa sorte nos testes! 🎉**

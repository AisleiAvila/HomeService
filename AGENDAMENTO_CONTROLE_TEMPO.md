# Sistema de Agendamento e Controle de Tempo - HomeService

## 📋 Visão Geral

Este documento descreve a implementação do sistema de agendamento e controle de tempo para a aplicação HomeService. O sistema permite um controle completo do ciclo de vida temporal dos serviços, desde a solicitação inicial até a conclusão real.

## 🔧 Funcionalidades Implementadas

### 1. **Campos de Controle de Tempo**

#### **Data e Hora Solicitada** (`requested_datetime`)

- **Responsável**: Cliente
- **Descrição**: Data e hora em que o cliente gostaria que o serviço fosse realizado
- **Quando é preenchido**: Durante a criação do pedido de serviço
- **Campo na BD**: `requested_datetime` (TIMESTAMP WITH TIME ZONE)

#### **Data e Hora Agendada** (`scheduled_start_datetime`)

- **Responsável**: Administrador
- **Descrição**: Data e hora oficial agendada para o início do atendimento
- **Quando é preenchido**: Quando o administrador agenda o serviço
- **Campo na BD**: `scheduled_start_datetime` (TIMESTAMP WITH TIME ZONE)

#### **Previsão de Duração** (`estimated_duration_minutes`)

- **Responsável**: Administrador
- **Descrição**: Estimativa em minutos de quanto tempo o serviço deve demorar
- **Quando é preenchido**: Durante o agendamento pelo administrador
- **Campo na BD**: `estimated_duration_minutes` (INTEGER)

#### **Data e Hora Real de Início** (`actual_start_datetime`)

- **Responsável**: Profissional
- **Descrição**: Momento exato em que o profissional iniciou o atendimento
- **Quando é preenchido**: Quando o profissional clica em "Iniciar Trabalho"
- **Campo na BD**: `actual_start_datetime` (TIMESTAMP WITH TIME ZONE)

#### **Data e Hora Real do Final** (`actual_end_datetime`)

- **Responsável**: Profissional
- **Descrição**: Momento exato em que o profissional finalizou o atendimento
- **Quando é preenchido**: Quando o profissional clica em "Finalizar Trabalho"
- **Campo na BD**: `actual_end_datetime` (TIMESTAMP WITH TIME ZONE)

## 🎯 Fluxo de Uso

### **Para Clientes**

1. Ao criar um pedido de serviço, pode especificar a data/hora desejada
2. Pode visualizar o status do agendamento nos detalhes do pedido
3. Recebe informações sobre quando o serviço está agendado para começar

### **Para Administradores**

1. Acessa a lista de pedidos pendentes de agendamento
2. Utiliza o componente de agendamento para:
   - Selecionar um profissional qualificado
   - Definir data e hora de início
   - Estimar duração do serviço
3. Pode visualizar relatórios completos de tempo e produtividade
4. Monitora serviços atrasados e agendados para hoje

### **Para Profissionais**

1. Vê os serviços agendados para si
2. Quando chega ao local, clica em "Iniciar Trabalho"
3. O status automaticamente muda para "In Progress"
4. Quando termina, clica em "Finalizar Trabalho"
5. O status automaticamente muda para "Completed"

## 📊 Componentes Criados

### **TimeControlComponent**

- **Localização**: `src/components/time-control/`
- **Responsabilidade**: Interface para profissionais controlarem início/fim do trabalho
- **Funcionalidades**:
  - Exibe informações de agendamento
  - Botões para iniciar/finalizar trabalho
  - Cálculo automático de duração real
  - Comparação com tempo estimado

### **SchedulingFormComponent**

- **Localização**: `src/components/scheduling-form/`
- **Responsabilidade**: Interface para administradores agendarem serviços
- **Funcionalidades**:
  - Seleção de profissional
  - Definição de data/hora
  - Estimativa de duração
  - Validação de disponibilidade

### **TimeReportsComponent**

- **Localização**: `src/components/time-reports/`
- **Responsabilidade**: Relatórios e análises de tempo para administradores
- **Funcionalidades**:
  - Estatísticas resumidas
  - Relatório de produtividade dos profissionais
  - Serviços agendados para hoje
  - Serviços atrasados
  - Exportação para CSV

## 🗄️ Alterações na Base de Dados

### **Script de Migração**

- **Arquivo**: `sql/18_add_scheduling_time_control.sql`
- **Execução**: Execute no painel SQL do Supabase

### **Novas Colunas Adicionadas**

```sql
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS requested_datetime TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS scheduled_start_datetime TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS actual_start_datetime TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS actual_end_datetime TIMESTAMP WITH TIME ZONE;
```

### **Funções Criadas**

- `calculate_actual_duration_minutes()`: Calcula duração real em minutos
- `get_scheduling_status()`: Determina status do agendamento
- `update_service_status_on_time_change()`: Trigger para atualização automática de status

### **View Criada**

- `vw_service_scheduling_report`: View consolidada para relatórios

## 🔧 Métodos Adicionados ao DataService

### **Controle de Agendamento**

- `updateRequestedDateTime()`: Atualiza data solicitada
- `scheduleServiceStart()`: Agenda início do serviço
- `updateEstimatedDuration()`: Atualiza previsão de duração

### **Controle de Execução**

- `startServiceWork()`: Registra início do trabalho
- `finishServiceWork()`: Registra fim do trabalho

### **Cálculos e Relatórios**

- `calculateActualDuration()`: Calcula duração real
- `calculateDurationVariance()`: Calcula variação vs estimado
- `getSchedulingStatus()`: Determina status do agendamento
- `getTodayScheduledRequests()`: Pedidos agendados para hoje
- `getDelayedRequests()`: Pedidos atrasados
- `getProfessionalProductivityReport()`: Relatório de produtividade

## 📱 Interfaces de Usuário

### **Para o Cliente**

- Formulário de criação de pedido inclui campo de data/hora desejada
- Detalhes do pedido mostram informações de agendamento
- Component TimeControl é visível mas sem ações (apenas informativo)

### **Para o Profissional**

- Component TimeControl nos detalhes do pedido com botões ativos
- Lista de serviços mostra status de agendamento
- Indicadores visuais para serviços agendados para hoje

### **Para o Administrador**

- Componente de agendamento acessível em pedidos aprovados
- Relatórios completos de tempo na área administrativa
- Dashboard com alertas de serviços atrasados
- Estatísticas de produtividade dos profissionais

## 📈 Status de Agendamento

O sistema define automaticamente os seguintes status:

1. **Pending**: Pedido criado, sem agendamento
2. **Awaiting Schedule**: Tem data solicitada, mas não agendada
3. **Scheduled**: Agendado para o futuro
4. **Scheduled Today**: Agendado para hoje
5. **Delayed**: Passou da hora agendada sem iniciar
6. **In Progress**: Trabalho iniciado, não finalizado
7. **Completed**: Trabalho finalizado

## 🔄 Automações Implementadas

### **Triggers de Base de Dados**

- Atualização automática de status quando horários são registrados
- Validações de consistência temporal

### **Atualizações Automáticas de Status**

- "In Progress" quando `actual_start_datetime` é preenchido
- "Completed" quando `actual_end_datetime` é preenchido

## 📊 Métricas e KPIs

### **Para Administradores**

- Taxa de conclusão de serviços
- Percentagem de serviços no horário
- Duração média real vs estimada
- Produtividade por profissional

### **Para Profissionais**

- Serviços concluídos
- Duração média dos atendimentos
- Percentagem de pontualidade

## 🚀 Próximos Passos Sugeridos

1. **Notificações Automáticas**

   - SMS/Email quando serviço está próximo da hora agendada
   - Alertas para administradores sobre atrasos

2. **Calendário Visual**

   - Interface de calendário para agendamentos
   - Visualização de disponibilidade dos profissionais

3. **Análise Avançada**

   - Gráficos de tendências temporais
   - Previsão de demanda por horário/dia

4. **App Móvel**
   - Aplicação específica para profissionais
   - Check-in geolocalizado

## 🔧 Como Executar a Migração

### **Passo 1: Diagnóstico**

Primeiro, execute o script de diagnóstico para verificar a estrutura atual:

```bash
# No painel SQL do Supabase, execute:
sql/00_diagnostic_check.sql
```

### **Passo 2: Escolha o Script Correto**

Com base no resultado do diagnóstico:

#### **Se usar tabela 'users':**

```bash
sql/18_add_scheduling_time_control.sql
```

#### **Se usar tabela 'profiles' (padrão Supabase):**

```bash
sql/18_add_scheduling_time_control_profiles.sql
```

### **Passo 3: Verificação Pós-Migração**

Execute o script de verificação para confirmar que tudo funcionou:

```bash
sql/19_post_migration_check.sql
```

### **Passo 4: Testes Manuais (Opcional)**

Se quiser testar manualmente, execute estas consultas:

```sql
-- Verificar se as colunas foram criadas
SELECT column_name FROM information_schema.columns
WHERE table_name = 'service_requests'
AND column_name IN ('requested_datetime', 'scheduled_start_datetime', 'estimated_duration_minutes', 'actual_start_datetime', 'actual_end_datetime');

-- Testar a view
SELECT * FROM vw_service_scheduling_report LIMIT 3;

-- Testar as funções
SELECT calculate_actual_duration_minutes(NOW() - INTERVAL '2 hours', NOW());
```

## ⚠️ Troubleshooting

### **Erro: "column sr.client_name does not exist"**

- **Causa**: A view está tentando acessar colunas que não existem fisicamente na tabela
- **Solução**: Use o script alternativo `18_add_scheduling_time_control_profiles.sql` ou verifique se a tabela de usuários se chama 'users' ou 'profiles'

### **Erro: "relation 'users' does not exist"**

- **Causa**: A tabela de usuários pode se chamar 'profiles' em sistemas Supabase
- **Solução**: Use o script `18_add_scheduling_time_control_profiles.sql`

### **Erro: "column 'created_at' does not exist"**

- **Causa**: Algumas tabelas podem não ter campos de auditoria padrão
- **Solução**: Os scripts incluem `COALESCE` para lidar com campos opcionais

### **Como verificar o nome correto da tabela de usuários:**

```sql
-- Execute no Supabase para verificar as tabelas disponíveis
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('users', 'profiles');
```

### **Validação de dados**:

- Script inclui migração de dados existentes
- Compatibilidade com campos antigos mantida

## 📞 Suporte

Para dúvidas sobre a implementação, consulte:

- Código dos componentes em `src/components/`
- Documentação das funções em `src/services/data.service.ts`
- Script de migração em `sql/18_add_scheduling_time_control.sql`

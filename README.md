# HomeService Pro - Sistema de Gestão de Serviços Domésticos

Uma aplicação Angular moderna para conectar clientes a profissionais de serviços domésticos, com sistema completo de notificações e internacionalização.

## 🎯 Funcionalidades Principais

### 👥 Gestão de Usuários

- **Três tipos de usuários**: Cliente, Profissional, Administrador
- **Sistema de autenticação** com Supabase
- **Verificação por email** para novos usuários
- **Aprovação de profissionais** pelo administrador

### 📋 Gestão de Solicitações

- **Criação de solicitações** de serviço pelos clientes
- **Sistema de cotações** pelos profissionais
- **Aprovação/rejeição** de cotações pelos clientes
- **Agendamento** de serviços
- **Chat integrado** entre cliente e profissional
- **Rastreamento de status** em tempo real

### 💰 Sistema de Pagamentos

- **Gestão de status de pagamento**
- **Relatórios financeiros** para administradores
- **Exportação de dados** em CSV

### 🌐 Internacionalização

- **Suporte completo** para Português e Inglês
- **Troca de idioma** em tempo real
- **Todas as mensagens traduzidas**

## 🔔 Sistema de Notificações

A aplicação possui um sistema completo de notificações que informa sobre todas as mudanças importantes:

### 📊 Mudanças de Status de Solicitações

#### Status de Serviço:

- **Pending → Approved**: "Solicitação #{id} mudou status de 'Pending' para 'Approved'"
- **Pending → Cancelled**: "Solicitação #{id} mudou status de 'Pending' para 'Cancelled'"
- **Approved → Scheduled**: "Solicitação #{id} mudou status de 'Approved' para 'Scheduled'"
- **Scheduled → In Progress**: "Solicitação #{id} mudou status de 'Scheduled' para 'In Progress'"
- **In Progress → Completed**: "Solicitação #{id} mudou status de 'In Progress' para 'Completed'"

#### Status de Pagamento:

- **Unpaid → Paid**: "Solicitação #{id} mudou status de pagamento para 'Paid'"
- **Paid → Refunded**: "Solicitação #{id} mudou status de pagamento para 'Refunded'"

### 👨‍🔧 Gestão de Profissionais

#### Aprovação/Rejeição:

- **Aprovação**: "Profissional {nome} foi aprovado"
- **Rejeição**: "Profissional {nome} foi rejeitado"

### 💼 Ações Específicas de Negócio

#### Cotações:

- **Aprovação de cotação**: "Quote for '{título}' approved"
- **Rejeição de cotação**: "Quote for '{título}' rejected"

#### Agendamentos:

- **Agendamento realizado**: "Request #{id} scheduled successfully"

#### Pagamentos:

- **Pagamento processado**: "Payment for request #{id} processed"

### 🎨 Características das Notificações

- ✅ **Automáticas**: Geradas automaticamente para todas as mudanças
- ✅ **Traduzidas**: Disponíveis em português e inglês
- ✅ **Contextuais**: Mensagens específicas para cada tipo de ação
- ✅ **Temporárias**: Auto-removidas após 15 segundos
- ✅ **Visuais**: Indicador no header mostra notificações não lidas
- ✅ **Interativas**: Centro de notificações com controles de marcar como lida/limpar

### 🌍 Notificações Multilíngue

#### Português:

```
"Solicitação #123 mudou status de 'Pendente' para 'Aprovado'"
"Profissional João Silva foi aprovado"
"Cotação para 'Serviço de Reparo' aprovada"
```

#### Inglês:

```
"Request #123 status changed from 'Pending' to 'Approved'"
"Professional John Silva has been approved"
"Quote for 'Repair Service' approved"
```

## 🚀 Como Executar Localmente

**Pré-requisitos:** Node.js

1. **Instalar dependências:**

   ```bash
   npm install
   ```

2. **Configurar variáveis de ambiente:**

   - Configure o `GEMINI_API_KEY` no arquivo [.env.local](.env.local)
   - Configure as variáveis do Supabase

3. **Executar a aplicação:**

   ```bash
   npm run dev
   ```

4. **Build para produção:**
   ```bash
   npm run build
   ```

## 🏗️ Arquitetura Técnica

### Frontend:

- **Angular 18** com Standalone Components
- **TailwindCSS** para estilização
- **Signals** para gerenciamento de estado
- **TypeScript** para tipagem

### Backend:

- **Supabase** para autenticação e banco de dados
- **PostgreSQL** como banco de dados
- **Real-time subscriptions** para atualizações em tempo real

### Funcionalidades Avançadas:

- **PWA** (Progressive Web App) ready
- **Service Worker** para cache
- **Push Notifications** (preparado)
- **Responsive Design** para mobile e desktop

## 📱 Interface do Usuário

### Menu Lateral Retrátil:

- **Modo expandido**: Mostra ícones + texto
- **Modo retraído**: Apenas ícones com tooltips
- **Responsivo**: Adapta-se automaticamente a diferentes tamanhos de tela

### Centro de Notificações:

- **Badge visual**: Indica quantidade de notificações não lidas
- **Painel lateral**: Lista todas as notificações
- **Controles**: Marcar como lida, limpar todas
- **Auto-refresh**: Atualizações em tempo real

## 🎨 Temas e Acessibilidade

- **Contraste otimizado** para melhor legibilidade
- **Estados hover** bem definidos
- **Transições suaves** para melhor UX
- **Acessibilidade** seguindo diretrizes WCAG

---

**Desenvolvido com ❤️ usando Angular e Supabase**

View your app in AI Studio: https://ai.studio/apps/drive/1Ki06cblnCTkRmLm97gEoqfwl_nRXZtoB

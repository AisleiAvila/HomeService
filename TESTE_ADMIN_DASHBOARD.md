# Como Testar o Dashboard de Administrador

## 🔑 Credenciais de Teste

Para acessar o dashboard de administrador em modo de desenvolvimento, use:

**Email:** `admin@homeservice.com`  
**Senha:** `admin123`

## 📋 Dados de Teste Incluídos

O sistema agora inclui dados mock para demonstração:

### 👥 Usuários
- **1 Administrador**: Admin User (você)
- **1 Cliente**: John Doe
- **2 Profissionais**: 
  - Jane Smith (Pendente de aprovação)
  - Mike Johnson (Ativo)

### 🛠️ Solicitações de Serviço
- **5 solicitações** com diferentes status:
  - 2 Concluídas (1 paga, 1 não paga)
  - 1 Em andamento
  - 1 Pendente
  - 1 Cotada

## 🎯 Como Testar as Funcionalidades

### 1. **Login como Admin**
1. Acesse a aplicação
2. Clique em "Sign In"
3. Use as credenciais acima
4. Navegue para a aba "Admin" na sidebar

### 2. **Testar Abas do Dashboard**

#### **📊 Overview (Visão Geral)**
- Verifique as 4 estatísticas principais
- Veja a lista de ações pendentes
- Status: 1 profissional pendente, 1 solicitação pendente

#### **📋 Requests (Solicitações)**
- Visualize todas as 5 solicitações
- Teste fornecer cotação para solicitação pendente
- Teste atribuir profissional para solicitação aprovada

#### **✅ Approvals (Aprovações)**  
- Veja Jane Smith pendente de aprovação
- Teste aprovar ou rejeitar o profissional
- Observe as notificações

#### **💰 Finances (Finanças)**
- Veja estatísticas: 2 serviços concluídos, R$ 450 de receita
- Teste exportar relatório CSV
- Teste gerar fatura individual

#### **👥 Professionals (Profissionais)**
- Veja Mike Johnson (ativo)
- Teste adicionar novo profissional
- Teste editar especialidades

#### **🏷️ Categories (Categorias)**
- Veja 5 categorias pré-definidas
- Teste adicionar nova categoria
- Teste editar categoria existente (clique duplo)
- Teste excluir categoria

## 🔍 Debug e Troubleshooting

### Console do Browser
O componente agora inclui logs de debug. Abra as ferramentas de desenvolvedor (F12) e verifique:
- "AdminDashboardComponent initialized"
- Contadores de usuários e solicitações

### Informações de Debug na Tela
O template inclui uma barra amarela no topo com:
- View atual
- Número de usuários
- Número de solicitações

### Se o Dashboard Não Aparecer
1. Verifique se está logado como admin
2. Confirme se a aba "Admin" aparece na sidebar
3. Clique na aba "Admin"
4. Verifique o console para erros

## 🚀 Funcionalidades Testáveis

### ✅ Funcionando
- [x] Login como admin
- [x] Sistema de abas
- [x] Estatísticas em tempo real
- [x] Aprovação/rejeição de profissionais
- [x] Gerenciamento de categorias
- [x] Exportação CSV
- [x] Geração de faturas
- [x] Sistema de notificações
- [x] Internacionalização (troque o idioma)

### 🔄 Simulado (para desenvolvimento)
- [ ] Integração real com Supabase
- [ ] Upload de fotos
- [ ] Chat em tempo real
- [ ] Pagamentos reais

## 📱 Responsividade

Teste o dashboard em diferentes tamanhos de tela:
- Desktop (>1024px): Layout completo com 4 colunas
- Tablet (768-1024px): Layout adaptado
- Mobile (<768px): Layout empilhado

## 🌐 Internacionalização

Teste mudando o idioma:
1. Clique no seletor de idioma (canto superior direito)
2. Alterne entre English/Português
3. Observe todas as traduções sendo aplicadas
4. Verifique formatação de moeda ($ vs R$)

## 📈 Próximos Passos

Após testar o dashboard, você pode:
1. Conectar com banco de dados real
2. Implementar upload de imagens
3. Adicionar mais relatórios
4. Criar sistema de backup
5. Implementar histórico de ações

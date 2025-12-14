# Guia de Implementação do Sistema de Notificações In-App

## 📋 Resumo

Sistema completo de notificações in-app implementado para notificar profissionais sobre atribuições de serviços e outras ações relevantes.

## 🎯 Funcionalidades Implementadas

### 1. Backend (Base de Dados)

- ✅ Tabela `in_app_notifications` criada
- ✅ Índices para performance em consultas por usuário
- ✅ Suporte a metadados JSON para informações extras
- ✅ Campos: user_id, type, title, message, link, read, created_at, metadata

### 2. Serviço Angular

- ✅ `InAppNotificationService` com signals reativos
- ✅ Signal `notifications()` com lista de notificações
- ✅ Signal `unreadCount()` com contador de não lidas
- ✅ Método `loadNotifications()` para carregar notificações
- ✅ Método `createNotification()` para criar nova notificação
- ✅ Método `markAsRead()` para marcar como lida
- ✅ Método `markAllAsRead()` para marcar todas como lidas
- ✅ Método `deleteAllRead()` para deletar todas lidas
- ✅ Método `subscribeToNotifications()` para atualizações em tempo real via Supabase channels

### 3. Integração com Workflow

- ✅ `WorkflowServiceSimplified.notifyProfessional()` atualizado para criar notificação in-app
- ✅ Criação automática de notificação quando profissional é atribuído
- ✅ Link direto para detalhes da solicitação de serviço

### 4. Componente UI

- ✅ `NotificationsComponent` criado com ícone de sino
- ✅ Badge com contador de notificações não lidas
- ✅ Dropdown com lista de notificações
- ✅ Filtro para mostrar apenas não lidas
- ✅ Ações: marcar como lida, marcar todas, deletar lidas
- ✅ Navegação ao clicar na notificação
- ✅ Ícones diferentes por tipo de notificação
- ✅ Timestamps formatados (agora mesmo, 5m, 2h, 3d)
- ✅ Design responsivo com modo escuro

### 5. Internacionalização

- ✅ Traduções em português e inglês
- ✅ Chaves: notifications, markAllAsRead, deleteAllRead, noNotifications, unreadNotifications, showAll, markAsRead, justNow, newServiceAssignedTitle

## 📁 Arquivos Criados/Modificados

### Criados:

1. `scripts/add_in_app_notifications_table.sql` - Script SQL para criar tabela
2. `src/services/in-app-notification.service.ts` - Serviço de gerenciamento
3. `src/components/notifications/notifications.component.ts` - Componente TypeScript
4. `src/components/notifications/notifications.component.html` - Template
5. `src/components/notifications/notifications.component.css` - Estilos

### Modificados:

1. `src/models/maintenance.models.ts` - Interface `InAppNotification` adicionada
2. `src/services/workflow-simplified.service.ts` - Injeção do serviço e criação de notificações
3. `src/i18n.service.ts` - Traduções adicionadas

## 🚀 Como Integrar no App

### Passo 1: Executar Script SQL

Execute o script no Supabase SQL Editor:

\`\`\`bash

# Navegue até a pasta scripts

cd scripts

# Execute o script

psql -h your-supabase-host -U postgres -d postgres -f add_in_app_notifications_table.sql
\`\`\`

Ou copie e cole o conteúdo em Supabase Dashboard > SQL Editor.

### Passo 2: Adicionar Componente ao Header

Adicione o componente de notificações no cabeçalho da aplicação (geralmente em `app.component.html` ou componente de navegação):

\`\`\`html

<!-- No seu header/navbar -->
<header class="flex items-center justify-between p-4">
  <div class="flex items-center gap-4">
    <!-- Logo e outros elementos -->
  </div>
  
  <div class="flex items-center gap-4">
    <!-- Adicione o componente de notificações aqui -->
    <app-notifications></app-notifications>
    
    <!-- Outros elementos do header (perfil, logout, etc) -->
  </div>
</header>
\`\`\`

### Passo 3: Importar no Component

No componente onde você adicionou o `<app-notifications>`, importe-o:

\`\`\`typescript
import { NotificationsComponent } from './components/notifications/notifications.component';

@Component({
selector: 'app-root',
standalone: true,
imports: [
CommonModule,
// ... outros imports
NotificationsComponent, // Adicione aqui
],
// ...
})
export class AppComponent {
// ...
}
\`\`\`

### Passo 4: Inicializar Subscrição (Opcional)

O componente já inicializa a subscrição automaticamente no `ngOnInit()`, mas se quiser garantir que as notificações sejam carregadas logo após o login, você pode chamar explicitamente:

\`\`\`typescript
// Em algum componente após o login bem-sucedido
private notificationService = inject(InAppNotificationService);

async onLoginSuccess() {
await this.notificationService.loadNotifications();
this.notificationService.subscribeToNotifications();
}
\`\`\`

## 🔔 Tipos de Notificação Suportados

O sistema suporta diferentes tipos de notificação com ícones específicos:

- `service_assigned` 👷 - Serviço atribuído ao profissional
- `service_accepted` ✅ - Serviço aceito
- `service_scheduled` 📅 - Serviço agendado
- `service_completed` 🎉 - Serviço concluído
- `payment_received` 💰 - Pagamento recebido
- Padrão 🔔 - Outros tipos

## 📊 Fluxo de Notificação

1. **Admin atribui profissional**:

   - `WorkflowServiceSimplified.assignProfessional()` é chamado
   - `notifyProfessional()` cria notificação in-app
   - `InAppNotificationService.createNotification()` salva no banco
   - Notificação aparece em tempo real para o profissional

2. **Profissional vê notificação**:

   - Badge mostra contador de não lidas
   - Clica no sino para ver lista
   - Pode filtrar apenas não lidas
   - Clica na notificação para ver detalhes

3. **Profissional marca como lida**:

   - Clica no ícone de check
   - Ou clica na notificação (marca automaticamente)
   - Contador atualiza em tempo real

4. **Gerenciamento**:
   - "Marcar todas como lidas" - marca todas de uma vez
   - "Eliminar todas lidas" - remove notificações já lidas
   - "Mostrar todas" / "Notificações não lidas" - alterna filtro

## 🎨 Personalização

### Alterar Ícones

Edite o método `getNotificationIcon()` em `notifications.component.ts`:

\`\`\`typescript
getNotificationIcon(type: string): string {
switch (type) {
case 'seu_tipo_customizado':
return '🎯'; // Seu emoji
// ...
}
}
\`\`\`

### Alterar Estilo

Edite `notifications.component.css` ou adicione classes Tailwind no template.

### Adicionar Novos Tipos

1. Adicione o tipo em `src/models/maintenance.models.ts`:

\`\`\`typescript
export type NotificationType =
| 'service_assigned'
| 'service_accepted'
| 'seu_novo_tipo'; // Adicione aqui
\`\`\`

2. Adicione traduções em `i18n.service.ts`

3. Crie a notificação usando `InAppNotificationService.createNotification()`

## 🔄 Atualizações em Tempo Real

As notificações são atualizadas em tempo real usando Supabase Realtime:

- Quando uma nova notificação é criada, aparece automaticamente
- Quando uma notificação é marcada como lida, atualiza em todos os dispositivos
- Quando uma notificação é deletada, remove de todos os dispositivos

## 🧪 Testando

### Teste Manual:

1. Faça login como administrador
2. Atribua um profissional a uma solicitação
3. Faça logout e login como o profissional atribuído
4. Verifique se a notificação aparece com badge
5. Clique para abrir, verificar navegação e marcar como lida

### Criar Notificação de Teste:

\`\`\`typescript
// Em qualquer componente com acesso ao serviço
private notificationService = inject(InAppNotificationService);

async testNotification() {
await this.notificationService.createNotification(
userId, // ID do usuário que receberá
'service_assigned',
'Teste de Notificação',
'Esta é uma notificação de teste',
'/service-requests/123' // Link opcional
);
}
\`\`\`

## 📝 Notas Importantes

1. **Permissões**: O sistema usa segurança na camada da aplicação (não RLS), então verifique que apenas usuários autenticados podem criar/ler notificações.

2. **Performance**: A tabela tem índices em `user_id` e `read` para queries eficientes. Com muitas notificações, considere implementar paginação.

3. **Limpeza**: Implemente uma rotina para deletar notificações antigas (ex: mais de 30 dias e já lidas).

4. **Mobile**: O componente é responsivo, mas teste em dispositivos móveis para garantir boa UX.

5. **Acessibilidade**: O componente usa atributos ARIA adequados. Teste com leitores de tela.

## 🔮 Próximos Passos (Opcional)

- [ ] Som de notificação quando nova notificação chegar
- [ ] Push notifications para mobile (Capacitor)
- [ ] Preferências de notificação por usuário
- [ ] Agrupar notificações similares
- [ ] Marcar como lida ao rolar/visualizar
- [ ] Notificações por email (integrar com sistema existente)
- [ ] Dashboard de estatísticas de notificações

## ✅ Checklist de Implementação

- [ ] Executar `add_in_app_notifications_table.sql` no Supabase
- [ ] Adicionar `<app-notifications>` no header da aplicação
- [ ] Importar `NotificationsComponent` no componente pai
- [ ] Testar atribuição de profissional e recebimento de notificação
- [ ] Testar marcação como lida
- [ ] Testar filtros e ações em lote
- [ ] Testar em diferentes navegadores e dispositivos
- [ ] Verificar traduções em português e inglês

## 🐛 Troubleshooting

### Notificações não aparecem

- Verifique se o script SQL foi executado
- Verifique se o profissional tem `user_id` correto
- Verifique console do navegador para erros
- Verifique se `loadNotifications()` está sendo chamado

### Contador não atualiza

- Verifique se `subscribeToNotifications()` foi chamado
- Verifique configuração do Supabase Realtime
- Verifique console para erros de conexão WebSocket

### Notificação não navega

- Verifique se o `link` está correto
- Verifique se as rotas existem no Angular Router
- Verifique se `router.navigateByUrl()` está funcionando

---

**Implementação completa! 🎉**

O sistema de notificações in-app está pronto para uso. Profissionais serão notificados em tempo real quando serviços forem atribuídos a eles.

# Serviço de Envio de SMS - HomeService

## 📱 Visão Geral

O serviço de SMS da plataforma HomeService permite envio de mensagens de texto para usuários em português e inglês, utilizando a API Twilio para entrega confiável de mensagens.

## 🏗️ Arquitetura

### Frontend (Angular)

- **Serviço**: `src/services/sms.service.ts`
- **Modelos**: `src/models/maintenance.models.ts` (tipos SMS)
- **i18n**: `src/assets/sms-i18n.json`

### Backend (Node.js)

- **Endpoint**: `send-sms.cjs`
- **API**: Twilio Messages API
- **Porta**: 4001 (local) / Vercel (produção)

## 🔧 Configuração

### 1. Variáveis de Ambiente

Adicione ao arquivo `.env`:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### 2. Instalação de Dependências

```bash
# Instalar dependências do servidor SMS
npm install twilio express cors dotenv
```

### 3. Iniciar Servidor SMS

```bash
# Desenvolvimento
node send-sms.cjs

# Ou adicionar ao package.json:
"scripts": {
  "sms:server": "node send-sms.cjs"
}
```

## 📚 Uso do Serviço

### Exemplo Básico

```typescript
import { inject } from "@angular/core";
import { SmsService } from "./services/sms.service";

export class ExampleComponent {
  private smsService = inject(SmsService);

  async sendSimpleSms() {
    const response = await this.smsService.sendSms({
      to: "+351912345678",
      message: "Olá! Esta é uma mensagem de teste.",
    });

    if (response.success) {
      console.log("SMS enviado:", response.messageId);
    } else {
      console.error("Erro:", response.error);
    }
  }
}
```

### Envio com Template

```typescript
// Código de verificação
await this.smsService.sendVerificationCode(
  "+351912345678",
  "123456",
  5 // expira em 5 minutos
);

// Notificação de serviço
await this.smsService.sendServiceNotification(
  "+351912345678",
  "SR-001",
  "Concluído"
);

// Lembrete
await this.smsService.sendReminder(
  "+351912345678",
  "Reparação de Canalizações",
  "15/01/2024 às 14:00"
);
```

### Envio Customizado com Variáveis

```typescript
await this.smsService.sendSms({
  to: "+351912345678",
  template: "notification",
  variables: {
    requestId: "SR-123",
    status: "Em Progresso",
  },
});
```

## 📋 Templates Disponíveis

### 1. Verificação (`verification`)

**Variáveis**: `code`, `expiresIn`

**PT**: `HomeService: Seu código de verificação é {{code}}. Válido por {{expiresIn}} minutos.`

**EN**: `HomeService: Your verification code is {{code}}. Valid for {{expiresIn}} minutes.`

### 2. Notificação (`notification`)

**Variáveis**: `requestId`, `status`

**PT**: `HomeService: Atualização do pedido #{{requestId}}. Novo status: {{status}}.`

**EN**: `HomeService: Update on request #{{requestId}}. New status: {{status}}.`

### 3. Lembrete (`reminder`)

**Variáveis**: `serviceName`, `date`

**PT**: `HomeService: Lembrete - {{serviceName}} agendado para {{date}}.`

**EN**: `HomeService: Reminder - {{serviceName}} scheduled for {{date}}.`

## 🔍 API REST

### POST /api/send-sms

Envia um SMS.

**Request Body**:

```json
{
  "to": "+351912345678",
  "message": "Sua mensagem aqui",
  "template": "verification"
}
```

**Response Success**:

```json
{
  "success": true,
  "messageId": "SM...",
  "timestamp": "2024-01-01T12:00:00Z",
  "status": "queued",
  "segments": 1
}
```

**Response Error**:

```json
{
  "success": false,
  "error": "Descrição do erro",
  "code": 21211,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### GET /api/sms/status/:messageSid

Consulta o status de uma mensagem enviada.

**Response**:

```json
{
  "success": true,
  "messageId": "SM...",
  "status": "delivered",
  "to": "+351912345678",
  "from": "+1234567890",
  "dateSent": "2024-01-01T12:00:00Z",
  "dateUpdated": "2024-01-01T12:01:00Z"
}
```

### GET /api/sms/health

Verifica saúde do serviço SMS.

**Response**:

```json
{
  "status": "healthy",
  "configured": true,
  "clientReady": true,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## 📊 Signals e Estado

### isSending

Signal booleano que indica se um SMS está sendo enviado.

```typescript
const isSending = this.smsService.isSending();
```

### smsHistory

Signal com histórico dos últimos 50 SMS enviados.

```typescript
const history = this.smsService.smsHistory();
// Array de SmsHistory[]
```

## 🌍 Internacionalização

O serviço detecta automaticamente o idioma do usuário via `I18nService` e envia SMS no idioma apropriado:

- **Português (pt)**: Idioma padrão
- **Inglês (en)**: Alternativa

## ✅ Validações

### Formato de Telefone

- Obrigatório formato internacional: `+[código do país][número]`
- Exemplo válido: `+351912345678` (Portugal)
- Mínimo: 10 dígitos
- Máximo: 15 dígitos

### Tamanho da Mensagem

- Máximo: 1600 caracteres
- Caracteres especiais contam como múltiplos
- SMS é dividido em segmentos se necessário

## 🚨 Tratamento de Erros

### Erros Comuns Twilio

| Código | Erro               | Solução                         |
| ------ | ------------------ | ------------------------------- |
| 21211  | Número inválido    | Verificar formato internacional |
| 21408  | País não permitido | Configurar permissões Twilio    |
| 21610  | Número bloqueado   | Verificar lista de bloqueio     |

### Tratamento no Frontend

```typescript
const response = await this.smsService.sendSms({
  to: phone,
  message: message,
});

if (!response.success) {
  // NotificationService automaticamente mostra erro ao usuário
  console.error("Falha no envio:", response.error);
}
```

## 📈 Histórico e Rastreamento

### Adicionar ao Histórico

O serviço mantém automaticamente os últimos 50 SMS enviados.

### Limpar Histórico

```typescript
this.smsService.clearHistory();
```

### Atualizar Status

```typescript
this.smsService.updateSmsStatus("SM123456", "delivered");
```

## 🔐 Segurança

### CORS

Origens permitidas:

- `http://localhost:4200` (desenvolvimento)
- `https://home-service-nu.vercel.app` (produção)

### Variáveis Sensíveis

- **NUNCA** exponha credenciais Twilio no frontend
- Use variáveis de ambiente no backend
- Logs mascaram informações sensíveis

## 🧪 Testes

### Testar Configuração

```bash
curl http://localhost:4001/api/sms/health
```

### Enviar SMS de Teste

```bash
curl -X POST http://localhost:4001/api/send-sms \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+351912345678",
    "message": "Teste de SMS"
  }'
```

## 📦 Integração com Outros Serviços

### NotificationService

Feedback automático ao usuário sobre status de envio.

### I18nService

Detecção automática de idioma para templates.

### AuthService

Obter telefone do usuário autenticado.

### DataService

Acesso a dados de pedidos de serviço para notificações.

## 🎯 Casos de Uso

1. **Verificação de Telefone**: Código de 6 dígitos para validar número
2. **Notificações de Status**: Alertas sobre mudanças em pedidos
3. **Lembretes**: Avisos de serviços agendados
4. **Recuperação de Senha**: Código de reset por SMS
5. **Confirmação de Pagamento**: Notificação de pagamento recebido
6. **Atribuição de Serviço**: Aviso para profissional sobre novo trabalho

## 📝 Notas Importantes

- **Custo**: Cada SMS tem custo via Twilio (verificar planos)
- **Limite de Taxa**: Twilio tem limites de envio por segundo
- **Números Verificados**: Em modo sandbox, só envia para números verificados
- **Conformidade**: Respeitar leis de proteção de dados (GDPR)
- **Opt-out**: Usuários podem desativar notificações SMS

## 🔗 Recursos Adicionais

- [Documentação Twilio](https://www.twilio.com/docs/sms)
- [Padrões de SMS](https://www.twilio.com/docs/glossary/what-is-sms)
- [Twilio Console](https://console.twilio.com/)
- [Pricing Calculator](https://www.twilio.com/sms/pricing)

## 👨‍💻 Desenvolvimento

### Adicionar Novo Template

1. Editar `getSmsTemplates()` em `sms.service.ts`
2. Adicionar tradução em `sms-i18n.json`
3. Atualizar tipo `SmsTemplateType` em `maintenance.models.ts`

### Debug

O servidor SMS tem logs detalhados:

```
=== Nova requisição de SMS ===
Timestamp: 2024-01-01T12:00:00Z
Body recebido: {...}
→ Enviando SMS...
  Para: +351912345678
  De: +1234567890
  Mensagem: HomeService: Seu código...
✓ SMS enviado com sucesso!
  Message SID: SM123456
  Status: queued
```

## 🚀 Deploy

### Vercel

O endpoint pode ser deployado como Vercel Function:

```javascript
// api/send-sms.js
module.exports = require("../send-sms.cjs");
```

### Ambiente de Produção

Configure variáveis de ambiente no painel Vercel:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

---

**Versão**: 1.0.0  
**Última atualização**: Dezembro 2024  
**Autor**: HomeService Team

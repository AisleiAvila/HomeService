# 🚀 Quick Start - Serviço de SMS

## Configuração Rápida (5 minutos)

### 1️⃣ Criar Conta Twilio

1. Acesse: https://www.twilio.com/try-twilio
2. Crie uma conta gratuita
3. Verifique seu email e telefone

### 2️⃣ Obter Credenciais

No [Twilio Console](https://console.twilio.com/):

1. **Account SID**: Copie da dashboard principal
2. **Auth Token**: Clique em "Show" para revelar
3. **Número de Telefone**:
   - Vá para "Phone Numbers" → "Manage" → "Buy a number"
   - Ou use número de teste (sandbox) para development

### 3️⃣ Configurar Variáveis de Ambiente

Copie `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite `.env` e adicione suas credenciais:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
```

### 4️⃣ Instalar Dependências

```bash
npm install twilio express cors dotenv axios
```

### 5️⃣ Iniciar Servidor SMS

```bash
node send-sms.cjs
```

Você verá:

```
=== Configuração Twilio SMS ===
TWILIO_ACCOUNT_SID: ACxxxxxxxx... (tamanho: 34)
TWILIO_AUTH_TOKEN: xxxxxxxxxx... (tamanho: 32)
TWILIO_PHONE_NUMBER: +15551234567
✓ Cliente Twilio inicializado com sucesso
================================
🚀 Servidor SMS rodando na porta 4001
================================
```

### 6️⃣ Testar Serviço

```bash
# Teste com seu número
node test-sms.cjs +351912345678

# Ou teste apenas health check
curl http://localhost:4001/api/sms/health
```

## 📱 Modo Sandbox (Desenvolvimento)

No modo sandbox do Twilio:

- ✅ GRÁTIS para testar
- ⚠️ Só envia para números verificados
- 📝 Verificar número: Twilio Console → "Verified Caller IDs"

## 💰 Custos

| Região   | Custo por SMS |
| -------- | ------------- |
| Portugal | ~€0.06        |
| Brasil   | ~€0.02        |
| EUA      | ~$0.0075      |

💡 **Dica**: Conta trial do Twilio inclui $15 de crédito grátis!

## 🧪 Teste Rápido via cURL

```bash
# Enviar SMS de teste
curl -X POST http://localhost:4001/api/send-sms \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+351912345678",
    "message": "Teste do HomeService SMS!"
  }'
```

## 🔧 Uso no Angular

```typescript
import { inject } from "@angular/core";
import { SmsService } from "./services/sms.service";

export class MyComponent {
  private smsService = inject(SmsService);

  async sendSms() {
    await this.smsService.sendSms({
      to: "+351912345678",
      message: "Olá do HomeService!",
    });
  }
}
```

## ❗ Troubleshooting

### Erro: "Cliente Twilio não inicializado"

- ✅ Verificar se `.env` existe e tem as credenciais
- ✅ Reiniciar servidor: `node send-sms.cjs`

### Erro: "Número de telefone inválido"

- ✅ Usar formato internacional: `+[código][número]`
- ✅ Portugal: `+351912345678`
- ✅ Brasil: `+5511987654321`

### Erro: "Permission to send to this country"

- ✅ Em modo sandbox, verificar número no Twilio Console
- ✅ Ou ativar país nas configurações Twilio

### Erro: "ECONNREFUSED"

- ✅ Servidor não está rodando
- ✅ Execute: `node send-sms.cjs`

## 📚 Próximos Passos

1. ✅ Ler documentação completa: `SMS_SERVICE_DOCUMENTATION.md`
2. ✅ Configurar templates em `sms-i18n.json`
3. ✅ Integrar com componentes Angular
4. ✅ Deploy no Vercel (configurar env vars)

## 🔗 Links Úteis

- [Twilio Console](https://console.twilio.com/)
- [Twilio Docs](https://www.twilio.com/docs/sms)
- [Pricing Calculator](https://www.twilio.com/sms/pricing)
- [Verificar Números](https://console.twilio.com/verified-caller-ids)

---

**Dúvidas?** Consulte `SMS_SERVICE_DOCUMENTATION.md` para detalhes completos.

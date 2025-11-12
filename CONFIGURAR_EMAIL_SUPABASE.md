# 📧 Guia de Configuração de E-mail no Supabase

## 🚨 Problema Identificado

O código está funcionando perfeitamente, mas **o e-mail não está sendo enviado**. Isso acontece porque o Supabase precisa de configuração SMTP para enviar e-mails reais.

## 📋 Checklist de Configuração

### Passo 1: Acesse o Dashboard do Supabase

1. Abra: https://supabase.com/dashboard/project/uqrvenlkquheajuveggv
2. Faça login na sua conta Supabase

### Passo 2: Verifique as Configurações de Authentication

#### 2.1 Email Confirmations

1. Vá para: **Authentication** > **Settings**
2. Role até **Email Authentication Settings**
3. Verifique se está marcado:
   - ✅ **Enable email confirmations** (DEVE ESTAR MARCADO)
   - ❌ **Enable email autoconfirm** (DEVE ESTAR DESMARCADO)

Se "Enable email autoconfirm" estiver marcado, DESMARQUE e salve.

#### 2.2 SMTP Configuration

**IMPORTANTE:** O Supabase por padrão usa um serviço de e-mail limitado para testes. Para produção, você precisa configurar seu próprio SMTP.

1. No mesmo menu **Authentication** > **Settings**
2. Role até **SMTP Settings** ou **Email Provider Settings**
3. Você verá uma das seguintes situações:

##### Opção A: Usando Supabase Email (Padrão)
```
Provider: Supabase Email Service
Status: Limited (para testes)
```

**Limitações:**
- Pode haver atrasos
- E-mails podem ir para spam
- Limite de envios por hora

##### Opção B: Configurar SMTP Personalizado
```
Provider: Custom SMTP
```

Para configurar SMTP personalizado, você precisa:

### Passo 3: Configurar SMTP (Recomendado para Produção)

#### Opções de Provedores SMTP Gratuitos:

##### A) Gmail SMTP (Mais Fácil para Testes)

1. No Supabase, vá para **Settings** > **Authentication**
2. Role até **SMTP Settings**
3. Clique em **Enable Custom SMTP**
4. Preencha:
   ```
   SMTP Host: smtp.gmail.com
   SMTP Port: 587
   SMTP User: seu-email@gmail.com
   SMTP Password: [App Password - veja abaixo como gerar]
   Sender Email: seu-email@gmail.com
   Sender Name: HomeService
   ```

**Como gerar App Password do Gmail:**
1. Acesse: https://myaccount.google.com/security
2. Ative "Verificação em duas etapas" (se não estiver ativa)
3. Vá em "Senhas de app"
4. Selecione "E-mail" e "Outro"
5. Digite "Supabase HomeService"
6. Copie a senha gerada (16 caracteres)
7. Cole no campo "SMTP Password" do Supabase

##### B) SendGrid (Recomendado para Produção)

1. Crie conta grátis: https://sendgrid.com (até 100 e-mails/dia grátis)
2. Crie uma API Key
3. No Supabase, configure:
   ```
   SMTP Host: smtp.sendgrid.net
   SMTP Port: 587
   SMTP User: apikey
   SMTP Password: [sua API Key do SendGrid]
   Sender Email: noreply@seudominio.com
   Sender Name: HomeService
   ```

##### C) Mailtrap (Apenas para Testes)

Se você quer testar sem enviar e-mails reais:

1. Crie conta: https://mailtrap.io
2. Vá em "Email Testing" > "Inboxes"
3. Copie as credenciais SMTP
4. No Supabase, configure:
   ```
   SMTP Host: smtp.mailtrap.io
   SMTP Port: 2525
   SMTP User: [seu username do Mailtrap]
   SMTP Password: [sua password do Mailtrap]
   Sender Email: noreply@homeservice.com
   Sender Name: HomeService
   ```

Com Mailtrap, os e-mails não vão para a caixa de entrada real, mas você pode visualizá-los na interface do Mailtrap.

### Passo 4: Testar a Configuração

Depois de configurar o SMTP:

1. Salve as configurações no Supabase
2. Aguarde 1-2 minutos
3. Execute o teste novamente:
   ```bash
   node test-email-config.js
   ```

4. Ou tente cadastrar um novo profissional pela aplicação
5. Verifique se o e-mail chegou

### Passo 5: Verificar Email Templates

1. No Supabase, vá para **Authentication** > **Email Templates**
2. Verifique os templates:
   - **Confirm signup** - usado para verificação de cadastro
   - **Magic Link** - usado para login sem senha (OTP)
   
3. Certifique-se que os templates estão habilitados e configurados

## 🔍 Diagnóstico Rápido

### Se você está em DESENVOLVIMENTO (testes):

**Opção Rápida: Use Mailtrap**
- ✅ Grátis
- ✅ Fácil de configurar
- ✅ Visualiza e-mails sem enviar de verdade
- ✅ Ideal para desenvolvimento

### Se você está em PRODUÇÃO:

**Opção Recomendada: SendGrid ou Gmail**
- ✅ SendGrid: 100 e-mails/dia grátis, escalável
- ✅ Gmail: Fácil de configurar, mas com limites
- ✅ E-mails chegam na caixa de entrada real

## ⚡ Solução Rápida Temporária

Se você quer testar AGORA sem configurar SMTP:

### Usar Magic Link ao invés de OTP

O Supabase pode enviar um link mágico que não precisa de código:

Modifique temporariamente o código para usar `signUp` tradicional:

```typescript
// TEMPORÁRIO - apenas para teste
const { error } = await this.supabase.client.auth.signUp({
  email,
  password: 'TemporaryPassword123!', // Senha temporária
  options: {
    data: { name, role: 'professional' }
  }
});
```

Mas isso **NÃO é recomendado** para produção.

## 📊 Status Atual do Seu Projeto

Baseado nos logs:
- ✅ Código funcionando
- ✅ Usuário criado no Supabase
- ✅ OTP enviado sem erros
- ❌ E-mail não configurado/chegando

**Próxima ação:** Configurar SMTP no Supabase seguindo os passos acima.

## 🆘 Troubleshooting

### E-mail não chega mesmo depois de configurar SMTP

1. **Verifique SPAM** - Sempre olhe a pasta de spam primeiro
2. **Aguarde 2-5 minutos** - Pode haver atraso
3. **Tente outro e-mail** - Teste com Gmail, Outlook, etc.
4. **Verifique logs do Supabase** - Authentication > Logs
5. **Teste o SMTP** - Use Mailtrap para garantir que está funcionando

### E-mail vai para SPAM

1. **Configure SPF/DKIM** - Necessário para produção
2. **Use domínio próprio** - Ao invés de gmail.com
3. **Use SendGrid ou serviço profissional** - Melhor deliverability

### Rate Limit

Se aparecer erro "rate limit":
- Aguarde 5-10 minutos
- Limite: ~3-5 tentativas por e-mail a cada 5 minutos

## 📞 Suporte

Se precisar de ajuda:
1. Compartilhe screenshot das configurações do Supabase
2. Compartilhe logs do console
3. Informe qual provedor SMTP está usando

---

## ✅ Checklist Final

Antes de testar novamente:

- [ ] SMTP configurado no Supabase
- [ ] "Enable email confirmations" marcado
- [ ] "Enable email autoconfirm" desmarcado
- [ ] Email templates configurados
- [ ] Aguardou 2 minutos após salvar configurações
- [ ] Testou com e-mail real (Gmail, Outlook, etc.)
- [ ] Verificou pasta de SPAM

**Depois de configurar, teste novamente e me avise o resultado!** 🚀

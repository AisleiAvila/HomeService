# Configuração de E-mail para Desenvolvimento

## Configuração do Mailtrap no Supabase

Durante o desenvolvimento, todos os e-mails são redirecionados para o **Mailtrap** para teste e desenvolvimento.

### Passos para Configurar:

#### 1. Acesse o Painel do Supabase

- Vá para [supabase.com](https://supabase.com)
- Faça login e selecione o projeto
- Navegue para **Authentication** → **Settings** → **SMTP Settings**

#### 2. Configure o SMTP Customizado

Marque **"Enable custom SMTP"** e configure:

```
Host: sandbox.smtp.mailtrap.io
Port: 2525
Username: 32ad8ec403ead9
Password: e56c2fadbb0295

Sender Email: no-reply@homeflow.com
Sender Name: HomeFlow
```

#### 3. Configuração de URLs de Redirecionamento

No mesmo painel, configure:

- **Site URL**: `http://localhost:4200`
- **Redirect URLs**: `http://localhost:4200/**`

### Templates de E-mail Suportados

O Supabase enviará automaticamente e-mails para os seguintes eventos:

1. **Confirmação de Registro** (Signup Confirmation)

   - Enviado quando um novo usuário se registra
   - Contém link ou código OTP para verificação

2. **Recuperação de Senha** (Password Recovery)

   - Enviado quando usuário solicita reset de senha
   - Contém link para redefinir senha

3. **Mudança de E-mail** (Email Change)

   - Enviado quando usuário altera o e-mail
   - Contém link para confirmar novo e-mail

4. **Convite de Usuário** (User Invite)
   - Enviado quando admin convida novo usuário
   - Contém link para aceitar convite

### Acessando os E-mails no Mailtrap

1. Acesse [mailtrap.io](https://mailtrap.io)
2. Faça login na sua conta
3. Vá para **Email Sandbox**
4. Todos os e-mails enviados pela aplicação aparecerão aqui

### Variáveis Disponíveis nos Templates

O Supabase disponibiliza as seguintes variáveis nos templates de e-mail:

- `{{ .ConfirmationURL }}` - Link de confirmação completo
- `{{ .Token }}` - Token/código OTP de 6 dígitos
- `{{ .Email }}` - E-mail do usuário
- `{{ .Data.name }}` - Nome do usuário (se fornecido)
- `{{ .SiteURL }}` - URL base do site

### Testando o Envio de E-mails

Para testar se a configuração está funcionando:

1. **Teste de Registro**:

   - Registre um novo usuário na aplicação
   - Verifique se o e-mail aparece no Mailtrap

2. **Teste de Recovery**:

   - Use a função "Esqueci minha senha"
   - Verifique se o e-mail de recuperação aparece no Mailtrap

3. **Teste de Convite** (se disponível):
   - Use o painel admin para convidar um usuário
   - Verifique se o e-mail de convite aparece no Mailtrap

### Problemas Comuns

#### E-mails não estão sendo enviados

1. Verifique se o SMTP customizado está habilitado no Supabase
2. Confirme as credenciais do Mailtrap
3. Verifique os logs no painel do Supabase em **Authentication** → **Logs**

#### E-mails chegam mas links não funcionam

1. Verifique se a **Site URL** está configurada corretamente
2. Confirme se as **Redirect URLs** incluem o domínio local

#### Erro de template

1. Verifique se os templates de e-mail estão configurados corretamente
2. Use as variáveis padrão do Supabase nos templates

### Produção

⚠️ **IMPORTANTE**: Lembre-se de configurar um provedor SMTP real para produção (Gmail, SendGrid, AWS SES, etc.) e remover as configurações do Mailtrap.

# 📧 Configuração de Templates de E-mail - HomeFlow

## ✨ Sobre os Templates

Foram criados templates HTML personalizados baseados no modelo fornecido para melhorar a aparência dos e-mails enviados pela aplicação. Os templates seguem o design profissional do HomeFlow com:

- Design responsivo e moderno
- Cores da marca (azul para confirmação, vermelho para recuperação)
- Estrutura bem organizada com seções
- Ícones e elementos visuais
- Informações claras e instruções passo-a-passo

## 📁 Templates Criados

### 1. `signup-confirmation.html`

- **Usado para**: Confirmação de e-mail de novos usuários
- **Variáveis**: `{{ .Data.name }}`, `{{ .Email }}`, `{{ .ConfirmationURL }}`, `{{ .Token }}`
- **Cor primária**: Azul (#2563eb)

### 2. `password-recovery.html`

- **Usado para**: Recuperação de senha
- **Variáveis**: `{{ .Email }}`, `{{ .ConfirmationURL }}`
- **Cor primária**: Vermelho (#dc2626)

## 🔧 Como Configurar no Supabase

### Passo 1: Acessar o Painel do Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Faça login e selecione seu projeto
3. Navegue para **Authentication** → **Settings** → **Email Templates**

### Passo 2: Configurar Template de Confirmação

1. **Encontre a seção "Confirm signup"**
2. **Clique em "Edit template"**
3. **Substitua o conteúdo** pelo código do arquivo `signup-confirmation.html`
4. **Clique em "Save"**

### Passo 3: Configurar Template de Recuperação

1. **Encontre a seção "Reset password"**
2. **Clique em "Edit template"**
3. **Substitua o conteúdo** pelo código do arquivo `password-recovery.html`
4. **Clique em "Save"**

### Passo 4: Configurar Assunto dos E-mails

#### Para Confirmação de Cadastro:

```
Assunto: Confirmação de E-mail - HomeFlow
```

#### Para Recuperação de Senha:

```
Assunto: Recuperação de Senha - HomeFlow
```

## 📋 Variáveis Disponíveis

### Templates de Confirmação:

- `{{ .Data.name }}` - Nome do usuário (se fornecido no registro)
- `{{ .Email }}` - E-mail do usuário
- `{{ .ConfirmationURL }}` - Link de confirmação completo
- `{{ .Token }}` - Código OTP de 6 dígitos (se habilitado)
- `{{ .SiteURL }}` - URL base do site

### Templates de Recuperação:

- `{{ .Email }}` - E-mail do usuário
- `{{ .ConfirmationURL }}` - Link para redefinir senha
- `{{ .SiteURL }}` - URL base do site

## ⚙️ Configurações Importantes

### SMTP (já configurado):

```
Host: sandbox.smtp.mailtrap.io
Port: 2525
Sender: HomeFlow <no-reply@homeflow.com>
```

### URLs de Redirecionamento:

```
Site URL: http://localhost:4200
Redirect URLs: http://localhost:4200/**
```

## 🧪 Como Testar

### Teste 1: Confirmação de E-mail

1. Registre um novo usuário na aplicação
2. Verifique o e-mail no [Mailtrap](https://mailtrap.io)
3. Confirme se o design está aplicado

### Teste 2: Recuperação de Senha

1. Use "Esqueci minha senha" na aplicação
2. Verifique o e-mail no [Mailtrap](https://mailtrap.io)
3. Confirme se o design está aplicado

## 🎨 Personalização

### Cores da Marca:

- **Azul principal**: #2563eb
- **Azul escuro**: #1d4ed8
- **Vermelho**: #dc2626
- **Vermelho escuro**: #b91c1c

### Tipografia:

- **Fonte**: Arial, sans-serif
- **Título principal**: 28px, bold
- **Subtítulo**: 16px
- **Texto normal**: 14-16px

### Estrutura:

- **Largura máxima**: 600px
- **Bordas arredondadas**: 8px
- **Sombra sutil**: 0 4px 6px rgba(0, 0, 0, 0.1)

## 🚀 Próximas Melhorias

1. **Template para Convite de Usuário**
2. **Template para Mudança de E-mail**
3. **Template para Notificações**
4. **Versão em outros idiomas**

## 📱 Responsividade

Os templates são totalmente responsivos e funcionam bem em:

- ✅ Desktop
- ✅ Tablet
- ✅ Smartphone
- ✅ Clientes de e-mail (Gmail, Outlook, etc.)

## 🔐 Produção

⚠️ **IMPORTANTE**: Para produção, lembre-se de:

1. Configurar SMTP real (não Mailtrap)
2. Atualizar URLs para domínio de produção
3. Testar em diferentes clientes de e-mail
4. Configurar SPF, DKIM e DMARC para deliverability

---

✨ **Resultado**: E-mails profissionais e bem formatados que melhoram a experiência do usuário e transmitem confiança na marca HomeFlow.

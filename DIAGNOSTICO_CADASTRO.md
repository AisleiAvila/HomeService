# 🔍 Diagnóstico - Problema no Cadastro de Profissional

## ✅ Logs Adicionados

Foram adicionados logs detalhados em:
1. **RegisterComponent** (`register.component.ts`)
2. **AppComponent** (`app.component.ts`)
3. **AuthService** (`auth.service.ts`) - já tinha logs

## 🧪 Como Fazer o Teste

### Passo 1: Recarregue a Aplicação
```bash
# Se não estiver rodando, inicie:
ng serve

# Se já estiver rodando, apenas recarregue o navegador:
# Ctrl + Shift + R (recarregar sem cache)
```

### Passo 2: Abra o Console do Navegador
1. Pressione **F12** ou **Ctrl + Shift + I**
2. Vá para a aba **Console**
3. Limpe o console (ícone 🚫 ou Ctrl + L)

### Passo 3: Tente Cadastrar um Profissional
Use os seguintes dados de teste:
- **Nome:** João Silva Teste
- **E-mail:** Seu e-mail REAL ou teste@exemplo.com
- **Senha:** 123456
- **Tipo:** Profissional

### Passo 4: Observe o Console

#### ✅ Sequência ESPERADA de logs:

```
🚀 RegisterComponent.register() chamado
📝 Dados do formulário: {name: "João Silva Teste", email: "teste@exemplo.com", passwordLength: 6, role: "professional"}
✅ Validação passou, emitindo evento registered
✅ Evento registered emitido com sucesso
🎯 AppComponent.handleRegister() chamado com payload: {name: "João Silva Teste", email: "teste@exemplo.com", role: "professional", passwordLength: 6}
📞 Chamando authService.register()...
🚀 AuthService.register() iniciado para: teste@exemplo.com
🎯 SOLUÇÃO ALTERNATIVA: Usando OTP em vez de signUp
🎯 Role recebido como parâmetro: professional
✅ Validando formato do e-mail...
🔍 Verificando se e-mail já existe na base de dados...
📧 Enviando código de verificação via OTP...
✅ Código de verificação enviado com sucesso!
📧 Definindo e-mail pendente de confirmação: teste@exemplo.com
🔒 Fazendo logout obrigatório para tela de verificação
✅ ========================================
✅ E-MAIL DE VERIFICAÇÃO ENVIADO COM SUCESSO!
✅ Destinatário: teste@exemplo.com
✅ Tipo de cadastro: Profissional
✅ ========================================
✅ authService.register() concluído sem erros
```

## 🚨 Cenários de Problema

### Cenário 1: Nenhum log aparece
**Problema:** O botão de cadastro não está funcionando

**Verifique:**
- [ ] O formulário está sendo submetido? (clicou no botão certo?)
- [ ] Há erros de JavaScript no console?
- [ ] A aplicação está realmente recarregada?

**Solução:**
```bash
# Pare o servidor
Ctrl + C

# Limpe e reinstale
npm install

# Inicie novamente
ng serve
```

### Cenário 2: Para em "Validação falhou"
**Logs que aparecem:**
```
🚀 RegisterComponent.register() chamado
📝 Dados do formulário: ...
❌ Validação falhou: [motivo]
```

**Problema:** Validação do formulário bloqueando

**Verifique:**
- [ ] Nome preenchido?
- [ ] E-mail em formato válido?
- [ ] Senha com pelo menos 6 caracteres?

### Cenário 3: Para após "Evento registered emitido"
**Logs que aparecem:**
```
🚀 RegisterComponent.register() chamado
✅ Evento registered emitido com sucesso
[NADA MAIS]
```

**Problema:** O evento não está sendo capturado pelo AppComponent

**Verificar no HTML:**
```html
<!-- Deve ter isso no app.component.html -->
<app-register
  (registered)="handleRegister($event)"
  ...
/>
```

**Solução:** Verifique se o binding está correto no `app.component.html`

### Cenário 4: Para em "Chamando authService.register()"
**Logs que aparecem:**
```
🎯 AppComponent.handleRegister() chamado
📞 Chamando authService.register()...
[NADA MAIS]
```

**Problema:** Erro silencioso no AuthService ou Promise não resolvida

**Verifique:**
- [ ] Há erro vermelho no console?
- [ ] Rede está funcionando? (aba Network no F12)
- [ ] Supabase está acessível?

### Cenário 5: Erro ao verificar e-mail existente
**Logs que aparecem:**
```
🔍 Verificando se e-mail já existe na base de dados...
❌ Erro: [mensagem]
```

**Problema:** Conexão com Supabase ou e-mail já cadastrado

**Soluções:**
1. Use um e-mail diferente
2. Verifique a conexão com internet
3. Verifique as credenciais do Supabase

### Cenário 6: Erro ao enviar OTP
**Logs que aparecem:**
```
📧 Enviando código de verificação via OTP...
❌ Erro ao enviar OTP: [mensagem]
```

**Problemas possíveis:**
- Rate limit do Supabase
- Email confirmation desabilitado
- SMTP não configurado

**Soluções:**
1. Aguarde 5 minutos e tente novamente
2. Verifique configurações do Supabase
3. Execute: `node test-email-config.js`

## 📋 Checklist de Verificação

Antes de reportar o problema, verifique:

- [ ] A aplicação está rodando (ng serve)
- [ ] O navegador foi recarregado (Ctrl + Shift + R)
- [ ] O console está aberto (F12)
- [ ] O console foi limpo antes do teste
- [ ] Todos os campos foram preenchidos corretamente
- [ ] O e-mail está em formato válido
- [ ] A senha tem pelo menos 6 caracteres

## 🔧 Ações Imediatas

### Se NENHUM log aparece:
```bash
# Terminal 1
ng serve --port 4200

# Aguarde compilar, depois abra:
# http://localhost:4200
```

### Se aparecem erros de compilação:
```bash
npm install
ng serve
```

### Se o Supabase não responde:
```bash
node test-email-config.js
```

## 📸 Capture os Logs

Quando reportar o problema, envie:
1. **Print do console** (F12 > Console)
2. **Print da aba Network** (F12 > Network) mostrando as requisições
3. **Últimos logs antes de parar**
4. **Mensagem de erro, se houver**

---

## ⚡ Teste Rápido

Abra o console (F12) e cole:
```javascript
console.log("🧪 Teste de conexão com Supabase");
fetch("https://uqrvenlkquheajuveggv.supabase.co/rest/v1/")
  .then(r => console.log("✅ Supabase acessível", r.status))
  .catch(e => console.error("❌ Erro:", e));
```

Se retornar status 200, o Supabase está acessível.

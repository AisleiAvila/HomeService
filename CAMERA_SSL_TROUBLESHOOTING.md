# 🔧 Solução de Problemas - Câmera com HTTPS Local

## 🚨 Problema Comum: Certificado SSL Auto-assinado

Quando você usa `ng serve --ssl`, o Angular gera um certificado SSL auto-assinado que os navegadores não confiam por padrão.

## 📋 Soluções em Ordem de Prioridade

### ✅ **Solução 1: Aceitar o Certificado (Mais Rápida)**

1. **Acesse:** `https://localhost:4200/`
2. **Você verá um aviso de segurança:**

   - Chrome: "Sua conexão não é particular"
   - Firefox: "Aviso: Risco potencial de segurança"
   - Edge: "Sua conexão não é privada"

3. **Como Prosseguir:**

   - **Chrome/Edge:** Clique em "Avançado" → "Prosseguir para localhost (não seguro)"
   - **Firefox:** Clique em "Avançado" → "Aceitar o risco e continuar"

4. **Teste a câmera** após aceitar o certificado

### ✅ **Solução 2: Teste Específico da Câmera**

Abra o Console do Navegador (F12) e cole este código:

```javascript
// Teste básico da API da câmera
async function testCamera() {
  try {
    console.log("🔍 Testando suporte à câmera...");

    // Verificar suporte
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("❌ getUserMedia não suportado");
      return;
    }

    console.log("✅ getUserMedia suportado");

    // Testar permissões
    if ("permissions" in navigator) {
      const permission = await navigator.permissions.query({ name: "camera" });
      console.log("📋 Permissão da câmera:", permission.state);
    }

    // Solicitar acesso
    console.log("📷 Solicitando acesso à câmera...");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: "user",
      },
    });

    console.log("🎉 Câmera acessada com sucesso!", stream);

    // Parar a stream
    stream.getTracks().forEach((track) => track.stop());
    console.log("✅ Teste concluído - Câmera funcionando!");
  } catch (error) {
    console.error("❌ Erro ao acessar câmera:", error.name, error.message);

    switch (error.name) {
      case "NotAllowedError":
        console.log(
          "💡 Solução: Permita o acesso à câmera nas configurações do navegador"
        );
        break;
      case "NotFoundError":
        console.log("💡 Problema: Nenhuma câmera encontrada");
        break;
      case "NotReadableError":
        console.log("💡 Problema: Câmera em uso por outro app");
        break;
      default:
        console.log("💡 Erro desconhecido - verifique as configurações");
    }
  }
}

testCamera();
```

### ✅ **Solução 3: Certificado Personalizado (Avançada)**

Se as soluções anteriores não funcionarem, crie certificados SSL válidos:

```bash
# 1. Instalar mkcert (ferramenta para certificados locais)
# Windows (com Chocolatey):
choco install mkcert

# 2. Configurar CA local
mkcert -install

# 3. Gerar certificado para localhost
mkcert localhost 127.0.0.1 ::1

# 4. Usar o certificado no Angular
ng serve --ssl --ssl-cert localhost+2.pem --ssl-key localhost+2-key.pem
```

### ✅ **Solução 4: Usando Chrome com Flags**

Inicie o Chrome com flags especiais:

```bash
# Windows
chrome.exe --user-data-dir=/tmp/chrome_dev_test --disable-web-security --allow-running-insecure-content

# Ou use o atalho:
chrome.exe --unsafely-treat-insecure-origin-as-secure=http://localhost:4200 --user-data-dir=/tmp/chrome_dev_test
```

## 🔍 **Diagnóstico Específico**

### Verificar se a Aplicação Angular Carregou:

1. Abra `https://localhost:4200/`
2. Pressione **F12** para abrir as ferramentas de desenvolvedor
3. Vá para a aba **Console**
4. Procure por erros em vermelho

### Verificar Permissões da Câmera:

1. Clique no **ícone do cadeado** na barra de endereços
2. Verifique se a **Câmera** está definida como "Permitir"
3. Se estiver como "Bloquear", mude para "Permitir" e recarregue a página

### Testar no Componente Profile:

1. Navegue até a página de perfil
2. Clique no ícone da câmera sobre a foto do avatar
3. Verifique se aparece a solicitação de permissão
4. Se não aparecer, verifique o console para erros

## 🚨 **Problemas Comuns e Soluções**

### **Erro: "Site não seguro"**

- **Causa:** Certificado SSL auto-assinado
- **Solução:** Aceitar o certificado conforme Solução 1

### **Erro: "getUserMedia is not a function"**

- **Causa:** Navegador muito antigo ou HTTPS necessário
- **Solução:** Atualizar navegador ou usar HTTPS

### **Erro: "NotAllowedError"**

- **Causa:** Permissão da câmera negada
- **Solução:** Permitir câmera nas configurações do site

### **Erro: "NotFoundError"**

- **Causa:** Nenhuma câmera disponível
- **Solução:** Conectar uma câmera ou usar dispositivo com câmera

### **Câmera não aparece no modal**

- **Causa:** Stream não conectada ao elemento video
- **Solução:** Verificar se o código está funcionando corretamente

## 🎯 **Teste Final**

Execute este teste na aplicação:

1. **Acesse:** `https://localhost:4200/`
2. **Aceite o certificado** se solicitado
3. **Navegue para o perfil**
4. **Clique na câmera**
5. **Permita o acesso** quando solicitado
6. **Verifique se o vídeo aparece**

## 📞 **Se Ainda Não Funcionar**

Envie as seguintes informações:

1. **Navegador e versão**
2. **Mensagens de erro do console** (F12 → Console)
3. **Status das permissões** (ícone do cadeado)
4. **Resultado do teste JavaScript** (Solução 2)

---

**💡 Dica:** Na maioria dos casos, o problema é simplesmente aceitar o certificado SSL auto-assinado no navegador!

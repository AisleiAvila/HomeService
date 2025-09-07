# 🎯 Solução Específica: "Device in use" (NotReadableError)

## ✅ **PROBLEMA IDENTIFICADO**

**Chrome:** `NotReadableError: Device in use`  
**Firefox:** Sem resposta (provavelmente bloqueado silenciosamente)

## 🔧 **SOLUÇÕES EM ORDEM DE PRIORIDADE**

### **1. 🚀 SOLUÇÃO MAIS COMUM (90% dos casos)**

**Feche aplicativos que podem estar usando a câmera:**

```bash
# Windows - Verificar processos que podem usar câmera
tasklist | findstr /i "teams\|zoom\|skype\|chrome\|firefox\|edge"
```

**Aplicativos comuns que "prendem" a câmera:**

- ✅ **Microsoft Teams** (mesmo minimizado)
- ✅ **Zoom** (mesmo fechado, pode deixar processo rodando)
- ✅ **Skype** (modo segundo plano)
- ✅ **Chrome/Edge** com outras abas usando câmera
- ✅ **OBS Studio** ou software de streaming
- ✅ **Discord** (chamadas de vídeo)
- ✅ **WhatsApp Desktop** (chamadas)

**Como resolver:**

1. **Feche completamente** estes aplicativos (não apenas minimize)
2. **Verifique o Gerenciador de Tarefas** (Ctrl+Shift+Esc)
3. **Finalize processos** relacionados se necessário
4. **Tente novamente** na aplicação

### **2. 🔄 REINICIAR SERVIÇOS DA CÂMERA (Windows)**

```powershell
# Execute como Administrador no PowerShell
Get-PnpDevice | Where-Object {$_.Class -eq "Camera"} | Disable-PnpDevice -Confirm:$false
Start-Sleep -Seconds 3
Get-PnpDevice | Where-Object {$_.Class -eq "Camera"} | Enable-PnpDevice -Confirm:$false
```

### **3. 🌐 PROBLEMA ESPECÍFICO DO FIREFOX**

**Configuração do Firefox para HTTPS local:**

1. **Acesse:** `about:config`
2. **Pesquise:** `media.navigator.permission.disabled`
3. **Defina como:** `true`
4. **Pesquise:** `security.tls.insecure_fallback_hosts`
5. **Adicione:** `localhost`
6. **Reinicie** o Firefox

### **4. 🛠️ TESTE ESPECÍFICO PARA SEU CASO**

**Cole este código no console do Chrome:**

```javascript
// Teste específico para "Device in use"
async function solucionarDeviceInUse() {
  console.log('🔍 Diagnosticando "Device in use"...');

  try {
    // Primeiro, listar todas as câmeras
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((d) => d.kind === "videoinput");

    console.log(`📹 Câmeras encontradas: ${cameras.length}`);
    cameras.forEach((cam, i) => {
      console.log(
        `  ${i + 1}. ${
          cam.label || "Câmera sem nome"
        } (ID: ${cam.deviceId.substring(0, 20)}...)`
      );
    });

    // Tentar cada câmera individualmente
    for (let i = 0; i < cameras.length; i++) {
      try {
        console.log(`🧪 Testando câmera ${i + 1}...`);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: cameras[i].deviceId },
        });

        console.log(`✅ Câmera ${i + 1} funcionando!`);
        stream.getTracks().forEach((track) => track.stop());
        return cameras[i];
      } catch (error) {
        console.log(`❌ Câmera ${i + 1} erro: ${error.name}`);
        if (error.name === "NotReadableError") {
          console.log(`   💡 Câmera ${i + 1} está em uso por outro app`);
        }
      }
    }

    console.log("❌ Todas as câmeras estão em uso ou com problema");
  } catch (error) {
    console.log("❌ Erro geral:", error.name, error.message);
  }
}

solucionarDeviceInUse();
```

### **5. 📱 ALTERNATIVA: USE CÂMERA ESPECÍFICA**

Se você tem múltiplas câmeras, teste especificar uma:

```javascript
// No console, teste câmeras específicas
navigator.mediaDevices.enumerateDevices().then((devices) => {
  const cameras = devices.filter((d) => d.kind === "videoinput");
  cameras.forEach((cam, i) => {
    console.log(`Câmera ${i}: ${cam.label}`);

    // Teste cada uma
    navigator.mediaDevices
      .getUserMedia({
        video: { deviceId: cam.deviceId },
      })
      .then((stream) => {
        console.log(`✅ Câmera ${i} OK!`);
        stream.getTracks().forEach((track) => track.stop());
      })
      .catch((err) => {
        console.log(`❌ Câmera ${i}: ${err.name}`);
      });
  });
});
```

## 🎯 **RESOLUÇÃO ESPECÍFICA PARA SEU CASO**

### **Para o Chrome (NotReadableError):**

**Passo 1:** Feche **TODOS** os aplicativos desta lista:

- [ ] Microsoft Teams
- [ ] Zoom
- [ ] Skype
- [ ] Discord
- [ ] WhatsApp Desktop
- [ ] OBS/Streamlabs
- [ ] Outras abas do Chrome com câmera

**Passo 2:** Execute no **Gerenciador de Tarefas** (Ctrl+Shift+Esc):

- Procure por processos `Teams`, `Zoom`, `Skype`
- **Finalize** qualquer processo relacionado

**Passo 3:** Teste novamente em `https://localhost:4200`

### **Para o Firefox (Sem resposta):**

**Passo 1:** Configure conforme seção 3 acima

**Passo 2:** Ou use o Chrome para este teste específico

## 🚨 **SE AINDA NÃO FUNCIONAR**

Execute este comando no **PowerShell como Admin:**

```powershell
# Reiniciar serviço de câmera do Windows
Restart-Service -Name "FrameServer" -Force
Get-Service -Name "FrameServer"
```

E então teste este código no console:

```javascript
navigator.mediaDevices
  .getUserMedia({ video: true })
  .then((stream) => {
    console.log("🎉 RESOLVIDO! Câmera funcionando!");
    stream.getTracks().forEach((track) => track.stop());
  })
  .catch((err) => console.log("💔 Ainda com erro:", err.name));
```

---

**💡 DICA:** O erro "Device in use" é quase sempre outros aplicativos usando a câmera. Teams é o culpado mais comum!

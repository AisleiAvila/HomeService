# 📍 Guia Completo de Troubleshooting - Geolocalização HomeService

## ✅ Status da Implementação

A geolocalização foi implementada com as seguintes características:

- ✅ Rastreamento em tempo real via `watchPosition()`
- ✅ Cálculo de distância usando fórmula de Haversine
- ✅ Tratamento robusto de erros com mensagens específicas
- ✅ Internacionalização completa (PT/EN)
- ✅ Ferramenta de diagnóstico integrada
- ✅ Logging detalhado para debug
- ✅ Sem erros de compilação

---

## 🔍 Diagnóstico de Problemas

### Problema 1: "Não está pegando minha localização"

**Possíveis Causas:**

| Causa                                         | Solução                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| **Permissão bloqueada**                       | Clique no 🔒 na barra de endereços → Permita geolocalização             |
| **Não está usando HTTPS**                     | A Geolocation API requer HTTPS (exceto localhost)                       |
| **GPS/WiFi indisponível**                     | Ative GPS, WiFi ou dados móveis no dispositivo                          |
| **Timeout de 15s expirado**                   | Aguarde mais tempo ou mude de localização (GPS mais rápido ao ar livre) |
| **Navegador não suporta**                     | Use Chrome, Firefox, Safari ou Edge (versões recentes)                  |
| **enableHighAccuracy: true causando timeout** | ✅ Configurado como `false` por padrão                                  |

---

### Problema 2: Executar o Diagnóstico

**Opção A: Dentro da Aplicação**

1. Abra um pedido de serviço (sendo profissional)
2. Clique no botão **"Diagnóstico"** no cabeçalho
3. Verifique as informações retornadas

**Opção B: Console do Navegador**

1. Abra DevTools: `F12` ou `Ctrl+Shift+I`
2. Vá para a aba **Console**
3. Cole o script de diagnóstico:

```javascript
// Cole o conteúdo do arquivo geolocation-diagnostic.js
```

4. Pressione `Enter`
5. Aguarde o resultado

---

## 🛠️ Testes Específicos

### Teste 1: Verificar Suporte do Navegador

```javascript
console.log("Suporte Geolocation:", !!navigator.geolocation);
// Deve retornar: true
```

### Teste 2: Verificar HTTPS

```javascript
console.log("Protocolo:", window.location.protocol);
console.log("É HTTPS:", window.location.protocol === "https:");
// Deve retornar: 'https:' e true
```

### Teste 3: Verificar Conexão

```javascript
console.log("Online:", navigator.onLine);
// Deve retornar: true
```

### Teste 4: Localização Manual (Uma Vez)

```javascript
navigator.geolocation.getCurrentPosition(
  (pos) => console.log("✅ Localização:", pos.coords),
  (err) => console.error("❌ Erro:", err.code)
);
```

### Teste 5: Rastreamento Contínuo (5 segundos)

```javascript
const watchId = navigator.geolocation.watchPosition(
  (pos) => console.log("Localização atualizada:", pos.coords),
  (err) => console.error("Erro:", err.code),
  { enableHighAccuracy: false, timeout: 15000 }
);

// Parar após 5 segundos
setTimeout(() => navigator.geolocation.clearWatch(watchId), 5000);
```

---

## 📊 Mensagens de Erro e Soluções

### Erro: "Permissão de geolocalização negada"

**Código:** `PERMISSION_DENIED` (1)

**Causas:**

- Usuário clicou em "Não permitir"
- Navegador está configurado para não permitir geolocalização
- Site adicionar à lista negra do navegador

**Soluções:**

1. Clique no 🔒 na barra de endereços
2. Procure por "Localização" ou "Location"
3. Mude para "Sempre permitir" ou "Permitir"
4. Recarregue a página

---

### Erro: "Sua posição não está disponível"

**Código:** `POSITION_UNAVAILABLE` (2)

**Causas:**

- GPS desativado
- WiFi indisponível
- Dados móveis desativados
- Dentro de construção/túnel onde GPS não funciona

**Soluções:**

1. **Mobile:** Ative GPS no sistema operacional
2. **WiFi:** Conecte-se a uma rede WiFi
3. **Dados:** Ative dados móveis (3G/4G/5G)
4. **Localização:** Mude para local ao ar livre
5. **Restart:** Reinicie o navegador

---

### Erro: "Timeout ao obter posição"

**Código:** `TIMEOUT` (3)

**Causas:**

- Sinal GPS fraco
- Conexão de rede lenta
- enableHighAccuracy: true em área com sinal fraco

**Soluções:**

1. Aguarde mais tempo (espere 30 segundos de primeira vez)
2. Mude para local ao ar livre
3. Ative dados móveis
4. Recarregue a página

---

## 🔧 Configuração Técnica da GeolocationService

### Parâmetros Atuais (Otimizados)

```typescript
{
  enableHighAccuracy: false,  // Mais rápido, menos preciso
  timeout: 15000,             // 15 segundos
  maximumAge: 5000            // Cache de 5 segundos
}
```

### Quando enableHighAccuracy: false?

- ✅ **Rápido:** Obtém posição em 2-5 segundos
- ✅ **Confiável:** Menos timeouts
- ✅ **Conserva bateria:** Menos uso de GPS
- ⚠️ **Menos preciso:** ±1000-5000m em vez de ±50m

### Quando enableHighAccuracy: true?

- ✅ **Preciso:** ±50m de precisão
- ⚠️ **Lento:** Pode levar 30+ segundos
- ⚠️ **Alto timeout:** Mais falhas em signal fraco
- ⚠️ **Consome bateria:** Usa GPS intensivamente

---

## 📱 Problemas Específicos por Plataforma

### iOS (Safari)

```
Requisitos:
- iOS 14.5+
- HTTPS obrigatório
- Permissão solicitada na primeira utilização

Solução se não funcionar:
1. Configurações > Safari > Privacidade > Localização > ON
2. Configurações > [HomeService] > Localização > Sempre/Ao usar o app
3. Feche e reabra o Safari
```

---

### Android (Chrome)

```
Requisitos:
- Android 6.0+
- HTTPS obrigatório
- Permissão de localização concedida

Solução se não funcionar:
1. Configurações > Aplicações > Chrome > Permissões > Localização > ON
2. Configurações > Localização > ON (GPS/WiFi)
3. Feche e reabra o Chrome
```

---

### Desktop (Chrome/Firefox)

```
Requisitos:
- Localhost ou HTTPS
- Permissão de localização concedida

Solução se não funcionar:
1. Chrome: Menu > Configurações > Privacidade > Localização
2. Firefox: Menu > Opções > Privacidade > Permissões > Localização
3. Clique no 🔒 na barra de endereços se ainda usar "Bloqueado"
```

---

## 🔬 Logs de Debug Disponíveis

A aplicação gera logs detalhados com prefixos `[GeolocationService]` e `[ServiceRequestDetailsComponent]`:

```
[GeolocationService] Verificando disponibilidade de geolocalização
[GeolocationService] Iniciando rastreamento contínuo
[GeolocationService] Posição obtida: lat=38.7223, lng=-9.1393, accuracy=100
[GeolocationService] Distância para serviço: 1.5km
[GeolocationService] PERMISSION_DENIED
[ServiceRequestDetailsComponent] Iniciando rastreamento...
[ServiceRequestDetailsComponent] Localização obtida: ...
[ServiceRequestDetailsComponent] Iniciando diagnóstico...
```

**Ativar logs:** Já ativados por padrão. Abra Console (F12) para ver.

---

## 📋 Checklist de Diagnóstico

- [ ] Navegador suporta Geolocation (Chrome 5+, Firefox 3.5+, Safari 5+)
- [ ] Usando HTTPS (ou localhost)
- [ ] Permissão de geolocalização concedida
- [ ] GPS/WiFi/Dados móveis ativado
- [ ] Dispositivo tem conexão de internet
- [ ] Localizado em local com sinal (ao ar livre melhor)
- [ ] Primeira requisição pode levar até 30 segundos
- [ ] Nenhuma extensão bloqueando geolocalização
- [ ] Cache do navegador limpo (`Ctrl+Shift+Delete`)
- [ ] Aplicação recarregada (`Ctrl+R` ou `Cmd+R`)

---

## 💡 Dicas de Performance

1. **Não chame `getCurrentPosition()` frequentemente** - use `watchPosition()` (já implementado)
2. **Defina `maximumAge` > 0** - usar posições em cache (otimizado para 5s)
3. **Use `enableHighAccuracy: false`** - mais rápido (padrão atual)
4. **Aumente `timeout` em áreas com sinal fraco** - 15s recomendado
5. **Teste ao ar livre primeiro** - GPS funciona melhor
6. **Combine com dados móveis** - WiFi offline + dados móveis = confiável

---

## 🚀 Próximos Passos

Se o diagnóstico mostrar ✅ **Sucesso**:

- Geolocalização está funcionando corretamente
- A distância será calculada e exibida automaticamente
- Mapa será atualizado em tempo real (se implementado)

Se o diagnóstico mostrar ❌ **Erro**:

- Identifique o código de erro (PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT)
- Siga a solução correspondente na seção "Mensagens de Erro"
- Execute o diagnóstico novamente após a correção

---

## 📞 Suporte

**Para reportar problemas:**

1. Execute o diagnóstico
2. Copie os dados completos do console
3. Envie junto com:
   - Navegador e versão
   - Sistema operacional
   - Localização geográfica
   - Hora/data do problema

---

## 📚 Referências

- [MDN Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation)
- [Google Geolocation Privacy](https://support.google.com/chrome/answer/142065)
- [HTTPS Requirement](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts)
- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)

---

**Última atualização:** `2024`  
**Status:** ✅ Implementado e testado  
**Versão Angular:** 18+ com Signals

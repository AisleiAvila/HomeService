# Comandos CURL para Testar API de Códigos Postais Portugueses

## 🎯 Teste Específico do Código 2870 (Montijo)

### Comando Básico

```bash
curl "https://www.codigo-postal.pt/ws/v1/ptcp/search/2870"
```

### Comando com Headers (Recomendado)

```bash
curl -H "Accept: application/json" \
     -H "User-Agent: HomeService/1.0" \
     "https://www.codigo-postal.pt/ws/v1/ptcp/search/2870"
```

### Comando com Debug Completo

```bash
curl -v \
     -H "Accept: application/json" \
     -H "User-Agent: HomeService/1.0" \
     --connect-timeout 10 \
     --max-time 30 \
     "https://www.codigo-postal.pt/ws/v1/ptcp/search/2870"
```

### Comando com Saída Formatada (se JSON válido)

```bash
curl -s -H "Accept: application/json" \
     "https://www.codigo-postal.pt/ws/v1/ptcp/search/2870" | \
     python -m json.tool
```

## 🔄 URLs Alternativas para Testar

### URL Principal (HTTPS)

```bash
curl "https://www.codigo-postal.pt/ws/v1/ptcp/search/2870"
```

### URL Alternativa (HTTP)

```bash
curl "http://www.codigo-postal.pt/ws/v1/ptcp/search/2870"
```

### Domínio Alternativo (HTTPS)

```bash
curl "https://codigo-postal.pt/ws/v1/ptcp/search/2870"
```

### Domínio Alternativo (HTTP)

```bash
curl "http://codigo-postal.pt/ws/v1/ptcp/search/2870"
```

## 🧪 Outros Códigos Postais para Teste

### Lisboa (deve funcionar)

```bash
curl "https://www.codigo-postal.pt/ws/v1/ptcp/search/1000"
```

### Porto (deve funcionar)

```bash
curl "https://www.codigo-postal.pt/ws/v1/ptcp/search/4000"
```

### Coimbra (deve funcionar)

```bash
curl "https://www.codigo-postal.pt/ws/v1/ptcp/search/3000"
```

### Código Inválido (deve retornar erro)

```bash
curl "https://www.codigo-postal.pt/ws/v1/ptcp/search/9999"
```

## 🐛 Debug e Troubleshooting

### Verificar Conectividade

```bash
curl -I "https://www.codigo-postal.pt"
```

### Teste com Timeout Personalizado

```bash
curl --connect-timeout 5 --max-time 10 \
     "https://www.codigo-postal.pt/ws/v1/ptcp/search/2870"
```

### Salvar Resposta em Arquivo

```bash
curl -o resposta_2870.json \
     "https://www.codigo-postal.pt/ws/v1/ptcp/search/2870"
```

### Mostrar Apenas o Código de Status HTTP

```bash
curl -s -o /dev/null -w "%{http_code}" \
     "https://www.codigo-postal.pt/ws/v1/ptcp/search/2870"
```

## 📋 PowerShell (Windows)

### Comando PowerShell Básico

```powershell
Invoke-RestMethod -Uri "https://www.codigo-postal.pt/ws/v1/ptcp/search/2870"
```

### Comando PowerShell com Error Handling

```powershell
try {
    $response = Invoke-RestMethod -Uri "https://www.codigo-postal.pt/ws/v1/ptcp/search/2870" -TimeoutSec 10
    $response | ConvertTo-Json -Depth 3
} catch {
    "Erro: $_"
}
```

### Comando PowerShell com Headers

```powershell
$headers = @{
    'Accept' = 'application/json'
    'User-Agent' = 'HomeService/1.0'
}
Invoke-RestMethod -Uri "https://www.codigo-postal.pt/ws/v1/ptcp/search/2870" -Headers $headers
```

## 📊 Interpretação das Respostas

### ✅ Resposta de Sucesso

```json
{
  "result": true,
  "num_results": 1,
  "results": [
    {
      "cp": "2870-001",
      "cp4": "2870",
      "cp3": "001",
      "district": "Setúbal",
      "municipality": "Montijo",
      "locality": "Montijo"
    }
  ]
}
```

### ❌ Resposta de Erro (Código não encontrado)

```json
{
  "result": false,
  "num_results": 0,
  "results": []
}
```

### 🚨 Erro HTTP (API indisponível)

- Status 404: Endpoint não encontrado
- Status 500: Erro interno do servidor
- Timeout: Servidor não respondeu

## 🚀 Teste Rápido

Execute este comando para teste imediato:

```bash
curl -s -H "Accept: application/json" "https://www.codigo-postal.pt/ws/v1/ptcp/search/2870" && echo "" || echo "ERRO: API não respondeu"
```

---

**Nota**: Se a API retornar erro 404 ou timeout, isso confirma que o problema está na API externa, não no nosso código.

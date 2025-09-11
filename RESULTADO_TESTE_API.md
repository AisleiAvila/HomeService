# 🔧 Comandos CURL para Testar API de Códigos Postais

## 📋 Resumo do Problema

A API `https://www.codigo-postal.pt/ws/v1/ptcp/search/` está retornando **404 (Página Não Encontrada)** em formato HTML, não JSON.

## 🧪 Comandos de Teste

### 1. Teste Básico do Código 2870 (Montijo)

```cmd
curl.exe -s -H "Accept: application/json" "https://www.codigo-postal.pt/ws/v1/ptcp/search/2870"
```

### 2. Teste com HTTP (em vez de HTTPS)

```cmd
curl.exe -s -H "Accept: application/json" "http://www.codigo-postal.pt/ws/v1/ptcp/search/2870"
```

### 3. Teste com Redirect Automático

```cmd
curl.exe -L -s -H "Accept: application/json" "https://www.codigo-postal.pt/ws/v1/ptcp/search/2870"
```

### 4. Teste Verbose (mostra detalhes da conexão)

```cmd
curl.exe -v -H "Accept: application/json" "https://www.codigo-postal.pt/ws/v1/ptcp/search/2870"
```

### 5. Teste do Site Principal (verificar se está online)

```cmd
curl.exe -I "https://www.codigo-postal.pt"
```

### 6. Teste de Outros Códigos

```cmd
# Lisboa
curl.exe -s "https://www.codigo-postal.pt/ws/v1/ptcp/search/1000"

# Porto
curl.exe -s "https://www.codigo-postal.pt/ws/v1/ptcp/search/4000"

# Coimbra
curl.exe -s "https://www.codigo-postal.pt/ws/v1/ptcp/search/3000"
```

## 🔍 Análise dos Resultados

### ✅ Se retornar JSON (API funcionando):

```json
{
  "result": true,
  "num_results": 1,
  "results": [
    {
      "cp": "2870-001",
      "locality": "Montijo",
      "district": "Setúbal"
    }
  ]
}
```

### ❌ Se retornar HTML (API não funcionando):

```html
<h1>404 Página Não Encontrada</h1>
```

## 📊 Status Atual (10/09/2025)

| Teste          | URL                                                 | Resultado          |
| -------------- | --------------------------------------------------- | ------------------ |
| Site Principal | https://www.codigo-postal.pt                        | ✅ Online (200 OK) |
| API HTTPS      | https://www.codigo-postal.pt/ws/v1/ptcp/search/2870 | ❌ 404 HTML        |
| API HTTP       | http://www.codigo-postal.pt/ws/v1/ptcp/search/2870  | ❌ Redirect Loop   |
| Conectividade  | -                                                   | ✅ Site acessível  |

## 🚨 Conclusão

**A API externa está FORA DO AR!**

- ✅ Site principal funciona
- ❌ API endpoint retorna 404
- ❌ Não há JSON, apenas HTML de erro
- ✅ Nossa solução offline está correta

## 💡 Recomendação

Continue usando nossa **base de dados offline expandida** que já inclui:

- ✅ 2870 (Montijo)
- ✅ 25+ códigos principais
- ✅ Cobertura nacional básica

## 🔄 Monitoramento

Execute este comando periodicamente para verificar quando a API voltar:

```cmd
curl.exe -s -H "Accept: application/json" "https://www.codigo-postal.pt/ws/v1/ptcp/search/1000" | findstr "result"
```

Se retornar `"result"`, a API voltou!

---

**Status**: ❌ API Externa Indisponível  
**Solução**: ✅ Base Offline Funcionando  
**Código 2870-005**: ✅ Resolvido com dados locais

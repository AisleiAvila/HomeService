# Solução de Roteamento para Vercel - Sem Erros CORS

## Problema Identificado

Os servidores públicos OSRM estavam retornando erros CORS (502 Bad Gateway) quando acessados da Vercel:

- `https://routing.openstreetmap.de/routed-car/route/v1` - CORS bloqueado
- `https://router.project-osrm.org/route/v1` - CORS bloqueado

## Solução Implementada

Criamos uma **Vercel Serverless Function** que atua como proxy, fazendo as requisições server-side e evitando problemas CORS.

### Arquivos Criados/Modificados

#### 1. `/api/route.js` (NOVO)

Serverless function que:

- Recebe parâmetros de latitude/longitude (início e destino)
- Tenta múltiplos servidores OSRM em sequência
- Retorna rota formatada em JSON
- Adiciona cabeçalhos CORS corretos

#### 2. `src/components/leaflet-route-map.component.ts` (MODIFICADO)

- Novo método `createRoute()` que usa a API serverless
- Mantém método antigo `createRouteWithLeafletRouting()` como fallback
- Renderiza rota manualmente usando `L.polyline()`
- Traduz instruções de navegação para português
- Gerencia cleanup de polylines e marcadores

### Como Funciona

```
[Angular App]
    ↓
[GET /api/route?startLat=...&startLng=...&endLat=...&endLng=...]
    ↓
[Vercel Serverless Function]
    ↓
[OSRM Server 1] → Falhou? → [OSRM Server 2] → Falhou? → [Erro 503]
    ↓
[JSON Response com coordenadas e instruções]
    ↓
[Angular renderiza polyline no mapa]
```

### Vantagens

✅ **Sem CORS**: Requisições feitas server-side  
✅ **Múltiplos fallbacks**: Tenta 2 servidores automaticamente  
✅ **Gratuito**: Usa apenas recursos gratuitos (Vercel + OSRM público)  
✅ **Rápido**: Serverless functions são rápidas  
✅ **Instruções em português**: Tradução automática das manobras

### Formato da Resposta da API

**Sucesso (200)**:

```json
{
  "success": true,
  "distance": 125340,
  "duration": 7200,
  "coordinates": [[38.707, -8.978], [38.708, -8.977], ...],
  "instructions": [
    {
      "index": 1,
      "instruction": "depart",
      "distance": 500,
      "duration": 45,
      "name": "Rua Principal"
    }
  ]
}
```

**Erro (503)**:

```json
{
  "success": false,
  "error": "Todos os servidores de roteamento estão indisponíveis"
}
```

### Fallback em Caso de Falha

Se a API serverless falhar:

1. A distância em linha reta já foi calculada (Haversine)
2. Botões "Google Maps" e "Waze" continuam funcionando
3. Usuário pode navegar usando apps nativos

### Testando Localmente

```bash
# Rodar em modo desenvolvimento
npm run dev

# A API estará disponível em:
# http://localhost:5173/api/route?startLat=38.707&startLng=-8.978&endLat=40.984&endLng=-8.551
```

### Deploy na Vercel

A função serverless é automaticamente detectada e deployada pela Vercel quando está na pasta `/api/`.

Nenhuma configuração adicional é necessária!

### Monitoramento

Logs da serverless function ficam disponíveis no dashboard da Vercel:

1. Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecione o projeto
3. Vá em "Functions" → "Logs"

### Limitações

- Depende da disponibilidade dos servidores OSRM públicos
- Servidores públicos podem ter rate limiting
- Para produção com alto tráfego, considere hospedar próprio servidor OSRM

### Próximos Passos (Opcional)

Para aplicação em produção com muitos usuários:

1. **Hospedar próprio servidor OSRM** (AWS/Azure)
2. **Usar serviço pago** (MapBox Directions API, Google Maps Directions)
3. **Implementar cache** (armazenar rotas frequentes)

## Suporte

Se os servidores OSRM continuarem falhando, o sistema já tem 3 níveis de fallback:

1. ✅ API Serverless (tenta 2 servidores)
2. ✅ Distância em linha reta (Haversine)
3. ✅ Google Maps / Waze (apps nativos)

O usuário **sempre** consegue navegar! 🎉

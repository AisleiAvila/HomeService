/**
 * Vercel Serverless Function - Proxy de Roteamento
 * Resolve problemas CORS fazendo requisições server-side
 */

// Lista de servidores OSRM para tentar (com mais opções)
const ROUTING_SERVERS = [
  'https://router.project-osrm.org/route/v1',
  'https://routing.openstreetmap.de/routed-car/route/v1',
  'https://vroom.openstreetmap.de/route/v1', // Alternativa adicional
];

const TIMEOUT_MS = 8000; // 8 segundo timeout

/**
 * Tenta obter rota de um servidor específico
 */
async function tryRoutingServer(serverUrl, startLat, startLng, endLat, endLng) {
  const url = `${serverUrl}/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&alternatives=false&steps=true&geometries=geojson`;

  console.log(`[Route API] Tentando servidor: ${serverUrl}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'natanGeneralService-Portugal/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`[Route API] Servidor retornou status: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.warn(`[Route API] Servidor retornou erro: ${data.code}`);
      return null;
    }

    return extractRouteData(data.routes[0], serverUrl);
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`[Route API] Servidor timeout (${TIMEOUT_MS}ms)`);
    } else {
      console.log(`[Route API] Erro no servidor: ${error.message}`);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extrai dados da rota do OSRM
 */
function extractRouteData(route, serverUrl) {
  // Validar que temos coordenadas
  if (!route.geometry || !route.geometry.coordinates || route.geometry.coordinates.length === 0) {
    console.warn(`[Route API] Rota válida mas sem coordenadas`);
    return null;
  }

  // Extrair coordenadas da geometria (inverter de [lng, lat] para [lat, lng])
  const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

  // Extrair instruções de navegação
  const instructions = route.legs && route.legs.length > 0 && route.legs[0].steps
    ? route.legs[0].steps.map((step, index) => ({
        index: index + 1,
        instruction: step.maneuver?.type || 'continue',
        distance: step.distance,
        duration: step.duration,
        name: step.name || 'Sem nome',
      }))
    : [{
        index: 1,
        instruction: 'continue',
        distance: route.distance,
        duration: route.duration,
        name: 'Trajeto direto',
      }];

  console.log(`[Route API] ✅ Rota encontrada! Distância: ${route.distance}m, Coordenadas: ${coordinates.length}`);

  return {
    success: true,
    distance: route.distance,
    duration: route.duration,
    coordinates: coordinates,
    instructions: instructions,
    server: serverUrl,
  };
}

export default async function handler(req, res) {
  // Permitir CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { startLat, startLng, endLat, endLng } = req.query;

  if (!startLat || !startLng || !endLat || !endLng) {
    return res.status(400).json({
      error: 'Missing required parameters: startLat, startLng, endLat, endLng'
    });
  }

  console.log(`[Route API] Calculando rota: ${startLat},${startLng} -> ${endLat},${endLng}`);

  // Tentar cada servidor
  for (const server of ROUTING_SERVERS) {
    const routeData = await tryRoutingServer(server, Number.parseFloat(startLat), Number.parseFloat(startLng), Number.parseFloat(endLat), Number.parseFloat(endLng));

    if (routeData) {
      return res.status(200).json(routeData);
    }
  }

  // Se todos os servidores falharam, retornar erro com fallback
  console.log('[Route API] ❌ Todos os servidores falharam');
  return res.status(503).json({
    success: false,
    error: 'Servidores de roteamento indisponíveis. Use fallback com linha reta.',
    coordinates: [[Number.parseFloat(startLat), Number.parseFloat(startLng)], [Number.parseFloat(endLat), Number.parseFloat(endLng)]],
  });
}

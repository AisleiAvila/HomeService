/**
 * Vercel Serverless Function - Proxy de Roteamento
 * Resolve problemas CORS fazendo requisições server-side
 */

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

  // Lista de servidores OSRM para tentar
  const servers = [
    'https://router.project-osrm.org/route/v1',
    'https://routing.openstreetmap.de/routed-car/route/v1',
  ];

  // Tentar cada servidor
  for (let i = 0; i < servers.length; i++) {
    const server = servers[i];
    const url = `${server}/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&alternatives=false&steps=true&geometries=geojson`;

    console.log(`[Route API] Tentando servidor ${i + 1}/${servers.length}: ${server}`);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'HomeService-Portugal/1.0',
        },
      });

      if (!response.ok) {
        console.log(`[Route API] Servidor ${i + 1} retornou status: ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        // Extrair coordenadas da geometria
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        
        // Extrair instruções de navegação
        const instructions = route.legs[0].steps.map((step, index) => ({
          index: index + 1,
          instruction: step.maneuver.type,
          distance: step.distance,
          duration: step.duration,
          name: step.name || 'Sem nome',
        }));

        console.log(`[Route API] Rota encontrada com sucesso! Distância: ${route.distance}m`);

        return res.status(200).json({
          success: true,
          distance: route.distance,
          duration: route.duration,
          coordinates: coordinates,
          instructions: instructions,
        });
      }

      console.log(`[Route API] Servidor ${i + 1} não retornou rota válida`);
    } catch (error) {
      console.log(`[Route API] Erro no servidor ${i + 1}:`, error.message);
      continue;
    }
  }

  // Se todos os servidores falharam, retornar erro
  console.log('[Route API] Todos os servidores falharam');
  return res.status(503).json({
    success: false,
    error: 'Todos os servidores de roteamento estão indisponíveis',
  });
}

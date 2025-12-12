/**
 * Script para geocodificar códigos postais portugueses
 * Usa Nominatim (OpenStreetMap) - GRATUITO
 * Respeita limite de 1 requisição/segundo
 */

const https = require('https');

// Configuração
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const BATCH_SIZE = 100;
const DELAY_MS = 1100; // 1.1 segundos entre requisições

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Erro: Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas');
  process.exit(1);
}

// Função para fazer requisição HTTP
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ statusCode: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// Função para geocodificar usando Nominatim
async function geocode(postalCode, locality, district) {
  const query = encodeURIComponent(`${postalCode}, ${locality}, ${district}, Portugal`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=pt`;
  
  try {
    const response = await makeRequest(url, {
      headers: { 'User-Agent': 'HomeService-Portugal/1.0' }
    });
    
    if (response.data && response.data.length > 0) {
      return {
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon),
        success: true
      };
    }
    return { success: false };
  } catch (error) {
    console.error(`⚠️ Erro ao geocodificar ${postalCode}:`, error.message);
    return { success: false };
  }
}

// Função para buscar códigos postais sem coordenadas
async function fetchPostalCodes(offset = 0) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/codigos_postais`);
  url.searchParams.append('select', 'id,codigo_postal_completo,nome_localidade,cod_distrito');
  url.searchParams.append('latitude', 'is.null');
  url.searchParams.append('limit', BATCH_SIZE);
  url.searchParams.append('offset', offset);
  
  const response = await makeRequest(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  
  return response.data;
}

// Função para atualizar coordenadas
async function updateCoordinates(id, latitude, longitude) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/codigos_postais`);
  url.searchParams.append('id', `eq.${id}`);
  
  const body = JSON.stringify({ latitude, longitude });
  
  try {
    await makeRequest(url, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body
    });
    return true;
  } catch (error) {
    console.error(`❌ Erro ao atualizar ID ${id}:`, error.message);
    return false;
  }
}

// Função para aguardar
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Função principal
async function main() {
  console.log('🌍 Geocodificação de Códigos Postais de Portugal');
  console.log('================================================\n');
  
  try {
    const postalCodes = await fetchPostalCodes(0);
    
    if (!postalCodes || postalCodes.length === 0) {
      console.log('✅ Nenhum código postal sem coordenadas encontrado.');
      return;
    }
    
    console.log(`📍 Encontrados ${postalCodes.length} códigos postais para processar\n`);
    
    let processed = 0;
    let success = 0;
    let failed = 0;
    
    for (const postal of postalCodes) {
      processed++;
      process.stdout.write(
        `[${processed}/${postalCodes.length}] ${postal.codigo_postal_completo} - ${postal.nome_localidade} `
      );
      
      // Geocodificar
      const coords = await geocode(
        postal.codigo_postal_completo,
        postal.nome_localidade,
        postal.cod_distrito || ''
      );
      
      if (coords.success) {
        const updated = await updateCoordinates(postal.id, coords.latitude, coords.longitude);
        
        if (updated) {
          console.log(`✅ (${coords.latitude}, ${coords.longitude})`);
          success++;
        } else {
          console.log('❌ Falha ao atualizar');
          failed++;
        }
      } else {
        console.log('⚠️ Não encontrado');
        failed++;
      }
      
      // Aguardar para respeitar rate limit
      await sleep(DELAY_MS);
    }
    
    console.log('\n================================================');
    console.log('📊 Resumo da Geocodificação');
    console.log('================================================');
    console.log(`Total processado: ${processed}`);
    console.log(`Sucesso: ${success}`);
    console.log(`Falhas: ${failed}`);
    
    if (postalCodes.length === BATCH_SIZE) {
      console.log('\n💡 Execute novamente para processar mais registros');
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();

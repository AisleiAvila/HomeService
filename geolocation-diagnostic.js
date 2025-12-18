/**
 * Geolocation Diagnostic Tool
 * 
 * Execute este script no console do navegador para diagnosticar problemas de geolocalização
 * Run this script in the browser console to diagnose geolocation issues
 */

async function runGeolocationDiagnostics() {
  console.log('🔍 Iniciando diagnóstico de geolocalização...\n');
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    checks: {}
  };

  // Check 1: Verify browser support
  console.log('✓ Verificação 1: Suporte do navegador');
  diagnostics.checks.browserSupport = !!navigator.geolocation;
  console.log(`  Suportado: ${diagnostics.checks.browserSupport ? '✅ Sim' : '❌ Não'}`);
  if (!diagnostics.checks.browserSupport) {
    console.error('  ❌ Navegador não suporta Geolocation API');
    return diagnostics;
  }

  // Check 2: HTTPS verification
  console.log('\n✓ Verificação 2: Protocolo de segurança (HTTPS)');
  const isHttps = globalThis.location.protocol === 'https:';
  diagnostics.checks.https = isHttps;
  console.log(`  HTTPS: ${isHttps ? '✅ Sim' : '❌ Não'}`);
  if (!isHttps) {
    console.warn('  ⚠️  A Geolocation API requer HTTPS (exceto localhost)');
  }

  // Check 3: Online status
  console.log('\n✓ Verificação 3: Conexão com internet');
  diagnostics.checks.online = navigator.onLine;
  console.log(`  Online: ${navigator.onLine ? '✅ Sim' : '❌ Não (offline)'}`);

  // Check 4: User Agent
  console.log('\n✓ Verificação 4: Informações do navegador');
  console.log(`  User Agent: ${navigator.userAgent}`);
  diagnostics.checks.userAgent = navigator.userAgent;

  // Check 5: Maximum Age and Timeout
  console.log('\n✓ Verificação 5: Parâmetros de geolocalização recomendados');
  console.log('  enableHighAccuracy: false (mais rápido, menos preciso)');
  console.log('  timeout: 15000ms (15 segundos)');
  console.log('  maximumAge: 5000ms (5 segundos de cache)');

  // Check 6: Actual geolocation test
  console.log('\n✓ Verificação 6: Teste de localização...');
  console.log('  ⏳ Aguardando localização do dispositivo...');

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      console.error('  ❌ Timeout após 20 segundos - nenhuma localização obtida');
      diagnostics.checks.geolocationTest = {
        success: false,
        error: 'Timeout - localização indisponível',
        timestamp: new Date().toISOString()
      };
      resolve(diagnostics);
    }, 20000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        const { latitude, longitude, accuracy } = position.coords;
        
        console.log('  ✅ Localização obtida com sucesso!');
        console.log(`  📍 Latitude: ${latitude.toFixed(6)}`);
        console.log(`  📍 Longitude: ${longitude.toFixed(6)}`);
        console.log(`  📍 Precisão: ±${accuracy.toFixed(0)} metros`);
        console.log(`  ⏰ Timestamp: ${new Date(position.timestamp).toISOString()}`);
        
        diagnostics.checks.geolocationTest = {
          success: true,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
          accuracy: accuracy.toFixed(0),
          timestamp: new Date(position.timestamp).toISOString()
        };
        
        resolve(diagnostics);
      },
      (error) => {
        clearTimeout(timeoutId);
        
        let errorMessage = 'Erro desconhecido';
        let errorCode = 'UNKNOWN';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permissão negada - usuário ou navegador bloqueou a geolocalização';
            errorCode = 'PERMISSION_DENIED';
            console.error('  ❌ Erro: Permissão negada');
            console.log('     Solução: Clique no ícone do cadeado na barra de endereços e permita a geolocalização');
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Posição indisponível - GPS/WiFi não disponível';
            errorCode = 'POSITION_UNAVAILABLE';
            console.error('  ❌ Erro: Posição indisponível');
            console.log('     Solução: Verifique conexão GPS, WiFi ou dados móveis');
            break;
          case error.TIMEOUT:
            errorMessage = 'Timeout - levou muito tempo para obter a posição';
            errorCode = 'TIMEOUT';
            console.error('  ❌ Erro: Timeout');
            console.log('     Solução: Verifique conexão de rede e tente novamente');
            break;
        }
        
        diagnostics.checks.geolocationTest = {
          success: false,
          error: errorMessage,
          code: errorCode,
          timestamp: new Date().toISOString()
        };
        
        resolve(diagnostics);
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 5000
      }
    );
  }).then(result => {
    // Final summary
    console.log('\n📊 RESUMO DO DIAGNÓSTICO:');
    console.log('─'.repeat(50));
    console.log(`✓ Navegador suporta Geolocation: ${result.checks.browserSupport ? '✅' : '❌'}`);
    console.log(`✓ Usando HTTPS: ${result.checks.https ? '✅' : '⚠️'}`);
    console.log(`✓ Conectado à internet: ${result.checks.online ? '✅' : '❌'}`);
    
    if (result.checks.geolocationTest.success) {
      console.log(`✓ Teste de localização: ✅ SUCESSO`);
      console.log(`\n📍 Localização atual:`);
      console.log(`   Latitude: ${result.checks.geolocationTest.latitude}`);
      console.log(`   Longitude: ${result.checks.geolocationTest.longitude}`);
      console.log(`   Precisão: ${result.checks.geolocationTest.accuracy}m`);
    } else {
      console.log(`✓ Teste de localização: ❌ ${result.checks.geolocationTest.code}`);
      console.log(`   Erro: ${result.checks.geolocationTest.error}`);
    }
    console.log('─'.repeat(50));
    
    console.log('\n💾 Dados completos:', result);
    
    return result;
  });
}

// Execute the diagnostic
await runGeolocationDiagnostics();

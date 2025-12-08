// test-sms.cjs
// Script para testar o serviço de envio de SMS

const axios = require('axios');

// Configuração
const SMS_ENDPOINT = 'http://localhost:4001/api/send-sms';
const HEALTH_ENDPOINT = 'http://localhost:4001/api/sms/health';

// Cores para console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function testHealthCheck() {
  logSection('Teste 1: Health Check do Serviço SMS');
  
  try {
    const response = await axios.get(HEALTH_ENDPOINT);
    
    if (response.data.status === 'healthy') {
      log('✓ Serviço SMS está saudável!', 'green');
      log(`  - Configurado: ${response.data.configured}`, 'blue');
      log(`  - Cliente Pronto: ${response.data.clientReady}`, 'blue');
      log(`  - Timestamp: ${response.data.timestamp}`, 'blue');
      return true;
    } else {
      log('✗ Serviço SMS não está saudável!', 'red');
      console.log(response.data);
      return false;
    }
  } catch (error) {
    log('✗ Erro ao verificar saúde do serviço:', 'red');
    log(`  ${error.message}`, 'red');
    if (error.code === 'ECONNREFUSED') {
      log('  Dica: O servidor SMS está rodando? Execute: node send-sms.cjs', 'yellow');
    }
    return false;
  }
}

async function testSimpleSms(phoneNumber) {
  logSection('Teste 2: Envio de SMS Simples');
  
  log(`Enviando SMS para: ${phoneNumber}`, 'blue');
  
  try {
    const response = await axios.post(SMS_ENDPOINT, {
      to: phoneNumber,
      message: 'HomeService: Esta é uma mensagem de teste do serviço de SMS.',
    });
    
    if (response.data.success) {
      log('✓ SMS enviado com sucesso!', 'green');
      log(`  - Message ID: ${response.data.messageId}`, 'blue');
      log(`  - Status: ${response.data.status}`, 'blue');
      log(`  - Segmentos: ${response.data.segments}`, 'blue');
      log(`  - Timestamp: ${response.data.timestamp}`, 'blue');
      return response.data.messageId;
    } else {
      log('✗ Falha ao enviar SMS:', 'red');
      log(`  ${response.data.error}`, 'red');
      return null;
    }
  } catch (error) {
    log('✗ Erro ao enviar SMS:', 'red');
    if (error.response) {
      log(`  ${error.response.data.error}`, 'red');
      if (error.response.data.code) {
        log(`  Código Twilio: ${error.response.data.code}`, 'red');
      }
    } else {
      log(`  ${error.message}`, 'red');
    }
    return null;
  }
}

async function testVerificationSms(phoneNumber) {
  logSection('Teste 3: SMS de Verificação');
  
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  log(`Código de verificação: ${verificationCode}`, 'yellow');
  log(`Enviando SMS para: ${phoneNumber}`, 'blue');
  
  try {
    const response = await axios.post(SMS_ENDPOINT, {
      to: phoneNumber,
      message: `HomeService: Seu código de verificação é ${verificationCode}. Válido por 5 minutos.`,
      template: 'verification',
    });
    
    if (response.data.success) {
      log('✓ SMS de verificação enviado!', 'green');
      log(`  - Message ID: ${response.data.messageId}`, 'blue');
      return response.data.messageId;
    } else {
      log('✗ Falha ao enviar SMS de verificação:', 'red');
      log(`  ${response.data.error}`, 'red');
      return null;
    }
  } catch (error) {
    log('✗ Erro ao enviar SMS de verificação:', 'red');
    if (error.response) {
      log(`  ${error.response.data.error}`, 'red');
    } else {
      log(`  ${error.message}`, 'red');
    }
    return null;
  }
}

async function testNotificationSms(phoneNumber) {
  logSection('Teste 4: SMS de Notificação');
  
  log(`Enviando SMS para: ${phoneNumber}`, 'blue');
  
  try {
    const response = await axios.post(SMS_ENDPOINT, {
      to: phoneNumber,
      message: 'HomeService: Atualização do pedido #SR-001. Novo status: Em Progresso.',
      template: 'notification',
    });
    
    if (response.data.success) {
      log('✓ SMS de notificação enviado!', 'green');
      log(`  - Message ID: ${response.data.messageId}`, 'blue');
      return response.data.messageId;
    } else {
      log('✗ Falha ao enviar SMS de notificação:', 'red');
      log(`  ${response.data.error}`, 'red');
      return null;
    }
  } catch (error) {
    log('✗ Erro ao enviar SMS de notificação:', 'red');
    if (error.response) {
      log(`  ${error.response.data.error}`, 'red');
    } else {
      log(`  ${error.message}`, 'red');
    }
    return null;
  }
}

async function testInvalidPhone() {
  logSection('Teste 5: Validação de Telefone Inválido');
  
  const invalidPhone = '123456789'; // sem código de país
  log(`Tentando enviar para número inválido: ${invalidPhone}`, 'blue');
  
  try {
    const response = await axios.post(SMS_ENDPOINT, {
      to: invalidPhone,
      message: 'Esta mensagem não deve ser enviada.',
    });
    
    if (response.data.success) {
      log('✗ ERRO: Validação falhou! Número inválido foi aceito.', 'red');
      return false;
    } else {
      log('✓ Validação funcionou! Número inválido rejeitado.', 'green');
      log(`  - Erro: ${response.data.error}`, 'blue');
      return true;
    }
  } catch (error) {
    if (error.response && error.response.status === 400) {
      log('✓ Validação funcionou! Número inválido rejeitado.', 'green');
      log(`  - Erro: ${error.response.data.error}`, 'blue');
      return true;
    } else {
      log('✗ Erro inesperado:', 'red');
      log(`  ${error.message}`, 'red');
      return false;
    }
  }
}

async function testEmptyMessage(phoneNumber) {
  logSection('Teste 6: Validação de Mensagem Vazia');
  
  log(`Tentando enviar mensagem vazia para: ${phoneNumber}`, 'blue');
  
  try {
    const response = await axios.post(SMS_ENDPOINT, {
      to: phoneNumber,
      message: '',
    });
    
    if (response.data.success) {
      log('✗ ERRO: Validação falhou! Mensagem vazia foi aceita.', 'red');
      return false;
    } else {
      log('✓ Validação funcionou! Mensagem vazia rejeitada.', 'green');
      log(`  - Erro: ${response.data.error}`, 'blue');
      return true;
    }
  } catch (error) {
    if (error.response && error.response.status === 400) {
      log('✓ Validação funcionou! Mensagem vazia rejeitada.', 'green');
      log(`  - Erro: ${error.response.data.error}`, 'blue');
      return true;
    } else {
      log('✗ Erro inesperado:', 'red');
      log(`  ${error.message}`, 'red');
      return false;
    }
  }
}

async function checkMessageStatus(messageSid) {
  logSection('Teste 7: Consulta de Status de Mensagem');
  
  if (!messageSid) {
    log('⚠ Nenhum Message SID disponível para consultar', 'yellow');
    return;
  }
  
  log(`Consultando status da mensagem: ${messageSid}`, 'blue');
  
  try {
    const response = await axios.get(`http://localhost:4001/api/sms/status/${messageSid}`);
    
    if (response.data.success) {
      log('✓ Status obtido com sucesso!', 'green');
      log(`  - Status: ${response.data.status}`, 'blue');
      log(`  - Para: ${response.data.to}`, 'blue');
      log(`  - De: ${response.data.from}`, 'blue');
      log(`  - Enviado: ${response.data.dateSent}`, 'blue');
      log(`  - Atualizado: ${response.data.dateUpdated}`, 'blue');
      if (response.data.errorCode) {
        log(`  - Código de Erro: ${response.data.errorCode}`, 'red');
        log(`  - Mensagem de Erro: ${response.data.errorMessage}`, 'red');
      }
    } else {
      log('✗ Falha ao obter status:', 'red');
      log(`  ${response.data.error}`, 'red');
    }
  } catch (error) {
    log('✗ Erro ao consultar status:', 'red');
    if (error.response) {
      log(`  ${error.response.data.error}`, 'red');
    } else {
      log(`  ${error.message}`, 'red');
    }
  }
}

function getPhoneNumber() {
  return process.argv[2] || process.env.TEST_PHONE_NUMBER;
}

function displayTestHeader(phoneNumber) {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║       TESTE DO SERVIÇO DE SMS - HOMESERVICE               ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  if (phoneNumber) {
    log(`\n📱 Número de telefone de teste: ${phoneNumber}`, 'cyan');
  } else {
    log('\n⚠ ATENÇÃO: Nenhum número de telefone fornecido!', 'yellow');
    log('Uso: node test-sms.cjs +351912345678', 'yellow');
    log('Ou defina TEST_PHONE_NUMBER no .env', 'yellow');
    log('\nExecutando apenas testes que não requerem número de telefone...', 'yellow');
  }
}

function updateResults(results, testPassed) {
  if (testPassed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

async function runPhoneBasedTests(phoneNumber, results) {
  const firstMessageSid = await testSimpleSms(phoneNumber);
  updateResults(results, firstMessageSid !== null);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const verificationSid = await testVerificationSms(phoneNumber);
  updateResults(results, verificationSid !== null);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const notificationSid = await testNotificationSms(phoneNumber);
  updateResults(results, notificationSid !== null);
  
  return firstMessageSid;
}

async function runValidationTests(phoneNumber, results) {
  const invalidPhoneOk = await testInvalidPhone();
  updateResults(results, invalidPhoneOk);
  
  const emptyMessageOk = await testEmptyMessage(phoneNumber || '+351912345678');
  updateResults(results, emptyMessageOk);
}

async function runStatusTest(firstMessageSid, results) {
  if (firstMessageSid) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    await checkMessageStatus(firstMessageSid);
    results.passed++;
  } else {
    log('\n⊘ Teste 7 ignorado (sem Message SID)', 'yellow');
    results.skipped++;
  }
}

function displayTestSummary(results) {
  logSection('RESUMO DOS TESTES');
  log(`✓ Testes Aprovados: ${results.passed}`, 'green');
  log(`✗ Testes Falhados: ${results.failed}`, 'red');
  log(`⊘ Testes Ignorados: ${results.skipped}`, 'yellow');
  
  const totalTests = results.passed + results.failed + results.skipped;
  const successRate = totalTests > 0 ? ((results.passed / (results.passed + results.failed)) * 100).toFixed(1) : 0;
  
  let successRateColor = 'red';
  if (successRate > 80) {
    successRateColor = 'green';
  } else if (successRate > 50) {
    successRateColor = 'yellow';
  }
  
  log(`\n📊 Taxa de Sucesso: ${successRate}%`, successRateColor);
  
  if (results.failed === 0 && results.passed > 0) {
    log('\n🎉 Todos os testes passaram com sucesso!', 'green');
  } else if (results.failed > 0) {
    log('\n⚠ Alguns testes falharam. Verifique a configuração.', 'yellow');
  }
  
  console.log('\n');
}

async function runAllTests() {
  const phoneNumber = getPhoneNumber();
  displayTestHeader(phoneNumber);
  
  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };
  
  const healthOk = await testHealthCheck();
  updateResults(results, healthOk);
  
  if (!healthOk) {
    log('\n⚠ Servidor SMS não está configurado corretamente. Abortando testes.', 'red');
    return;
  }
  
  let firstMessageSid = null;
  
  if (phoneNumber) {
    firstMessageSid = await runPhoneBasedTests(phoneNumber, results);
  } else {
    log('\n⊘ Testes 2, 3 e 4 ignorados (sem número de telefone)', 'yellow');
    results.skipped += 3;
  }
  
  await runValidationTests(phoneNumber, results);
  await runStatusTest(firstMessageSid, results);
  
  displayTestSummary(results);
}

// Executar testes
runAllTests().catch(error => {
  log('\n✗ Erro fatal ao executar testes:', 'red');
  console.error(error);
  process.exit(1);
});

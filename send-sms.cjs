// send-sms.cjs
// Endpoint Node.js/Express para envio de SMS via Twilio
// Instale as dependências: npm install express twilio cors dotenv

const express = require('express');
const cors = require('cors');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 4001;

// Carregar variáveis de ambiente
require('dotenv').config({ path: './.env' });

// Configuração Twilio
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER; // Número remetente (ex: +1234567890)

// Log para depuração (mascarado)
console.log('=== Configuração Twilio SMS ===');
if (TWILIO_ACCOUNT_SID) {
  console.log('TWILIO_ACCOUNT_SID:', TWILIO_ACCOUNT_SID.substring(0, 10) + '... (tamanho:', TWILIO_ACCOUNT_SID.length + ')');
} else {
  console.error('ERRO: TWILIO_ACCOUNT_SID não definida!');
}
if (TWILIO_AUTH_TOKEN) {
  console.log('TWILIO_AUTH_TOKEN:', TWILIO_AUTH_TOKEN.substring(0, 10) + '... (tamanho:', TWILIO_AUTH_TOKEN.length + ')');
} else {
  console.error('ERRO: TWILIO_AUTH_TOKEN não definida!');
}
if (TWILIO_PHONE_NUMBER) {
  console.log('TWILIO_PHONE_NUMBER:', TWILIO_PHONE_NUMBER);
} else {
  console.error('ERRO: TWILIO_PHONE_NUMBER não definida!');
}
console.log('===============================');

// Inicializar cliente Twilio
let twilioClient;
try {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  console.log('✓ Cliente Twilio inicializado com sucesso');
} catch (error) {
  console.error('✗ Erro ao inicializar cliente Twilio:', error.message);
}

// CORS explícito para frontend Angular local e Vercel
const allowedOrigins = new Set([
  'http://localhost:4200',
  'https://home-service-nu.vercel.app',
  'http://localhost:4001',
  'http://localhost:4002'
]);

app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem origin (ex: ferramentas locais, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Funções auxiliares de validação
function validateRequiredParams(to, message) {
  if (!to || !message) {
    return { valid: false, error: 'Parâmetros obrigatórios ausentes (to, message).' };
  }
  return { valid: true };
}

function validatePhoneFormat(to) {
  const phoneRegex = /^\+[1-9]\d{9,14}$/;
  const normalizedPhone = to.replaceAll(/\s+/g, '');
  if (!phoneRegex.test(normalizedPhone)) {
    return { valid: false, error: 'Formato de telefone inválido. Use formato internacional (+351...)', normalizedPhone };
  }
  return { valid: true, normalizedPhone };
}

function validateMessageLength(message) {
  if (message.length > 1600) {
    return { valid: false, error: 'Mensagem muito longa. Máximo: 1600 caracteres.' };
  }
  return { valid: true };
}

function mapTwilioError(error) {
  if (error.code === 21211) {
    return 'Número de telefone inválido.';
  } else if (error.code === 21408) {
    return 'Permissão negada para enviar para este país.';
  } else if (error.code === 21610) {
    return 'Número bloqueado ou inválido.';
  } else if (error.message) {
    return error.message;
  }
  return 'Erro ao enviar SMS.';
}

function validateSmsRequest(to, message) {
  const paramValidation = validateRequiredParams(to, message);
  if (!paramValidation.valid) {
    return { valid: false, status: 400, error: paramValidation.error };
  }

  const phoneValidation = validatePhoneFormat(to);
  if (!phoneValidation.valid) {
    return { valid: false, status: 400, error: phoneValidation.error };
  }

  const messageValidation = validateMessageLength(message);
  if (!messageValidation.valid) {
    return { valid: false, status: 400, error: messageValidation.error };
  }

  return { valid: true, normalizedPhone: phoneValidation.normalizedPhone };
}

function logSmsRequest(normalizedPhone, message, template) {
  console.log('→ Enviando SMS...');
  console.log('  Para:', normalizedPhone);
  console.log('  De:', TWILIO_PHONE_NUMBER);
  console.log('  Mensagem:', message.substring(0, 50) + (message.length > 50 ? '...' : ''));
  console.log('  Template:', template || 'Nenhum');
}

function logSmsSuccess(smsResponse) {
  console.log('✓ SMS enviado com sucesso!');
  console.log('  Message SID:', smsResponse.sid);
  console.log('  Status:', smsResponse.status);
  console.log('  Segmentos:', smsResponse.numSegments);
  console.log('===============================');
}

function logSmsError(error) {
  console.error('✗ Erro ao enviar SMS:', error);
  
  if (error.code) {
    console.error('  Código Twilio:', error.code);
    console.error('  Mensagem:', error.message);
    console.error('  Mais informações:', error.moreInfo);
  }
  
  if (error.response && error.response.body) {
    console.error('  Detalhe do erro:', error.response.body);
  }
  console.log('===============================');
}

/**
 * Endpoint POST /api/send-sms
 * 
 * Envia SMS usando a API Twilio
 * 
 * Body esperado:
 * {
 *   "to": "+351912345678",          // Número destinatário (formato internacional)
 *   "message": "Sua mensagem aqui", // Texto da mensagem
 *   "template": "verification"      // Opcional: template usado
 * }
 * 
 * Resposta de sucesso:
 * {
 *   "success": true,
 *   "messageId": "SM...",
 *   "timestamp": "2024-01-01T12:00:00Z"
 * }
 * 
 * Resposta de erro:
 * {
 *   "success": false,
 *   "error": "Descrição do erro"
 * }
 */
app.post('/api/send-sms', async (req, res) => {
  console.log('=== Nova requisição de SMS ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Body recebido:', JSON.stringify(req.body, null, 2));
  
  const { to, message, template } = req.body;
  
  const validation = validateSmsRequest(to, message);
  if (!validation.valid) {
    console.error('✗ Erro:', validation.error);
    return res.status(validation.status).json({ 
      success: false,
      error: validation.error 
    });
  }

  if (!twilioClient) {
    console.error('✗ Erro: Cliente Twilio não inicializado');
    return res.status(500).json({ 
      success: false,
      error: 'Serviço SMS não configurado corretamente.' 
    });
  }

  try {
    logSmsRequest(validation.normalizedPhone, message, template);
    
    const smsResponse = await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: validation.normalizedPhone,
    });

    logSmsSuccess(smsResponse);

    res.json({ 
      success: true,
      messageId: smsResponse.sid,
      timestamp: new Date().toISOString(),
      status: smsResponse.status,
      segments: smsResponse.numSegments
    });
    
  } catch (error) {
    logSmsError(error);

    res.status(500).json({ 
      success: false,
      error: mapTwilioError(error),
      code: error.code,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint GET /api/sms/status/:messageSid
 * 
 * Consulta status de uma mensagem SMS enviada
 */
app.get('/api/sms/status/:messageSid', async (req, res) => {
  const { messageSid } = req.params;
  
  console.log('=== Consulta de status SMS ===');
  console.log('Message SID:', messageSid);
  
  if (!twilioClient) {
    return res.status(500).json({ 
      success: false,
      error: 'Serviço SMS não configurado.' 
    });
  }

  try {
    const message = await twilioClient.messages(messageSid).fetch();
    
    console.log('✓ Status obtido:', message.status);
    console.log('  Enviado:', message.dateSent);
    console.log('  Atualizado:', message.dateUpdated);
    console.log('===============================');

    res.json({
      success: true,
      messageId: message.sid,
      status: message.status,
      to: message.to,
      from: message.from,
      dateSent: message.dateSent,
      dateUpdated: message.dateUpdated,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage,
    });
    
  } catch (error) {
    console.error('✗ Erro ao consultar status:', error);
    console.log('===============================');
    
    res.status(500).json({ 
      success: false,
      error: 'Erro ao consultar status da mensagem.' 
    });
  }
});

/**
 * Endpoint GET /api/sms/health
 * 
 * Health check do serviço SMS
 */
app.get('/api/sms/health', (req, res) => {
  const isConfigured = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);
  const isClientReady = !!twilioClient;
  
  res.json({
    status: isConfigured && isClientReady ? 'healthy' : 'unhealthy',
    configured: isConfigured,
    clientReady: isClientReady,
    timestamp: new Date().toISOString(),
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('================================');
  console.log(`🚀 Servidor SMS rodando na porta ${PORT}`);
  console.log('================================');
});

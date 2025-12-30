const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.AUTH_SERVER_PORT || 4002;

// Middleware
app.use(express.json());

// CORS - Permitir localhost e URLs de desenvolvimento
const corsOptions = {
  origin: [
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'http://localhost:4002',
    'http://127.0.0.1:4002',
    'https://home-service-nu.vercel.app',
    /^https:\/\/home-service-.*\.vercel\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Configuração Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uqrvenlkquheajuveggv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY não configurada. Sessões expiráveis não funcionarão.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function sanitizeUserRow(row) {
  if (!row) return row;
  const { password, password_hash, reset_token, reset_token_expiry, confirmation_token, ...safe } = row;
  return safe;
}

/**
 * POST /api/login
 * Autentica o utilizador comparando senha com hash SHA256
 */
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email e senha obrigatórios.' 
      });
    }

    // Hash da senha com SHA256 (mesmo método que backend usa)
    const hash = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');

    // Buscar utilizador na tabela 'users'
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password_hash', hash)
      .single();

    if (error || !data) {
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciais inválidas.' 
      });
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Servidor não configurado (SUPABASE_SERVICE_ROLE_KEY)'
      });
    }

    // Invalidar sessões anteriores (single-session)
    const nowIso = new Date().toISOString();
    await supabase
      .from('user_sessions')
      .update({ revoked_at: nowIso, revoked_reason: 'new login' })
      .eq('user_id', data.id)
      .is('revoked_at', null);

    // Criar nova sessão (token opaco)
    const ttlHours = Number(process.env.SESSION_TTL_HOURS || 8);
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

    await supabase.from('user_sessions').insert({
      user_id: data.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      user_agent: req.headers['user-agent'] || null,
    });

    res.json({
      success: true,
      user: sanitizeUserRow({
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        status: data.status,
        phone: data.phone,
        specialty: data.specialty,
        avatar_url: data.avatar_url,
      }),
      session: { token, expiresAt }
    });
  } catch (err) {
    console.error('❌ Erro em /api/login:', err.message);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao processar login: ' + err.message 
    });
  }
});

/**
 * POST /api/session
 * Body: { action: 'validate' | 'revoke', token?: string, reason?: string }
 * Também aceita Authorization: Bearer <token>
 */
app.post('/api/session', async (req, res) => {
  try {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Servidor não configurado (SUPABASE_SERVICE_ROLE_KEY)'
      });
    }

    const action = req.body?.action;
    const auth = req.headers.authorization || '';
    const bearerMatch = typeof auth === 'string' ? auth.match(/^Bearer\s+(.+)$/i) : null;
    const token = req.body?.token || (bearerMatch ? bearerMatch[1] : null);

    if (!action || (action !== 'validate' && action !== 'revoke')) {
      return res.status(400).json({ success: false, error: 'Ação inválida' });
    }
    if (!token) {
      return res.status(401).json({ success: false, error: 'Token ausente' });
    }

    const tokenHash = hashToken(token);
    const nowIso = new Date().toISOString();

    if (action === 'revoke') {
      await supabase
        .from('user_sessions')
        .update({ revoked_at: nowIso, revoked_reason: req.body?.reason || 'logout' })
        .eq('token_hash', tokenHash)
        .is('revoked_at', null);
      return res.json({ success: true });
    }

    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('id,user_id,expires_at,revoked_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (sessionError) {
      return res.status(500).json({ success: false, error: sessionError.message });
    }

    if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) {
      return res.status(401).json({ success: false, error: 'Sessão inválida ou expirada' });
    }

    await supabase
      .from('user_sessions')
      .update({ last_seen_at: nowIso })
      .eq('id', session.id);

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id,email,name,role,status,phone,specialty,avatar_url')
      .eq('id', session.user_id)
      .single();

    if (userError) {
      return res.status(500).json({ success: false, error: userError.message });
    }

    return res.json({ success: true, user: sanitizeUserRow(user), session: { expiresAt: session.expires_at } });
  } catch (err) {
    console.error('❌ Erro em /api/session:', err.message);
    return res.status(500).json({ success: false, error: 'Erro ao processar sessão' });
  }
});

/**
 * POST /api/register
 * Cria um novo utilizador
 */
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, phone, specialty, password, role, status } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email obrigatório.' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Senha obrigatória.' });
    }

    // Hash da senha com SHA256
    const hash = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');

    const { error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        password_hash: hash,
        phone,
        specialty,
        role: role || 'professional',
        status: status || 'Pending'
      });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, message: 'Utilizador registado com sucesso.' });
  } catch (err) {
    console.error('❌ Erro em /api/register:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/change-password
 * Altera a senha de um utilizador
 */
app.post('/api/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Todos os campos são obrigatórios.' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'A nova senha deve ter pelo menos 6 caracteres.' 
      });
    }

    // Hash da senha atual
    const currentHash = crypto
      .createHash('sha256')
      .update(currentPassword)
      .digest('hex');

    // Buscar utilizador e verificar senha atual
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('password_hash', currentHash)
      .single();

    if (fetchError || !user) {
      return res.status(401).json({ 
        error: 'Senha atual inválida.' 
      });
    }

    // Hash da nova senha
    const newHash = crypto
      .createHash('sha256')
      .update(newPassword)
      .digest('hex');

    // Atualizar senha
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', userId);

    if (updateError) {
      return res.status(500).json({ 
        error: 'Erro ao atualizar senha: ' + updateError.message 
      });
    }

    res.json({ success: true, message: 'Senha alterada com sucesso.' });
  } catch (err) {
    console.error('❌ Erro em /api/change-password:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /health
 * Health check do servidor
 */
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor de autenticação em execução.' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor de autenticação rodando em http://localhost:${PORT}`);
  console.log(`📝 POST http://localhost:${PORT}/api/login - Fazer login`);
  console.log(`📝 POST http://localhost:${PORT}/api/register - Registar utilizador`);
  console.log(`📝 POST http://localhost:${PORT}/api/change-password - Alterar senha`);
  console.log(`🏥 GET http://localhost:${PORT}/health - Status do servidor`);
});

module.exports = app;

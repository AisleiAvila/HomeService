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
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

    // Sucesso - retornar dados do utilizador
    res.json({ 
      success: true, 
      user: {
        id: data.id || email,
        email: data.email,
        name: data.name,
        role: data.role,
        status: data.status,
        phone: data.phone,
        specialty: data.specialty
      } 
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

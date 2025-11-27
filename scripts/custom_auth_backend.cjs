// Backend Express para autenticação customizada usando public.users
// Requer: express, pg, cors, crypto

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('node:crypto');
const app = express();
app.use(cors({
  origin: [
    'http://localhost:4200',
    'http://localhost:3000',
    'http://127.0.0.1:4200',
    'http://127.0.0.1:3000',
    'http://localhost:4002',
    'http://127.0.0.1:4002',
    'https://home-service-nu.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Responder manualmente a preflight OPTIONS para todas as rotas
app.use(express.json());

// Carrega variáveis de ambiente do .env se existir
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uqrvenlkquheajuveggv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Cadastro de usuário
app.post('/api/register', async (req, res) => {
  const { name, email, phone, specialty, password } = req.body;
  if (!email) return res.status(400).json({ error: 'Email obrigatório.' });
  if (!password) return res.status(400).json({ error: 'Senha obrigatória.' });

  // Usa a senha enviada pelo frontend
  const tempPassword = password;
  const hash = crypto.createHash('sha256').update(tempPassword).digest('hex');
  console.log(`[Cadastro] Senha temporária recebida do frontend: ${tempPassword}`);
  console.log(`[Cadastro] Hash SHA-256 salvo: ${hash}`);

  try {
    const { error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        password_hash: hash,
        phone,
        specialty,
        role: 'professional',
        status: 'Pending'
      });
    if (error) throw error;

    // 2. Envia e-mail com a senha temporária
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const subject = 'Confirmação de cadastro - HomeService';
    const html = `<p>Olá ${name},</p>
      <p>Seu cadastro como profissional foi realizado com sucesso.<br>
      <b>Sua senha temporária para o primeiro acesso é:</b><br>
      <span style='font-size:1.2em;color:#1e293b;background:#f1f5f9;padding:4px 12px;border-radius:6px;'>${tempPassword}</span></p>
      <p>Por favor, acesse o sistema e altere sua senha após o primeiro login.</p>`;
    await fetch('http://localhost:4001/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject,
        html,
        tempPassword
      })
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login de usuário
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios.' });
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('password_hash', hash)
    .single();
  if (error || !data) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }
  res.json({ success: true, user: data });
});

// Alteração de senha
app.post('/api/change-password', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  
  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    // Verificar senha atual
    const currentHash = crypto.createHash('sha256').update(currentPassword).digest('hex');
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('password_hash', currentHash)
      .single();

    if (fetchError || !user) {
      return res.status(401).json({ error: 'Senha atual incorreta.' });
    }

    // Atualizar para nova senha
    const newHash = crypto.createHash('sha256').update(newPassword).digest('hex');
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    console.log(`[Alteração de senha] Senha alterada com sucesso para usuário ${userId}`);
    res.json({ success: true, message: 'Senha alterada com sucesso.' });
  } catch (err) {
    console.error('[Alteração de senha] Erro:', err);
    res.status(500).json({ error: 'Erro ao alterar senha.' });
  }
});

app.listen(4002, () => {
  console.log('Custom Auth backend rodando na porta 4002');
});

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('node:crypto');
const serverlessExpress = require('@vendia/serverless-express');
require('dotenv').config();

const app = express();
app.use(express.json());

const corsOptions = {
  origin: [
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'http://localhost:4002',
    'http://127.0.0.1:4002',
    'https://natan-general-service.vercel.app',
    /^https:\/\/home-service-.*\.vercel\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uqrvenlkquheajuveggv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.post('/api/register', async (req, res) => {
  const { name, email, phone, specialty, password, role, status } = req.body;
  if (!email) return res.status(400).json({ error: 'Email obrigatório.' });
  if (!password) return res.status(400).json({ error: 'Senha obrigatória.' });
  const tempPassword = password;
  const hash = crypto.createHash('sha256').update(tempPassword).digest('hex');
  try {
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
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

app.post('/api/change-password', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }
  try {
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
    const newHash = crypto.createHash('sha256').update(newPassword).digest('hex');
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', userId);
    if (updateError) {
      throw updateError;
    }
    res.json({ success: true, message: 'Senha alterada com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar senha.' });
  }
});

module.exports = (req, res) => serverlessExpress({ app })(req, res);

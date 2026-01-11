const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
// Permitir requisições do frontend (ajuste a origem conforme necessário)
app.use(cors({
  origin: [
    'http://localhost:4200',
    'http://localhost:4002',
    'http://127.0.0.1:4200',
    'https://natan-general-service.vercel.app'
  ],
  credentials: true
}));app.use(bodyParser.json());

// Configure com suas variáveis reais
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uqrvenlkquheajuveggv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Endpoint de confirmação de e-mail
app.post('/api/confirm-email', async (req, res) => {
  const { email, token } = req.body;
  if (!email || !token) {
    return res.status(400).json({ success: false, message: 'Email e token são obrigatórios.' });
  }

  // Busca usuário pelo e-mail e token
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('confirmation_token', token)
    .single();

  if (error || !user) {
    return res.status(404).json({ success: false, message: 'Usuário não encontrado ou token inválido.' });
  }

  // Atualiza email_verified
  const { error: updateError } = await supabase
    .from('users')
    .update({ email_verified: true, confirmation_token: null })
    .eq('id', user.id);

  if (updateError) {
    return res.status(500).json({ success: false, message: 'Erro ao atualizar usuário.' });
  }

  return res.json({ success: true, message: 'E-mail confirmado com sucesso.' });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Servidor de confirmação de e-mail rodando na porta ${PORT}`);
});

// Vercel Function para autenticação customizada
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const supabaseUrl = process.env.SUPABASE_URL || 'https://uqrvenlkquheajuveggv.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      console.log('[LOGIN] Body inválido:', body);
      return res.status(400).json({ success: false, error: 'Body inválido' });
    }
  }
  const { email, password } = body || {};
  console.log('[LOGIN] Tentativa de login:', { email, passwordRecebida: password });

  // Buscar usuário na tabela users
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  console.log('[LOGIN] Resultado busca usuário:', { user, error });

  if (error || !user) {
    console.log('[LOGIN] Usuário não encontrado ou erro:', { error });
    return res.status(401).json({ success: false, error: 'Credenciais inválidas' });
  }

  // Validar senha (ajuste conforme sua lógica: texto puro ou hash)
  if (user.password_hash) {
    // Calcular hash SHA-256 da senha recebida
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    console.log('[LOGIN] Comparando password_hash:', { password_hash: user.password_hash, passwordRecebida: password, hashCalculado: hash });
    if (user.password_hash !== hash) {
      console.log('[LOGIN] Senha inválida para usuário:', { email, password_hash: user.password_hash, passwordRecebida: password, hashCalculado: hash });
      return res.status(401).json({ success: false, error: 'Credenciais inválidas' });
    }
  } else if (user.password) {
    console.log('[LOGIN] Comparando password:', { password: user.password, passwordRecebida: password });
    if (user.password !== password) {
      console.log('[LOGIN] Senha inválida para usuário:', { email, password: user.password, passwordRecebida: password });
      return res.status(401).json({ success: false, error: 'Credenciais inválidas' });
    }
  }

  // Login bem-sucedido
  console.log('[LOGIN] Login bem-sucedido:', { user });
  return res.status(200).json({
    success: true,
    user
  });
}

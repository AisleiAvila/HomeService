// Vercel Function para autenticação customizada
import { createClient } from '@supabase/supabase-js';

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
  console.log('[LOGIN] Tentativa de login:', { email });

  // Buscar usuário na tabela users
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) {
    console.log('[LOGIN] Usuário não encontrado ou erro:', { error });
    return res.status(401).json({ success: false, error: 'Credenciais inválidas' });
  }

  // Validar senha (ajuste conforme sua lógica: texto puro ou hash)
  if (user.password_hash) {
    // Exemplo: comparar hash (ajuste para sua lógica real)
    // Aqui apenas compara texto puro para exemplo
    if (user.password_hash !== password) {
      console.log('[LOGIN] Senha inválida para usuário:', email);
      return res.status(401).json({ success: false, error: 'Credenciais inválidas' });
    }
  } else if (user.password && user.password !== password) {
    console.log('[LOGIN] Senha inválida para usuário:', email);
    return res.status(401).json({ success: false, error: 'Credenciais inválidas' });
  }

  // Login bem-sucedido
  console.log('[LOGIN] Login bem-sucedido:', { user });
  return res.status(200).json({
    success: true,
    user
  });
}

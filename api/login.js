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

  // Autenticação real via Supabase
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  console.log('[LOGIN] Resultado Supabase:', { error, session: data?.session, user: data?.user });

  if (error || !data.session) {
    console.log('[LOGIN] Erro ou sessão inválida:', { error, session: data?.session });
    return res.status(401).json({ success: false, error: error?.message || 'Credenciais inválidas' });
  }

  // Retorne o objeto de sessão completo
  console.log('[LOGIN] Login bem-sucedido:', { user: data.session.user });
  return res.status(200).json({
    success: true,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
      user: data.session.user
    }
  });
}

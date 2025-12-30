// Vercel Function para autenticação customizada
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const supabaseUrl = process.env.SUPABASE_URL || 'https://uqrvenlkquheajuveggv.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getSupabaseClient() {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Servidor não configurado (SUPABASE_SERVICE_ROLE_KEY)'
      });
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

    // Invalidar sessões anteriores (single-session)
    const nowIso = new Date().toISOString();
    const { error: revokeError } = await supabase
      .from('user_sessions')
      .update({ revoked_at: nowIso, revoked_reason: 'new login' })
      .eq('user_id', user.id)
      .is('revoked_at', null);

    if (revokeError) {
      console.error('[LOGIN] Erro ao revogar sessões:', revokeError);
      return res.status(500).json({ success: false, error: 'Erro ao iniciar sessão (revoke)' });
    }

    // Criar nova sessão (token opaco)
    const ttlHours = Number(process.env.SESSION_TTL_HOURS || 8);
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from('user_sessions').insert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      user_agent: req.headers['user-agent'] || null,
    });

    if (insertError) {
      console.error('[LOGIN] Erro ao criar sessão:', insertError);
      return res.status(500).json({ success: false, error: 'Erro ao criar sessão' });
    }

    // Remover campos sensíveis (sem redeclarar "password" do body)
    const {
      password: _password,
      password_hash: _password_hash,
      reset_token: _reset_token,
      reset_token_expiry: _reset_token_expiry,
      confirmation_token: _confirmation_token,
      ...safeUser
    } = user || {};

    return res.status(200).json({
      success: true,
      user: safeUser,
      session: { token, expiresAt }
    });
  } catch (e) {
    console.error('[LOGIN] Unhandled error:', e);
    return res.status(500).json({ success: false, error: 'Erro interno no login' });
  }
}

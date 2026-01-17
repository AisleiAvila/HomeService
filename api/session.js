import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

function parseJsonBody(req) {
  const body = req.body;
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header || typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

async function getPublicUserById(supabase, userId) {
  const { data, error } = await supabase
    .from('users')
    .select('id,email,name,role,status,phone,specialty,avatar_url')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(500).json({
      success: false,
      error: 'Servidor não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)'
    });
  }

  const body = parseJsonBody(req);
  const action = body.action;
  const token = body.token || getBearerToken(req);

  if (!action || (action !== 'validate' && action !== 'revoke')) {
    return res.status(400).json({ success: false, error: 'Ação inválida' });
  }

  const nowIso = new Date().toISOString();

  if (!token || typeof token !== 'string') {
    return res
      .status(401)
      .json({ success: false, error: 'Token ausente', serverNow: nowIso });
  }

  const tokenHash = hashToken(token);

  try {
    if (action === 'revoke') {
      await supabase
        .from('user_sessions')
        .update({ revoked_at: nowIso, revoked_reason: body.reason || 'logout' })
        .eq('token_hash', tokenHash)
        .is('revoked_at', null);

      return res.status(200).json({ success: true });
    }

    // validate
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('id,user_id,expires_at,revoked_at,revoked_reason')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (sessionError) throw sessionError;

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Sessão não encontrada',
        serverNow: nowIso
      });
    }

    if (session.revoked_at) {
      return res.status(401).json({
        success: false,
        error: 'Sessão revogada',
        revokedReason: session.revoked_reason || null,
        serverNow: nowIso
      });
    }

    if (new Date(session.expires_at).getTime() <= Date.now()) {
      return res.status(401).json({
        success: false,
        error: 'Sessão expirada',
        serverNow: nowIso
      });
    }

    // touch session
    await supabase
      .from('user_sessions')
      .update({ last_seen_at: nowIso })
      .eq('id', session.id);

    const user = await getPublicUserById(supabase, session.user_id);

    return res.status(200).json({
      success: true,
      user,
      session: { expiresAt: session.expires_at },
      serverNow: nowIso
    });
  } catch (e) {
    console.error('[SESSION] Error:', e);
    return res.status(500).json({ success: false, error: 'Erro ao processar sessão' });
  }
}

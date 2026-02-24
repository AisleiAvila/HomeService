// Vercel Function para autenticação customizada
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { assertStrictUserTenant, isSuperUserRole, resolveTenantByRequest } from './_tenant.js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://uqrvenlkquheajuveggv.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getSupabaseClient() {
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

  async function getActiveTenantById(supabase, tenantId) {
    if (!tenantId) return null;
    const { data, error } = await supabase
      .from('tenants')
      .select('id,slug,subdomain,status')
      .eq('id', tenantId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    return data || null;
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
    console.log('[LOGIN] Tentativa de login:', { email });

    // Buscar usuário na tabela users
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    let resolvedTenant = null;
    try {
      const tenantResult = await resolveTenantByRequest(req, supabase);
      resolvedTenant = tenantResult.tenant;
    } catch (tenantError) {
      console.warn('[LOGIN] Falha ao resolver tenant por subdomínio:', tenantError?.message || tenantError);
    }

    console.log('[LOGIN] Resultado busca usuário:', { user, error });

    if (error || !user) {
      console.log('[LOGIN] Usuário não encontrado ou erro:', { error });
      return res.status(401).json({ success: false, error: 'Credenciais inválidas' });
    }

    const isSuperUser = isSuperUserRole(user?.role);

    if (!resolvedTenant && !isSuperUser && user?.tenant_id) {
      try {
        resolvedTenant = await getActiveTenantById(supabase, user.tenant_id);
        if (resolvedTenant) {
          console.warn('[LOGIN] Tenant resolvido por fallback do usuário (tenant_id).');
        }
      } catch (fallbackTenantError) {
        console.warn('[LOGIN] Falha no fallback de tenant por usuário:', fallbackTenantError?.message || fallbackTenantError);
      }
    }

    if (!resolvedTenant && !isSuperUser) {
      return res.status(403).json({
        success: false,
        error: 'Tenant não resolvido para este host/subdomínio'
      });
    }

    if (resolvedTenant && !isSuperUser && !assertStrictUserTenant(user.tenant_id, resolvedTenant)) {
      return res.status(403).json({
        success: false,
        error: 'Usuário não pertence ao tenant deste subdomínio'
      });
    }

    if (resolvedTenant && isSuperUser) {
      const { data: canAccessTenant, error: accessError } = await supabase.rpc('user_can_access_tenant', {
        p_user_id: user.id,
        p_tenant_id: resolvedTenant.id,
      });

      if (accessError) {
        console.error('[LOGIN] Erro ao validar acesso do super usuário ao tenant:', accessError);
        return res.status(500).json({ success: false, error: 'Erro ao validar acesso ao tenant' });
      }

      if (!canAccessTenant) {
        return res.status(403).json({
          success: false,
          error: 'Super usuário sem acesso ao tenant solicitado'
        });
      }
    }

    // Validar senha (ajuste conforme sua lógica: texto puro ou hash)
    if (user.password_hash) {
      // Calcular hash SHA-256 da senha recebida
      const hash = crypto.createHash('sha256').update(password).digest('hex');
      if (user.password_hash !== hash) {
        console.log('[LOGIN] Senha inválida para usuário:', { email });
        return res.status(401).json({ success: false, error: 'Credenciais inválidas' });
      }
    } else if (user.password) {
      if (user.password !== password) {
        console.log('[LOGIN] Senha inválida para usuário:', { email });
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

    const sessionInsertPayload = {
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      user_agent: req.headers['user-agent'] || null,
      tenant_id: resolvedTenant?.id || user.tenant_id || null,
      active_tenant_id: resolvedTenant?.id || user.tenant_id || null,
    };

    let insertError = null;
    {
      const insertResult = await supabase.from('user_sessions').insert(sessionInsertPayload);
      insertError = insertResult.error;
    }

    if (insertError && String(insertError.message || '').toLowerCase().includes('tenant_id')) {
      const fallbackInsert = await supabase.from('user_sessions').insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        user_agent: req.headers['user-agent'] || null,
      });
      insertError = fallbackInsert.error;
    }

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
      session: { token, expiresAt },
      tenant: resolvedTenant || null
    });
  } catch (e) {
    console.error('[LOGIN] Unhandled error:', e);
    return res.status(500).json({ success: false, error: 'Erro interno no login' });
  }
}

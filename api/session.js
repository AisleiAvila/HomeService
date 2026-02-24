import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { assertStrictUserTenant, isSuperUserRole, resolveTenantByRequest } from './_tenant.js';

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
    .select('id,email,name,role,status,phone,specialty,avatar_url,tenant_id')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

async function getTenantById(supabase, tenantId) {
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

async function getAccessibleTenantsForUser(supabase, user) {
  if (isSuperUserRole(user?.role)) {
    const { data: allTenants, error: allTenantsError } = await supabase
      .from('tenants')
      .select('id,slug,subdomain,status,name')
      .eq('status', 'active')
      .order('name', { ascending: true });

    if (allTenantsError) throw allTenantsError;
    return allTenants || [];
  }

  const tenantIds = new Set();

  if (user?.tenant_id) {
    tenantIds.add(String(user.tenant_id));
  }

  const { data: mappedTenants, error: mappedError } = await supabase
    .from('user_tenant_access')
    .select('tenant_id,is_active')
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (mappedError) throw mappedError;

  for (const row of mappedTenants || []) {
    if (row?.tenant_id) {
      tenantIds.add(String(row.tenant_id));
    }
  }

  if (tenantIds.size === 0) return [];

  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id,slug,subdomain,status,name')
    .in('id', Array.from(tenantIds))
    .eq('status', 'active')
    .order('name', { ascending: true });

  if (tenantsError) throw tenantsError;
  return tenants || [];
}

async function writeSuperAuditLog(supabase, payload) {
  const { error } = await supabase
    .from('super_user_audit_log')
    .insert(payload);

  if (error) {
    console.warn('[SESSION] Falha ao gravar auditoria super_user:', error?.message || error);
  }
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

  if (!action || (action !== 'validate' && action !== 'revoke' && action !== 'list_tenants' && action !== 'switch_tenant')) {
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
    let resolvedTenant = null;
    try {
      const tenantResult = await resolveTenantByRequest(req, supabase);
      resolvedTenant = tenantResult.tenant;
    } catch (tenantError) {
      console.warn('[SESSION] Falha ao resolver tenant por subdomínio:', tenantError?.message || tenantError);
    }

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
      .select('id,user_id,expires_at,revoked_at,revoked_reason,tenant_id,active_tenant_id')
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
      const revokedReason = session.revoked_reason || null;
      const friendlyMessage =
        revokedReason === 'new login'
          ? 'Sessão encerrada: login realizado em outro dispositivo.'
          : 'Sessão revogada';

      return res.status(401).json({
        success: false,
        error: friendlyMessage,
        revokedReason,
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

    const isSuperUser = isSuperUserRole(user?.role);

    if (!resolvedTenant?.id && !isSuperUser && user?.tenant_id) {
      try {
        resolvedTenant = await getTenantById(supabase, user.tenant_id);
        if (resolvedTenant?.id) {
          console.warn('[SESSION] Tenant resolvido por fallback do usuário (tenant_id).');
        }
      } catch (fallbackTenantError) {
        console.warn('[SESSION] Falha no fallback de tenant por usuário:', fallbackTenantError?.message || fallbackTenantError);
      }
    }

    if (!isSuperUser && !resolvedTenant?.id) {
      return res.status(403).json({
        success: false,
        error: 'Tenant não resolvido para este host/subdomínio',
        serverNow: nowIso
      });
    }

    if (!isSuperUser && !assertStrictUserTenant(user?.tenant_id, resolvedTenant)) {
      return res.status(403).json({
        success: false,
        error: 'Sessão não pertence ao tenant deste subdomínio',
        serverNow: nowIso
      });
    }

    if (isSuperUser && action === 'list_tenants') {
      const tenants = await getAccessibleTenantsForUser(supabase, user);
      return res.status(200).json({
        success: true,
        user,
        tenants,
        activeTenantId: session.active_tenant_id || null,
        serverNow: nowIso,
      });
    }

    if (isSuperUser && action === 'switch_tenant') {
      const targetTenantId = String(body.tenantId || '').trim();
      const reason = String(body.reason || '').trim() || null;

      if (!targetTenantId) {
        return res.status(400).json({ success: false, error: 'tenantId é obrigatório', serverNow: nowIso });
      }

      const { data: canAccessTenant, error: accessError } = await supabase.rpc('user_can_access_tenant', {
        p_user_id: user.id,
        p_tenant_id: targetTenantId,
      });

      if (accessError) {
        return res.status(500).json({ success: false, error: 'Erro ao validar acesso ao tenant', serverNow: nowIso });
      }

      if (!canAccessTenant) {
        await writeSuperAuditLog(supabase, {
          actor_user_id: user.id,
          actor_role: user.role,
          action: 'switch_tenant',
          target_tenant_id: targetTenantId,
          request_path: req.url || '/api/session',
          request_method: req.method || 'POST',
          ip_address: req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || null,
          user_agent: req.headers?.['user-agent'] || null,
          reason,
          before_state: { active_tenant_id: session.active_tenant_id || null },
          after_state: null,
          success: false,
          error_message: 'Super usuário sem acesso ao tenant solicitado',
        });

        return res.status(403).json({ success: false, error: 'Sem acesso ao tenant solicitado', serverNow: nowIso });
      }

      const beforeState = {
        active_tenant_id: session.active_tenant_id || null,
        tenant_id: session.tenant_id || null,
      };

      const { error: switchError } = await supabase
        .from('user_sessions')
        .update({
          active_tenant_id: targetTenantId,
          tenant_id: targetTenantId,
          last_seen_at: nowIso,
        })
        .eq('id', session.id);

      if (switchError) {
        return res.status(500).json({ success: false, error: 'Falha ao atualizar tenant ativo da sessão', serverNow: nowIso });
      }

      const tenant = await getTenantById(supabase, targetTenantId);

      await writeSuperAuditLog(supabase, {
        actor_user_id: user.id,
        actor_role: user.role,
        action: 'switch_tenant',
        target_tenant_id: targetTenantId,
        request_path: req.url || '/api/session',
        request_method: req.method || 'POST',
        ip_address: req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || null,
        user_agent: req.headers?.['user-agent'] || null,
        reason,
        before_state: beforeState,
        after_state: { active_tenant_id: targetTenantId, tenant_id: targetTenantId },
        success: true,
      });

      return res.status(200).json({
        success: true,
        user,
        tenant,
        activeTenantId: targetTenantId,
        serverNow: nowIso,
      });
    }

    let effectiveTenant = null;

    if (isSuperUser) {
      const requestedTenantId = resolvedTenant?.id || session.active_tenant_id || null;

      if (requestedTenantId) {
        const { data: canAccessTenant, error: accessError } = await supabase.rpc('user_can_access_tenant', {
          p_user_id: user.id,
          p_tenant_id: requestedTenantId,
        });

        if (accessError) {
          return res.status(500).json({ success: false, error: 'Erro ao validar tenant ativo', serverNow: nowIso });
        }

        if (!canAccessTenant) {
          return res.status(403).json({ success: false, error: 'Tenant ativo inválido para este super usuário', serverNow: nowIso });
        }

        if (String(session.active_tenant_id || '') !== String(requestedTenantId)) {
          await supabase
            .from('user_sessions')
            .update({ active_tenant_id: requestedTenantId, tenant_id: requestedTenantId, last_seen_at: nowIso })
            .eq('id', session.id);
        }

        effectiveTenant = await getTenantById(supabase, requestedTenantId);
      }
    } else {
      effectiveTenant = resolvedTenant || null;
    }

    return res.status(200).json({
      success: true,
      user,
      session: { expiresAt: session.expires_at },
      tenant: effectiveTenant,
      serverNow: nowIso
    });
  } catch (e) {
    console.error('[SESSION] Error:', e);
    return res.status(500).json({ success: false, error: 'Erro ao processar sessão' });
  }
}

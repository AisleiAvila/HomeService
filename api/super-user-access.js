import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { isSuperUserRole } from './_tenant.js';

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

async function getSessionAndActor(supabase, tokenHash) {
  const { data: session, error: sessionError } = await supabase
    .from('user_sessions')
    .select('id,user_id,expires_at,revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (sessionError) throw sessionError;

  if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) {
    return { session: null, actor: null };
  }

  const { data: actor, error: actorError } = await supabase
    .from('users')
    .select('id,email,name,role,status,tenant_id')
    .eq('id', session.user_id)
    .single();

  if (actorError) throw actorError;

  return { session, actor };
}

async function writeAudit(supabase, payload) {
  const { error } = await supabase
    .from('super_user_audit_log')
    .insert(payload);

  if (error) {
    console.warn('[SUPER_USER_ACCESS] Falha ao gravar auditoria:', error?.message || error);
  }
}

const ALLOWED_ACTIONS = new Set(['list_users', 'get_user_tenants', 'grant_access', 'revoke_access', 'list_audit']);

function isAllowedAction(action) {
  return typeof action === 'string' && ALLOWED_ACTIONS.has(action);
}

async function listSuperUsers(supabase) {
  const { data, error } = await supabase
    .from('users')
    .select('id,email,name,role,status,tenant_id')
    .eq('role', 'super_user')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function listAuditEntries(supabase, body) {
  const requestedUserId = body.userId == null ? null : Number(body.userId);
  const limitRaw = Number(body.limit);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 100)) : 30;

  let query = supabase
    .from('super_user_audit_log')
    .select('id,created_at,actor_user_id,actor_role,action,target_tenant_id,target_resource,target_resource_id,reason,success')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (Number.isFinite(requestedUserId)) {
    query = query
      .eq('target_resource', 'user_tenant_access')
      .like('target_resource_id', `${requestedUserId}:%`);
  }

  const { data: rows, error: rowsError } = await query;
  if (rowsError) throw rowsError;

  return rows || [];
}

async function getTargetSuperUser(supabase, targetUserId) {
  const { data: targetUser, error: targetUserError } = await supabase
    .from('users')
    .select('id,email,name,role,tenant_id,status')
    .eq('id', targetUserId)
    .single();

  if (targetUserError || !targetUser) {
    return { ok: false, status: 404, error: 'Usuário alvo não encontrado' };
  }

  if (!isSuperUserRole(targetUser.role)) {
    return { ok: false, status: 400, error: 'A gestão de acessos é permitida apenas para usuários com role super_user' };
  }

  return { ok: true, targetUser };
}

async function getUserTenants(supabase, targetUserId, targetUser) {
  const { data: mappings, error: mappingsError } = await supabase
    .from('user_tenant_access')
    .select('tenant_id,is_active,granted_reason,created_at,updated_at')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false });

  if (mappingsError) throw mappingsError;

  const tenantIds = new Set();
  if (targetUser.tenant_id) {
    tenantIds.add(String(targetUser.tenant_id));
  }

  for (const item of mappings || []) {
    if (item?.tenant_id) {
      tenantIds.add(String(item.tenant_id));
    }
  }

  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id,name,slug,subdomain,status')
    .in('id', Array.from(tenantIds))
    .order('name', { ascending: true });

  if (tenantsError) throw tenantsError;

  return {
    user: targetUser,
    tenants: tenants || [],
    mappings: mappings || [],
  };
}

async function resolveTenant(supabase, tenantId) {
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id,name,slug,subdomain,status')
    .eq('id', tenantId)
    .single();

  if (tenantError || !tenant) {
    return null;
  }

  return tenant;
}

async function grantTenantAccess({ supabase, actor, targetUserId, tenantId, reason, nowIso, req }) {
  const { error: grantError } = await supabase
    .from('user_tenant_access')
    .upsert({
      user_id: targetUserId,
      tenant_id: tenantId,
      is_active: true,
      granted_by: actor.id,
      granted_reason: reason,
      updated_at: nowIso,
    }, { onConflict: 'user_id,tenant_id' });

  if (grantError) throw grantError;

  await writeAudit(supabase, {
    actor_user_id: actor.id,
    actor_role: actor.role,
    action: 'grant_tenant_access',
    target_tenant_id: tenantId,
    target_resource: 'user_tenant_access',
    target_resource_id: `${targetUserId}:${tenantId}`,
    request_path: req.url || '/api/super-user-access',
    request_method: req.method || 'POST',
    ip_address: req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || null,
    user_agent: req.headers?.['user-agent'] || null,
    reason,
    before_state: null,
    after_state: { user_id: targetUserId, tenant_id: tenantId, is_active: true },
    success: true,
  });
}

async function revokeTenantAccess({ supabase, actor, targetUserId, tenantId, reason, nowIso, req }) {
  const { data: beforeRow, error: beforeError } = await supabase
    .from('user_tenant_access')
    .select('user_id,tenant_id,is_active,granted_reason,updated_at')
    .eq('user_id', targetUserId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (beforeError) throw beforeError;

  const { error: revokeError } = await supabase
    .from('user_tenant_access')
    .update({ is_active: false, updated_at: nowIso, granted_reason: reason || beforeRow?.granted_reason || null })
    .eq('user_id', targetUserId)
    .eq('tenant_id', tenantId);

  if (revokeError) throw revokeError;

  await writeAudit(supabase, {
    actor_user_id: actor.id,
    actor_role: actor.role,
    action: 'revoke_tenant_access',
    target_tenant_id: tenantId,
    target_resource: 'user_tenant_access',
    target_resource_id: `${targetUserId}:${tenantId}`,
    request_path: req.url || '/api/super-user-access',
    request_method: req.method || 'POST',
    ip_address: req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || null,
    user_agent: req.headers?.['user-agent'] || null,
    reason,
    before_state: beforeRow || null,
    after_state: { user_id: targetUserId, tenant_id: tenantId, is_active: false },
    success: true,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(500).json({
      success: false,
      error: 'Servidor não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)',
    });
  }

  const body = parseJsonBody(req);
  const action = body.action;
  const token = body.token || getBearerToken(req);

  if (!isAllowedAction(action)) {
    return res.status(400).json({ success: false, error: 'Ação inválida' });
  }

  if (!token || typeof token !== 'string') {
    return res.status(401).json({ success: false, error: 'Token ausente' });
  }

  const nowIso = new Date().toISOString();
  const tokenHash = hashToken(token);

  try {
    const { session, actor } = await getSessionAndActor(supabase, tokenHash);
    if (!session || !actor) {
      return res.status(401).json({ success: false, error: 'Sessão inválida ou expirada', serverNow: nowIso });
    }

    if (!isSuperUserRole(actor.role)) {
      return res.status(403).json({ success: false, error: 'Apenas super usuário pode operar este endpoint' });
    }

    if (action === 'list_users') {
      const users = await listSuperUsers(supabase);
      return res.status(200).json({ success: true, users });
    }

    if (action === 'list_audit') {
      const logs = await listAuditEntries(supabase, body);
      return res.status(200).json({ success: true, logs });
    }

    const targetUserId = Number(body.userId);
    if (!Number.isFinite(targetUserId)) {
      return res.status(400).json({ success: false, error: 'userId inválido' });
    }

    const targetUserResult = await getTargetSuperUser(supabase, targetUserId);
    if (!targetUserResult.ok) {
      return res.status(targetUserResult.status).json({ success: false, error: targetUserResult.error });
    }
    const targetUser = targetUserResult.targetUser;

    if (action === 'get_user_tenants') {
      const payload = await getUserTenants(supabase, targetUserId, targetUser);
      return res.status(200).json({ success: true, ...payload });
    }

    const tenantId = String(body.tenantId || '').trim();
    const reason = String(body.reason || '').trim() || null;

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'tenantId é obrigatório' });
    }

    const tenant = await resolveTenant(supabase, tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant não encontrado' });
    }

    if (action === 'grant_access') {
      await grantTenantAccess({ supabase, actor, targetUserId, tenantId, reason, nowIso, req });

      return res.status(200).json({ success: true, user: targetUser, tenant });
    }

    await revokeTenantAccess({ supabase, actor, targetUserId, tenantId, reason, nowIso, req });

    return res.status(200).json({ success: true, user: targetUser, tenant });
  } catch (error) {
    console.error('[SUPER_USER_ACCESS] Error:', error);
    return res.status(500).json({ success: false, error: 'Erro ao processar ação de acesso super usuário' });
  }
}

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { isSuperUserRole } from './_tenant.js';

const ALLOWED_ACTIONS = new Set(['get_profile', 'update_profile', 'get_menu_settings', 'update_menu_settings']);
const TENANT_PROFILE_SELECT = 'id,name,slug,subdomain,status,phone,contact_email,address,locality,postal_code,logo_image_data,updated_at,updated_by';
const TENANT_MENU_ROLE_SET = new Set([
  'admin',
  'super_user',
  'professional',
  'professional_almoxarife',
  'almoxarife',
  'secretario',
]);

const TENANT_MENU_ITEM_SET = new Set([
  'dashboard',
  'schedule',
  'agenda',
  'profile',
  'daily-mileage',
  'mileage-report',
  'details',
  'create-service-request',
  'admin-create-service-request',
  'overview',
  'requests',
  'approvals',
  'finances',
  'stock-intake',
  'clients',
  'tenants',
  'categories',
  'extra-services',
]);

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

function isAdminRole(role) {
  return String(role || '').toLowerCase() === 'admin';
}

function normalizeOptionalText(value) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function validateEmail(email) {
  if (!email) return true;
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);
}

function validatePostalCode(postalCode) {
  if (!postalCode) return true;
  return /^\d{4}-\d{3}$/.test(postalCode);
}

function validateLogoImageData(logoImageData) {
  if (!logoImageData) return true;
  if (typeof logoImageData !== 'string') return false;

  const matches = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(logoImageData);
  if (!matches) {
    return false;
  }

  return logoImageData.length <= 3_500_000;
}

function parseUpdatePayload(rawData) {
  const data = rawData && typeof rawData === 'object' ? rawData : {};

  const candidate = {
    name: normalizeOptionalText(data.name),
    phone: normalizeOptionalText(data.phone),
    contact_email: normalizeOptionalText(data.contact_email),
    address: normalizeOptionalText(data.address),
    locality: normalizeOptionalText(data.locality),
    postal_code: normalizeOptionalText(data.postal_code),
    logo_image_data: normalizeOptionalText(data.logo_image_data),
    status: normalizeOptionalText(data.status),
  };

  if (!candidate.name) {
    return { ok: false, error: 'Nome do tenant é obrigatório' };
  }

  if (candidate.status !== 'active' && candidate.status !== 'inactive') {
    return { ok: false, error: 'Status do tenant inválido (use active/inactive)' };
  }

  if (!validateEmail(candidate.contact_email)) {
    return { ok: false, error: 'Email de contacto inválido' };
  }

  if (!validatePostalCode(candidate.postal_code)) {
    return { ok: false, error: 'Código postal inválido (formato esperado: XXXX-XXX)' };
  }

  if (!validateLogoImageData(candidate.logo_image_data)) {
    return { ok: false, error: 'Imagem do logo inválida (use PNG/JPG/WEBP em base64)' };
  }

  return { ok: true, updates: candidate };
}

function normalizeMenuItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  const deduped = new Set();
  for (const rawItem of items) {
    const item = String(rawItem || '').trim();
    if (!item || !TENANT_MENU_ITEM_SET.has(item)) {
      continue;
    }
    deduped.add(item);
  }

  return Array.from(deduped);
}

function parseMenuSettingsPayload(rawData) {
  const payload = rawData && typeof rawData === 'object' ? rawData : {};
  const role = String(payload.role || '').trim();

  if (!TENANT_MENU_ROLE_SET.has(role)) {
    return { ok: false, error: 'Role inválida para configuração de menu' };
  }

  if (!Array.isArray(payload.enabled_items)) {
    return { ok: false, error: 'enabled_items deve ser uma lista' };
  }

  const enabledItems = normalizeMenuItems(payload.enabled_items);
  if (enabledItems.length === 0) {
    return { ok: false, error: 'Selecione pelo menos um item de menu válido' };
  }

  return {
    ok: true,
    settings: {
      role,
      enabled_items: enabledItems,
    },
  };
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

async function resolveTargetTenantId(actor, requestedTenantId) {
  if (isSuperUserRole(actor?.role)) {
    const tenantId = String(requestedTenantId || '').trim();
    if (!tenantId) {
      return { ok: false, status: 400, error: 'tenantId é obrigatório para super_user' };
    }
    return { ok: true, tenantId };
  }

  if (isAdminRole(actor?.role)) {
    if (!actor?.tenant_id) {
      return { ok: false, status: 400, error: 'Administrador sem tenant associado' };
    }
    return { ok: true, tenantId: String(actor.tenant_id) };
  }

  return { ok: false, status: 403, error: 'Apenas admin e super_user podem gerir tenant' };
}

async function assertCanEditTenant(supabase, actor, tenantId) {
  if (isAdminRole(actor?.role)) {
    if (!actor?.tenant_id || String(actor.tenant_id) !== String(tenantId)) {
      return { ok: false, status: 403, error: 'Sem permissão para editar este tenant' };
    }
    return { ok: true };
  }

  if (!isSuperUserRole(actor?.role)) {
    return { ok: false, status: 403, error: 'Apenas admin e super_user podem gerir tenant' };
  }

  const { data: canEdit, error } = await supabase.rpc('user_can_edit_tenant', {
    p_user_id: actor.id,
    p_tenant_id: tenantId,
  });

  if (!error) {
    if (!canEdit) {
      return { ok: false, status: 403, error: 'Sem permissão para editar este tenant' };
    }
    return { ok: true };
  }

  const errorMessage = String(error.message || '');
  const isMissingFunction =
    errorMessage.includes('user_can_edit_tenant') &&
    errorMessage.includes('does not exist');

  if (isMissingFunction) {
    return { ok: true };
  }

  return { ok: false, status: 500, error: 'Erro ao validar acesso de edição do tenant' };
}

async function readTenantProfile(supabase, tenantId) {
  const { data, error } = await supabase
    .from('tenants')
    .select(TENANT_PROFILE_SELECT)
    .eq('id', tenantId)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, error: 'Erro ao carregar perfil do tenant' };
  }

  if (!data) {
    return { ok: false, status: 404, error: 'Tenant não encontrado' };
  }

  return { ok: true, tenant: data };
}

async function updateTenantProfile(supabase, tenantId, updates) {
  const { data, error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', tenantId)
    .select(TENANT_PROFILE_SELECT)
    .single();

  if (error) {
    return { ok: false, status: 500, error: 'Erro ao atualizar perfil do tenant' };
  }

  return { ok: true, tenant: data };
}

async function readTenantMenuSettings(supabase, tenantId) {
  const { data, error } = await supabase
    .from('tenant_menu_settings')
    .select('tenant_id,role,enabled_items,updated_at,updated_by')
    .eq('tenant_id', tenantId)
    .in('role', Array.from(TENANT_MENU_ROLE_SET))
    .order('role', { ascending: true });

  if (error) {
    return { ok: false, status: 500, error: 'Erro ao carregar configuração de menu do tenant' };
  }

  return {
    ok: true,
    settings: (data || []).map((entry) => ({
      tenant_id: entry.tenant_id,
      role: entry.role,
      enabled_items: normalizeMenuItems(entry.enabled_items),
      updated_at: entry.updated_at || null,
      updated_by: entry.updated_by || null,
    })),
  };
}

async function updateTenantMenuSettings(supabase, tenantId, settings, actorId, nowIso) {
  const { data, error } = await supabase
    .from('tenant_menu_settings')
    .upsert(
      {
        tenant_id: tenantId,
        role: settings.role,
        enabled_items: settings.enabled_items,
        updated_by: actorId,
        updated_at: nowIso,
      },
      {
        onConflict: 'tenant_id,role',
      }
    )
    .select('tenant_id,role,enabled_items,updated_at,updated_by')
    .single();

  if (error) {
    return { ok: false, status: 500, error: 'Erro ao atualizar configuração de menu do tenant' };
  }

  return {
    ok: true,
    setting: {
      tenant_id: data.tenant_id,
      role: data.role,
      enabled_items: normalizeMenuItems(data.enabled_items),
      updated_at: data.updated_at || null,
      updated_by: data.updated_by || null,
    },
  };
}

function toApiError(status, error, nowIso) {
  return {
    status,
    body: { success: false, error, serverNow: nowIso },
  };
}

async function executeGetProfileAction(supabase, targetTenantId, nowIso) {
  const tenantResult = await readTenantProfile(supabase, targetTenantId);
  if (!tenantResult.ok) {
    return toApiError(tenantResult.status, tenantResult.error, nowIso);
  }

  return {
    status: 200,
    body: { success: true, tenant: tenantResult.tenant, serverNow: nowIso },
  };
}

async function executeGetMenuSettingsAction(supabase, targetTenantId, nowIso) {
  const settingsResult = await readTenantMenuSettings(supabase, targetTenantId);
  if (!settingsResult.ok) {
    return toApiError(settingsResult.status, settingsResult.error, nowIso);
  }

  return {
    status: 200,
    body: {
      success: true,
      tenantId: targetTenantId,
      settings: settingsResult.settings,
      serverNow: nowIso,
    },
  };
}

async function executeUpdateMenuSettingsAction(supabase, targetTenantId, body, actorId, nowIso) {
  const payloadResult = parseMenuSettingsPayload(body.data);
  if (!payloadResult.ok) {
    return toApiError(400, payloadResult.error, nowIso);
  }

  const updateResult = await updateTenantMenuSettings(
    supabase,
    targetTenantId,
    payloadResult.settings,
    actorId,
    nowIso,
  );

  if (!updateResult.ok) {
    return toApiError(updateResult.status, updateResult.error, nowIso);
  }

  return {
    status: 200,
    body: {
      success: true,
      tenantId: targetTenantId,
      setting: updateResult.setting,
      serverNow: nowIso,
    },
  };
}

async function executeUpdateProfileAction(supabase, targetTenantId, body, actorId, nowIso) {
  const payloadResult = parseUpdatePayload(body.data);
  if (!payloadResult.ok) {
    return toApiError(400, payloadResult.error, nowIso);
  }

  const tenantResult = await updateTenantProfile(supabase, targetTenantId, {
    ...payloadResult.updates,
    updated_at: nowIso,
    updated_by: actorId,
  });

  if (!tenantResult.ok) {
    return toApiError(tenantResult.status, tenantResult.error, nowIso);
  }

  return {
    status: 200,
    body: { success: true, tenant: tenantResult.tenant, serverNow: nowIso },
  };
}

async function executeTenantAction({ supabase, action, targetTenantId, body, actor, nowIso }) {
  switch (action) {
    case 'get_profile':
      return executeGetProfileAction(supabase, targetTenantId, nowIso);
    case 'get_menu_settings':
      return executeGetMenuSettingsAction(supabase, targetTenantId, nowIso);
    case 'update_menu_settings':
      return executeUpdateMenuSettingsAction(supabase, targetTenantId, body, actor.id, nowIso);
    case 'update_profile':
    default:
      return executeUpdateProfileAction(supabase, targetTenantId, body, actor.id, nowIso);
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
      error: 'Servidor não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)',
    });
  }

  const body = parseJsonBody(req);
  const action = body.action;
  const token = body.token || getBearerToken(req);
  const nowIso = new Date().toISOString();

  if (!ALLOWED_ACTIONS.has(action)) {
    return res.status(400).json({ success: false, error: 'Ação inválida' });
  }

  if (!token || typeof token !== 'string') {
    return res.status(401).json({ success: false, error: 'Token ausente' });
  }

  try {
    const tokenHash = hashToken(token);
    const { session, actor } = await getSessionAndActor(supabase, tokenHash);
    if (!session || !actor) {
      return res.status(401).json({ success: false, error: 'Sessão inválida ou expirada', serverNow: nowIso });
    }

    const tenantContext = await resolveTargetTenantId(actor, body.tenantId);
    if (!tenantContext.ok) {
      return res.status(tenantContext.status).json({ success: false, error: tenantContext.error, serverNow: nowIso });
    }

    const targetTenantId = tenantContext.tenantId;
    const canEdit = await assertCanEditTenant(supabase, actor, targetTenantId);
    if (!canEdit.ok) {
      return res.status(canEdit.status).json({ success: false, error: canEdit.error, serverNow: nowIso });
    }

    const result = await executeTenantAction({
      supabase,
      action,
      targetTenantId,
      body,
      actor,
      nowIso,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('[TENANTS_API] Error:', error);
    return res.status(500).json({ success: false, error: 'Erro ao processar tenant' });
  }
}

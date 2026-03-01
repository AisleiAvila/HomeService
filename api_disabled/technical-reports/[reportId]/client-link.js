import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { assertUserTenant, resolveTenantByRequest } from '../../_tenant.js';

const DEFAULT_SUPABASE_URL = 'https://uqrvenlkquheajuveggv.supabase.co';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

async function requireValidSession(req, supabase) {
  const auth = req.headers.authorization || '';
  const bearerMatch = typeof auth === 'string' ? auth.match(/^Bearer\s+(.+)$/i) : null;
  const token = bearerMatch ? bearerMatch[1] : null;
  if (!token) {
    const err = new Error('Token ausente');
    err.statusCode = 401;
    throw err;
  }

  const tokenHash = hashToken(token);
  const { data: session, error: sessionError } = await supabase
    .from('user_sessions')
    .select('id,user_id,expires_at,revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (sessionError) {
    const err = new Error(sessionError.message);
    err.statusCode = 500;
    throw err;
  }

  if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) {
    const err = new Error('Sessão inválida ou expirada');
    err.statusCode = 401;
    throw err;
  }

  return session;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Servidor não configurado (SUPABASE_SERVICE_ROLE_KEY)',
      });
    }

    let resolvedTenant = null;
    try {
      const tenantResult = await resolveTenantByRequest(req, supabase);
      resolvedTenant = tenantResult.tenant;
    } catch (tenantError) {
      console.warn('[TECH-REPORT client-link] Falha ao resolver tenant por subdomínio:', tenantError?.message || tenantError);
    }

    const reportId = Number(req.query.reportId);
    if (!Number.isFinite(reportId)) {
      return res.status(400).json({ success: false, error: 'reportId inválido' });
    }

    const session = await requireValidSession(req, supabase);

    const { data: report, error: reportError } = await supabase
      .from('technical_reports')
      .select('id,generated_by,client_sign_token,tenant_id')
      .eq('id', reportId)
      .single();

    if (reportError) {
      if (reportError.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Relatório não encontrado' });
      }
      console.error('❌ Supabase erro ao buscar technical_reports:', reportError);
      return res
        .status(500)
        .json({ success: false, error: reportError.message || 'Erro ao buscar relatório' });
    }

    if (!report) {
      return res.status(404).json({ success: false, error: 'Relatório não encontrado' });
    }

    if (!assertUserTenant(report.tenant_id, resolvedTenant)) {
      return res.status(403).json({ success: false, error: 'Relatório não pertence ao tenant deste subdomínio' });
    }

    if (session.user_id !== report.generated_by) {
      return res
        .status(403)
        .json({ success: false, error: 'Apenas o profissional que gerou pode criar link' });
    }

    const token = report.client_sign_token || crypto.randomUUID();
    const { error: updateError } = await supabase
      .from('technical_reports')
      .update({ client_sign_token: token })
      .eq('id', reportId);

    if (updateError) {
      return res.status(500).json({ success: false, error: updateError.message });
    }

    return res.json({ success: true, token, clientToken: token });
  } catch (err) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ success: false, error: err?.message || 'Erro ao criar link' });
  }
}

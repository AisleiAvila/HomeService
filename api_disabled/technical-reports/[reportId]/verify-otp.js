import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { assertUserTenant, resolveTenantByRequest } from '../../_tenant.js';

const DEFAULT_SUPABASE_URL = 'https://uqrvenlkquheajuveggv.supabase.co';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
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

function requireClientToken(report, clientToken) {
  if (!clientToken || String(clientToken) !== String(report.client_sign_token)) {
    const err = new Error('Token do cliente inválido');
    err.statusCode = 403;
    throw err;
  }
}

async function loadSignatureRow(supabase, reportId, signerType) {
  const { data, error } = await supabase
    .from('technical_report_signatures')
    .select('id,otp_hash,otp_expires_at,otp_verified_at,otp_attempts,otp_locked_at')
    .eq('technical_report_id', reportId)
    .eq('signer_type', signerType)
    .maybeSingle();

  if (error) {
    const err = new Error(error.message);
    err.statusCode = 500;
    throw err;
  }

  return data;
}

async function verifyOtpForSignature({ supabase, reportId, signerType, otp }) {
  const row = await loadSignatureRow(supabase, reportId, signerType);

  if (!row || !row.otp_hash) {
    const err = new Error('OTP não solicitado');
    err.statusCode = 400;
    throw err;
  }

  if (row.otp_locked_at) {
    const err = new Error('OTP bloqueado por muitas tentativas');
    err.statusCode = 423;
    throw err;
  }

  const expiresAtMs = row.otp_expires_at ? new Date(row.otp_expires_at).getTime() : 0;
  if (!expiresAtMs || expiresAtMs <= Date.now()) {
    const err = new Error('OTP expirado. Solicite um novo código.');
    err.statusCode = 400;
    throw err;
  }

  const providedHash = hashOtp(otp);
  if (providedHash !== row.otp_hash) {
    const nextAttempts = Number(row.otp_attempts || 0) + 1;
    const lockedAt = nextAttempts >= 5 ? new Date().toISOString() : null;
    await supabase
      .from('technical_report_signatures')
      .update({ otp_attempts: nextAttempts, otp_locked_at: lockedAt })
      .eq('technical_report_id', reportId)
      .eq('signer_type', signerType);

    const err = new Error('OTP inválido');
    err.statusCode = 401;
    throw err;
  }

  const verifiedAt = new Date().toISOString();
  await supabase
    .from('technical_report_signatures')
    .update({ otp_verified_at: verifiedAt })
    .eq('technical_report_id', reportId)
    .eq('signer_type', signerType);

  return { verifiedAt };
}

function parseJsonBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body || {};
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Servidor não configurado (SUPABASE_SERVICE_ROLE_KEY)' });
    }

    let resolvedTenant = null;
    try {
      const tenantResult = await resolveTenantByRequest(req, supabase);
      resolvedTenant = tenantResult.tenant;
    } catch (tenantError) {
      console.warn('[TECH-REPORT verify-otp] Falha ao resolver tenant por subdomínio:', tenantError?.message || tenantError);
    }

    const reportId = Number(req.query.reportId);
    if (!Number.isFinite(reportId)) {
      return res.status(400).json({ success: false, error: 'reportId inválido' });
    }

    const body = parseJsonBody(req);
    if (!body) {
      return res.status(400).json({ success: false, error: 'Body inválido' });
    }

    const signerType = body.signerType || 'client';
    const clientToken = body.clientToken;
    const otp = String(body.otp || '').trim();

    if (!otp) {
      return res.status(400).json({ success: false, error: 'OTP ausente' });
    }

    const { data: report, error: reportError } = await supabase
      .from('technical_reports')
      .select('id,generated_by,client_sign_token,tenant_id')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return res.status(404).json({ success: false, error: 'Relatório não encontrado' });
    }

    if (!assertUserTenant(report.tenant_id, resolvedTenant)) {
      return res.status(403).json({ success: false, error: 'Relatório não pertence ao tenant deste subdomínio' });
    }

    if (signerType === 'professional') {
      const session = await requireValidSession(req, supabase);
      if (session.user_id !== report.generated_by) {
        return res.status(403).json({ success: false, error: 'Apenas o profissional que gerou pode validar OTP' });
      }
    } else {
      requireClientToken(report, clientToken);
    }

    const { verifiedAt } = await verifyOtpForSignature({ supabase, reportId, signerType, otp });

    return res.json({ success: true, verifiedAt });
  } catch (err) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ success: false, error: err?.message || 'Erro ao verificar OTP' });
  }
}

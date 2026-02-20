import { createClient } from '@supabase/supabase-js';
import SibApiV3Sdk from 'sib-api-v3-sdk';
import crypto from 'node:crypto';

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

function generateOtp6() {
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(6, '0');
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

async function resolveSignerEmail({ supabase, signerType, report }) {
  if (signerType === 'professional') {
    const { data: userRow, error } = await supabase
      .from('users')
      .select('email')
      .eq('id', report.generated_by)
      .maybeSingle();

    if (error) {
      const err = new Error(error.message);
      err.statusCode = 500;
      throw err;
    }

    const email = userRow?.email;
    if (!email) {
      const err = new Error('Email do profissional não encontrado');
      err.statusCode = 400;
      throw err;
    }

    return String(email);
  }

  // client
  const { data: srRow, error } = await supabase
    .from('service_requests')
    .select('email_client')
    .eq('id', report.service_request_id)
    .maybeSingle();

  if (error) {
    const err = new Error(error.message);
    err.statusCode = 500;
    throw err;
  }

  const email = srRow?.email_client;
  if (!email) {
    const err = new Error('Email do cliente não encontrado');
    err.statusCode = 400;
    throw err;
  }

  return String(email);
}

async function sendOtpEmail(to, otp, context) {
  const from = process.env.FROM_EMAIL;
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey || !from) {
    const err = new Error('Servidor sem configuração de e-mail (BREVO_API_KEY/FROM_EMAIL)');
    err.statusCode = 500;
    throw err;
  }

  let defaultClient = SibApiV3Sdk.ApiClient.instance;
  let apiKeyAuth = defaultClient.authentications['api-key'];
  apiKeyAuth.apiKey = apiKey;
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

  const subject = 'Código de assinatura do Relatório Técnico';
  const text = `Seu código (OTP) para assinar o Relatório Técnico é: ${otp}.\n\nExpira em 10 minutos.\n\n${context || ''}`;

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.textContent = text;
  sendSmtpEmail.sender = { name: "Natan General Service", email: from };
  sendSmtpEmail.to = [{ email: to }];

  await apiInstance.sendTransacEmail(sendSmtpEmail);
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

    const { data: report, error: reportError } = await supabase
      .from('technical_reports')
      .select('id,service_request_id,generated_by,client_sign_token')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return res.status(404).json({ success: false, error: 'Relatório não encontrado' });
    }

    if (signerType === 'professional') {
      const session = await requireValidSession(req, supabase);
      if (session.user_id !== report.generated_by) {
        return res.status(403).json({ success: false, error: 'Apenas o profissional que gerou pode solicitar OTP' });
      }
    } else {
      requireClientToken(report, clientToken);
    }

    const signerEmail = await resolveSignerEmail({ supabase, signerType, report });

    const ttlMinutes = Number(process.env.TECH_REPORT_OTP_TTL_MINUTES || 10);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

    const otp = generateOtp6();
    const otpHash = hashOtp(otp);

    const { error: upsertError } = await supabase
      .from('technical_report_signatures')
      .upsert(
        {
          technical_report_id: reportId,
          signer_type: signerType,
          signer_email: signerEmail,
          otp_hash: otpHash,
          otp_expires_at: expiresAt,
          otp_attempts: 0,
          otp_locked_at: null,
        },
        { onConflict: 'technical_report_id,signer_type' }
      );

    if (upsertError) {
      return res.status(500).json({ success: false, error: upsertError.message });
    }

    await sendOtpEmail(signerEmail, otp, `Relatório #${reportId} (${signerType})`);

    return res.json({ success: true, expiresAt, email: signerEmail });
  } catch (err) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ success: false, error: err?.message || 'Erro ao solicitar OTP' });
  }
}

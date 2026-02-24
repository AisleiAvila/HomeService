const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('node:crypto');
require('dotenv').config();
const SibApiV3Sdk = require('sib-api-v3-sdk');

const app = express();
const PORT = process.env.AUTH_SERVER_PORT || 4002;

// CORS - Permitir localhost e URLs de desenvolvimento
const corsOptions = {
  origin: [
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'http://localhost:4002',
    'http://127.0.0.1:4002',
    'https://natan-general-service.vercel.app',
    /^https:\/\/home-service-.*\.vercel\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ limit: '6mb', extended: true }));

// Configuração Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uqrvenlkquheajuveggv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '⚠️ SUPABASE_SERVICE_ROLE_KEY não configurada. Para login local com sessão expiráveis, adicione SUPABASE_SERVICE_ROLE_KEY no arquivo .env e reinicie o servidor.'
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

// Brevo (OTP e notificações)
let apiInstance = null;
if (process.env.BREVO_API_KEY) {
  let defaultClient = SibApiV3Sdk.ApiClient.instance;
  let apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = process.env.BREVO_API_KEY;
  apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
}

const FROM_EMAIL = process.env.FROM_EMAIL;

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

async function sendOtpEmail(to, otp, context) {
  if (!process.env.BREVO_API_KEY || !FROM_EMAIL || !apiInstance) {
    throw new Error('Servidor sem configuração de e-mail (BREVO_API_KEY/FROM_EMAIL)');
  }

  const subject = 'Código de assinatura do Relatório Técnico';
  const text = `Seu código (OTP) para assinar o Relatório Técnico é: ${otp}.\n\nExpira em 10 minutos.\n\n${context || ''}`;

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.textContent = text;
  sendSmtpEmail.sender = { name: "Natan General Service", email: FROM_EMAIL };
  sendSmtpEmail.to = [{ email: to }];

  await apiInstance.sendTransacEmail(sendSmtpEmail);
}

async function requireValidSession(req) {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    const err = new Error('Servidor não configurado (SUPABASE_SERVICE_ROLE_KEY)');
    err.statusCode = 503;
    throw err;
  }

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

async function loadTechnicalReportForSigning(reportId) {
  const { data: report, error: reportError } = await supabase
    .from('technical_reports')
    .select('id,service_request_id,generated_by,client_sign_token,storage_bucket,storage_path,file_url,file_name,latest_file_url,latest_storage_path,status,professional_signed_at,client_signed_at')
    .eq('id', reportId)
    .single();

  if (reportError) {
    // PostgREST uses PGRST116 when .single() finds 0 (or multiple) rows
    if (reportError.code === 'PGRST116') {
      const err = new Error('Relatório não encontrado');
      err.statusCode = 404;
      throw err;
    }

    const err = new Error(reportError.message || 'Erro ao carregar relatório');
    err.statusCode = 500;
    throw err;
  }

  if (!report) {
    const err = new Error('Relatório não encontrado');
    err.statusCode = 404;
    throw err;
  }

  return report;
}

async function loadTechnicalReportSignatureRow(reportId, signerType) {
  const { data, error } = await supabase
    .from('technical_report_signatures')
    .select('id,technical_report_id,signer_type,signer_email,otp_hash,otp_expires_at,otp_verified_at,otp_attempts,otp_locked_at,signature_image_data_url,signed_storage_path,signed_file_url,signed_at')
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

function requireClientToken(report, clientToken) {
  if (!clientToken || String(clientToken) !== String(report.client_sign_token)) {
    const err = new Error('Token do cliente inválido');
    err.statusCode = 403;
    throw err;
  }
}

async function verifyOtpForSignature({ reportId, signerType, otp }) {
  const row = await loadTechnicalReportSignatureRow(reportId, signerType);

  // If no row exists yet, force requesting OTP first.
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

function parseDataUrlImage(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    const err = new Error('Assinatura inválida (data URL esperado)');
    err.statusCode = 400;
    throw err;
  }

  const match = dataUrl.match(/^data:(image\/(png|jpeg));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    const err = new Error('Assinatura inválida (apenas PNG/JPEG base64)');
    err.statusCode = 400;
    throw err;
  }

  const mimeType = match[1];
  const base64 = match[3];
  const bytes = Buffer.from(base64, 'base64');

  // 1.5MB max to avoid abuse
  if (bytes.length > 1_500_000) {
    const err = new Error('Assinatura muito grande');
    err.statusCode = 413;
    throw err;
  }

  return { mimeType, bytes };
}

async function downloadReportPdfBytes(report) {
  const bucket = report.storage_bucket || 'technical-reports';
  const storagePath = report.latest_storage_path || report.storage_path;
  if (!storagePath) {
    const err = new Error('Relatório sem storage_path');
    err.statusCode = 500;
    throw err;
  }

  const { data, error } = await supabase.storage.from(bucket).download(storagePath);
  if (error || !data) {
    const err = new Error(error?.message || 'Falha ao baixar PDF');
    err.statusCode = 500;
    throw err;
  }

  const arrayBuffer = await data.arrayBuffer();
  return { bucket, storagePath, bytes: Buffer.from(arrayBuffer) };
}

async function uploadSignedPdf({ bucket, signedPath, pdfBytes }) {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(signedPath, pdfBytes, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'application/pdf',
    });

  if (uploadError) {
    const err = new Error(uploadError.message);
    err.statusCode = 500;
    throw err;
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(signedPath);
  return { publicUrl: urlData.publicUrl };
}

async function stampSignatureOnPdf({ pdfBytes, signatureBytes, signatureMimeType, signerType }) {
  const { PDFDocument } = require('pdf-lib');

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const page = pages[pages.length - 1];
  const { width } = page.getSize();

  const image = signatureMimeType.endsWith('png')
    ? await pdfDoc.embedPng(signatureBytes)
    : await pdfDoc.embedJpg(signatureBytes);

  // Simple placement: bottom area. Keep conservative size.
  const targetWidth = Math.min(180, width * 0.45);
  const scale = targetWidth / image.width;
  const targetHeight = image.height * scale;

  const margin = 28;
  const y = margin;
  const x = signerType === 'client' ? margin : Math.max(margin, width - margin - targetWidth);

  page.drawImage(image, {
    x,
    y,
    width: targetWidth,
    height: targetHeight,
    opacity: 0.95,
  });

  const signedBytes = await pdfDoc.save();
  return Buffer.from(signedBytes);
}

async function resolveSignerEmail({ signerType, reportId, serviceRequestId, generatedBy, emailFromBody }) {
  if (emailFromBody) return emailFromBody;

  if (signerType === 'professional') {
    const { data: userRow } = await supabase
      .from('users')
      .select('email')
      .eq('id', generatedBy)
      .single();
    return userRow?.email;
  }

  const { data: srRow } = await supabase
    .from('service_requests')
    .select('email_client')
    .eq('id', serviceRequestId)
    .single();
  return srRow?.email_client;
}

function sanitizeUserRow(row) {
  if (!row) return row;
  const { password, password_hash, reset_token, reset_token_expiry, confirmation_token, ...safe } = row;
  return safe;
}

function isSuperUserRole(role) {
  return String(role || '').toLowerCase() === 'super_user';
}

function isAdminRole(role) {
  return String(role || '').toLowerCase() === 'admin';
}

function normalizeOptionalText(value) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function validateTenantEmail(email) {
  if (!email) return true;
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);
}

function validateTenantPostalCode(postalCode) {
  if (!postalCode) return true;
  return /^\d{4}-\d{3}$/.test(postalCode);
}

function validateTenantLogoImageData(logoImageData) {
  if (!logoImageData) return true;
  if (typeof logoImageData !== 'string') return false;

  const matches = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(logoImageData);
  if (!matches) {
    return false;
  }

  return logoImageData.length <= 3_500_000;
}

function parseTenantUpdatePayload(rawData) {
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

  if (!validateTenantEmail(candidate.contact_email)) {
    return { ok: false, error: 'Email de contacto inválido' };
  }

  if (!validateTenantPostalCode(candidate.postal_code)) {
    return { ok: false, error: 'Código postal inválido (formato esperado: XXXX-XXX)' };
  }

  if (!validateTenantLogoImageData(candidate.logo_image_data)) {
    return { ok: false, error: 'Imagem do logo inválida (use PNG/JPG/WEBP em base64)' };
  }

  return { ok: true, updates: candidate };
}

async function readTenantProfileById(tenantId) {
  const { data, error } = await supabase
    .from('tenants')
    .select('id,name,slug,subdomain,status,phone,contact_email,address,locality,postal_code,logo_image_data,updated_at,updated_by')
    .eq('id', tenantId)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, error: error.message || 'Erro ao carregar perfil do tenant' };
  }

  if (!data) {
    return { ok: false, status: 404, error: 'Tenant não encontrado' };
  }

  return { ok: true, tenant: data };
}

async function updateTenantProfileById(tenantId, updates) {
  const { data, error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', tenantId)
    .select('id,name,slug,subdomain,status,phone,contact_email,address,locality,postal_code,logo_image_data,updated_at,updated_by')
    .single();

  if (error) {
    return { ok: false, status: 500, error: error.message || 'Erro ao atualizar perfil do tenant' };
  }

  return { ok: true, tenant: data };
}

function resolveTenantTargetForActor(actor, requestedTenantId) {
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

async function assertTenantEditPermission(actor, tenantId) {
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
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return { ok: false, status: 404, error: 'Tenant não encontrado' };
    }
    return { ok: true };
  }

  return { ok: false, status: 500, error: error.message || 'Erro ao validar acesso de edição do tenant' };
}

async function getTenantById(tenantId) {
  if (!tenantId) return null;
  const { data, error } = await supabase
    .from('tenants')
    .select('id,slug,subdomain,status,name')
    .eq('id', tenantId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Erro ao carregar tenant');
  }

  return data || null;
}

async function listAccessibleTenantsForUser(user) {
  if (isSuperUserRole(user?.role)) {
    const { data, error } = await supabase
      .from('tenants')
      .select('id,slug,subdomain,status,name')
      .eq('status', 'active')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Erro ao listar tenants');
    }

    return data || [];
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

  if (mappedError) {
    throw new Error(mappedError.message || 'Erro ao listar acessos de tenant');
  }

  for (const row of mappedTenants || []) {
    if (row?.tenant_id) {
      tenantIds.add(String(row.tenant_id));
    }
  }

  if (tenantIds.size === 0) return [];

  const { data, error } = await supabase
    .from('tenants')
    .select('id,slug,subdomain,status,name')
    .in('id', Array.from(tenantIds))
    .eq('status', 'active')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Erro ao listar tenants');
  }

  return data || [];
}

/**
 * POST /api/login
 * Autentica o utilizador comparando senha com hash SHA256
 */
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email e senha obrigatórios.' 
      });
    }

    // Hash da senha com SHA256 (mesmo método que backend usa)
    const hash = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');

    // Buscar utilizador na tabela 'users'
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password_hash', hash)
      .single();

    if (error || !data) {
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciais inválidas.' 
      });
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(503).json({
        success: false,
        error: 'Servidor não configurado (SUPABASE_SERVICE_ROLE_KEY)'
      });
    }

    // Invalidar sessões anteriores (single-session)
    const nowIso = new Date().toISOString();
    await supabase
      .from('user_sessions')
      .update({ revoked_at: nowIso, revoked_reason: 'new login' })
      .eq('user_id', data.id)
      .is('revoked_at', null);

    // Criar nova sessão (token opaco)
    const ttlHours = Number(process.env.SESSION_TTL_HOURS || 8);
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

    const sessionBasePayload = {
      user_id: data.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      user_agent: req.headers['user-agent'] || null,
      tenant_id: data.tenant_id || null,
      active_tenant_id: data.tenant_id || null,
    };

    let { error: sessionInsertError } = await supabase
      .from('user_sessions')
      .insert(sessionBasePayload);

    if (sessionInsertError && /active_tenant_id/i.test(sessionInsertError.message || '')) {
      const fallbackPayload = {
        user_id: data.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        user_agent: req.headers['user-agent'] || null,
        tenant_id: data.tenant_id || null,
      };
      const fallbackResult = await supabase
        .from('user_sessions')
        .insert(fallbackPayload);
      sessionInsertError = fallbackResult.error || null;
    }

    if (sessionInsertError && /tenant_id/i.test(sessionInsertError.message || '')) {
      const minimalPayload = {
        user_id: data.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        user_agent: req.headers['user-agent'] || null,
      };
      const fallbackResult = await supabase
        .from('user_sessions')
        .insert(minimalPayload);
      sessionInsertError = fallbackResult.error || null;
    }

    if (sessionInsertError) {
      return res.status(500).json({
        success: false,
        error: `Falha ao criar sessão: ${sessionInsertError.message || sessionInsertError}`,
      });
    }

    res.json({
      success: true,
      user: sanitizeUserRow({
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        status: data.status,
        phone: data.phone,
        specialty: data.specialty,
        avatar_url: data.avatar_url,
        tenant_id: data.tenant_id || null,
      }),
      session: { token, expiresAt }
    });
  } catch (err) {
    console.error('❌ Erro em /api/login:', err.message);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao processar login: ' + err.message 
    });
  }
});

/**
 * POST /api/session
 * Body: { action: 'validate' | 'revoke' | 'list_tenants' | 'switch_tenant', token?: string, reason?: string }
 * Também aceita Authorization: Bearer <token>
 */
app.post('/api/session', async (req, res) => {
  try {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(503).json({
        success: false,
        error: 'Servidor não configurado (SUPABASE_SERVICE_ROLE_KEY)'
      });
    }

    const action = req.body?.action;
    const auth = req.headers.authorization || '';
    const bearerMatch = typeof auth === 'string' ? auth.match(/^Bearer\s+(.+)$/i) : null;
    const token = req.body?.token || (bearerMatch ? bearerMatch[1] : null);

    if (!action || (action !== 'validate' && action !== 'revoke' && action !== 'list_tenants' && action !== 'switch_tenant')) {
      return res.status(400).json({ success: false, error: 'Ação inválida' });
    }
    if (!token) {
      return res.status(401).json({ success: false, error: 'Token ausente' });
    }

    const tokenHash = hashToken(token);
    const nowIso = new Date().toISOString();

    if (action === 'revoke') {
      await supabase
        .from('user_sessions')
        .update({ revoked_at: nowIso, revoked_reason: req.body?.reason || 'logout' })
        .eq('token_hash', tokenHash)
        .is('revoked_at', null);
      return res.json({ success: true });
    }

    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('id,user_id,expires_at,revoked_at,tenant_id,active_tenant_id')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (sessionError) {
      return res.status(500).json({ success: false, error: sessionError.message });
    }

    if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) {
      return res.status(401).json({ success: false, error: 'Sessão inválida ou expirada' });
    }

    await supabase
      .from('user_sessions')
      .update({ last_seen_at: nowIso })
      .eq('id', session.id);

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id,email,name,role,status,phone,specialty,avatar_url,tenant_id')
      .eq('id', session.user_id)
      .single();

    if (userError) {
      return res.status(500).json({ success: false, error: userError.message });
    }

    if (isSuperUserRole(user?.role) && action === 'list_tenants') {
      const tenants = await listAccessibleTenantsForUser(user);
      return res.json({
        success: true,
        user: sanitizeUserRow(user),
        tenants,
        activeTenantId: session.active_tenant_id || null,
        session: { expiresAt: session.expires_at },
      });
    }

    if (isSuperUserRole(user?.role) && action === 'switch_tenant') {
      const tenantId = String(req.body?.tenantId || '').trim();
      if (!tenantId) {
        return res.status(400).json({ success: false, error: 'tenantId é obrigatório' });
      }

      const { data: canAccessTenant, error: accessError } = await supabase.rpc('user_can_access_tenant', {
        p_user_id: user.id,
        p_tenant_id: tenantId,
      });

      if (accessError) {
        return res.status(500).json({ success: false, error: accessError.message || 'Erro ao validar acesso ao tenant' });
      }

      if (!canAccessTenant) {
        return res.status(403).json({ success: false, error: 'Sem acesso ao tenant solicitado' });
      }

      const { error: switchError } = await supabase
        .from('user_sessions')
        .update({ tenant_id: tenantId, active_tenant_id: tenantId, last_seen_at: nowIso })
        .eq('id', session.id);

      if (switchError) {
        return res.status(500).json({ success: false, error: switchError.message || 'Falha ao trocar tenant ativo' });
      }

      const tenant = await getTenantById(tenantId);

      return res.json({
        success: true,
        user: sanitizeUserRow(user),
        tenant,
        activeTenantId: tenantId,
        session: { expiresAt: session.expires_at },
      });
    }

    return res.json({ success: true, user: sanitizeUserRow(user), session: { expiresAt: session.expires_at } });
  } catch (err) {
    console.error('❌ Erro em /api/session:', err.message);
    return res.status(500).json({ success: false, error: 'Erro ao processar sessão' });
  }
});

/**
 * POST /api/super-user-access
 * Body: { action: 'list_users'|'get_user_tenants'|'grant_access'|'revoke_access'|'list_audit', userId?, tenantId?, reason?, limit? }
 * Requer sessão válida e role super_user.
 */
const SUPER_USER_ACCESS_ACTIONS = new Set(['list_users', 'get_user_tenants', 'grant_access', 'revoke_access', 'list_audit']);

function isAllowedSuperUserAccessAction(action) {
  return typeof action === 'string' && SUPER_USER_ACCESS_ACTIONS.has(action);
}

async function fetchSuperUserActor(sessionUserId) {
  const { data: actor, error: actorError } = await supabase
    .from('users')
    .select('id,email,name,role,status,tenant_id')
    .eq('id', sessionUserId)
    .single();

  if (actorError || !actor) {
    return { ok: false, status: 500, error: actorError?.message || 'Ator não encontrado' };
  }

  if (!isSuperUserRole(actor.role)) {
    return { ok: false, status: 403, error: 'Apenas super usuário pode operar este endpoint' };
  }

  return { ok: true, actor };
}

async function fetchLocalSuperUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id,email,name,role,status,tenant_id')
    .eq('role', 'super_user')
    .order('name', { ascending: true });

  if (error) {
    return { ok: false, status: 500, error: error.message };
  }

  return { ok: true, users: data || [] };
}

async function fetchLocalAuditRows(body) {
  const requestedUserId = body?.userId == null ? null : Number(body.userId);
  const limitRaw = Number(body?.limit);
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

  const { data: rows, error } = await query;
  if (error) {
    return { ok: false, status: 500, error: error.message };
  }

  return { ok: true, logs: rows || [] };
}

async function fetchTargetLocalSuperUser(targetUserId) {
  const { data: targetUser, error: targetUserError } = await supabase
    .from('users')
    .select('id,email,name,role,status,tenant_id')
    .eq('id', targetUserId)
    .single();

  if (targetUserError || !targetUser) {
    return { ok: false, status: 404, error: 'Usuário alvo não encontrado' };
  }

  if (!isSuperUserRole(targetUser.role)) {
    return { ok: false, status: 400, error: 'A gestão de acessos é permitida apenas para super_user' };
  }

  return { ok: true, targetUser };
}

async function fetchTargetLocalTenants(targetUserId, targetUser) {
  const { data: mappings, error: mappingsError } = await supabase
    .from('user_tenant_access')
    .select('tenant_id,is_active,granted_reason,created_at,updated_at')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false });

  if (mappingsError) {
    return { ok: false, status: 500, error: mappingsError.message };
  }

  const tenantIds = new Set();
  if (targetUser.tenant_id) {
    tenantIds.add(String(targetUser.tenant_id));
  }

  for (const item of mappings || []) {
    if (item?.tenant_id) tenantIds.add(String(item.tenant_id));
  }

  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id,name,slug,subdomain,status')
    .in('id', Array.from(tenantIds))
    .order('name', { ascending: true });

  if (tenantsError) {
    return { ok: false, status: 500, error: tenantsError.message };
  }

  return { ok: true, payload: { user: targetUser, tenants: tenants || [], mappings: mappings || [] } };
}

async function applyLocalGrantAccess(actor, targetUserId, tenantId, reason, nowIso) {
  const { error } = await supabase
    .from('user_tenant_access')
    .upsert({
      user_id: targetUserId,
      tenant_id: tenantId,
      is_active: true,
      granted_by: actor.id,
      granted_reason: reason,
      updated_at: nowIso,
    }, { onConflict: 'user_id,tenant_id' });

  if (error) {
    return { ok: false, status: 500, error: error.message };
  }

  return { ok: true };
}

async function readLocalUserTenantAccessRow(targetUserId, tenantId) {
  const { data: row, error } = await supabase
    .from('user_tenant_access')
    .select('user_id,tenant_id,is_active,granted_reason,updated_at')
    .eq('user_id', targetUserId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, error: error.message };
  }

  return { ok: true, row: row || null };
}

async function applyLocalRevokeAccess(targetUserId, tenantId, reason, nowIso) {
  const beforeResult = await readLocalUserTenantAccessRow(targetUserId, tenantId);
  if (!beforeResult.ok) {
    return beforeResult;
  }

  const beforeRow = beforeResult.row;
  const { error } = await supabase
    .from('user_tenant_access')
    .update({ is_active: false, updated_at: nowIso, granted_reason: reason || beforeRow?.granted_reason || null })
    .eq('user_id', targetUserId)
    .eq('tenant_id', tenantId);

  if (error) {
    return { ok: false, status: 500, error: error.message };
  }

  return { ok: true, beforeRow };
}

async function resolveLocalTenant(tenantId) {
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id,name,slug,subdomain,status')
    .eq('id', tenantId)
    .single();

  if (error || !tenant) {
    return null;
  }

  return tenant;
}

async function writeLocalSuperUserAudit(payload) {
  const { error } = await supabase
    .from('super_user_audit_log')
    .insert(payload);

  if (error) {
    console.warn('⚠️ Falha ao gravar auditoria super_user local:', error.message || error);
  }
}

function formatActionError(status, error) {
  return { status, payload: { success: false, error } };
}

function formatActionSuccess(payload) {
  return { status: 200, payload: { success: true, ...payload } };
}

async function handleSuperUserListAction(action, body) {
  if (action === 'list_users') {
    const superUsersResult = await fetchLocalSuperUsers();
    if (!superUsersResult.ok) {
      return formatActionError(superUsersResult.status, superUsersResult.error);
    }
    return formatActionSuccess({ users: superUsersResult.users });
  }

  if (action === 'list_audit') {
    const auditResult = await fetchLocalAuditRows(body || {});
    if (!auditResult.ok) {
      return formatActionError(auditResult.status, auditResult.error);
    }
    return formatActionSuccess({ logs: auditResult.logs });
  }

  return null;
}

async function resolveSuperUserTargetContext(body) {
  const targetUserId = Number(body?.userId);
  if (!Number.isFinite(targetUserId)) {
    return { ok: false, result: formatActionError(400, 'userId inválido') };
  }

  const targetUserResult = await fetchTargetLocalSuperUser(targetUserId);
  if (!targetUserResult.ok) {
    return { ok: false, result: formatActionError(targetUserResult.status, targetUserResult.error) };
  }

  return {
    ok: true,
    targetUserId,
    targetUser: targetUserResult.targetUser,
  };
}

async function handleSuperUserTargetAction({ action, body, actor, nowIso, targetUserId, targetUser, req }) {
  if (action === 'get_user_tenants') {
    const tenantResult = await fetchTargetLocalTenants(targetUserId, targetUser);
    if (!tenantResult.ok) {
      return formatActionError(tenantResult.status, tenantResult.error);
    }
    return formatActionSuccess(tenantResult.payload);
  }

  const tenantId = String(body?.tenantId || '').trim();
  const reason = String(body?.reason || '').trim() || null;

  if (!tenantId) {
    return formatActionError(400, 'tenantId é obrigatório');
  }

  const tenant = await resolveLocalTenant(tenantId);
  if (!tenant) {
    return formatActionError(404, 'Tenant não encontrado');
  }

  if (action === 'grant_access') {
    const grantResult = await applyLocalGrantAccess(actor, targetUserId, tenantId, reason, nowIso);
    if (!grantResult.ok) {
      return formatActionError(grantResult.status, grantResult.error);
    }

    await writeLocalSuperUserAudit({
      actor_user_id: actor.id,
      actor_role: actor.role,
      action: 'grant_tenant_access',
      target_tenant_id: tenantId,
      target_resource: 'user_tenant_access',
      target_resource_id: `${targetUserId}:${tenantId}`,
      request_path: req.originalUrl || req.path || '/api/super-user-access',
      request_method: req.method || 'POST',
      ip_address: req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || null,
      user_agent: req.headers?.['user-agent'] || null,
      reason,
      before_state: null,
      after_state: { user_id: targetUserId, tenant_id: tenantId, is_active: true },
      success: true,
    });

    return formatActionSuccess({});
  }

  const revokeResult = await applyLocalRevokeAccess(targetUserId, tenantId, reason, nowIso);
  if (!revokeResult.ok) {
    return formatActionError(revokeResult.status, revokeResult.error);
  }

  await writeLocalSuperUserAudit({
    actor_user_id: actor.id,
    actor_role: actor.role,
    action: 'revoke_tenant_access',
    target_tenant_id: tenantId,
    target_resource: 'user_tenant_access',
    target_resource_id: `${targetUserId}:${tenantId}`,
    request_path: req.originalUrl || req.path || '/api/super-user-access',
    request_method: req.method || 'POST',
    ip_address: req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || null,
    user_agent: req.headers?.['user-agent'] || null,
    reason,
    before_state: revokeResult.beforeRow || null,
    after_state: { user_id: targetUserId, tenant_id: tenantId, is_active: false },
    success: true,
  });

  return formatActionSuccess({});
}

async function handleSuperUserAccessAction({ action, body, actor, nowIso, req }) {
  const listActionResult = await handleSuperUserListAction(action, body);
  if (listActionResult) {
    return listActionResult;
  }

  const context = await resolveSuperUserTargetContext(body);
  if (!context.ok) {
    return context.result;
  }

  return handleSuperUserTargetAction({
    action,
    body,
    actor,
    nowIso,
    targetUserId: context.targetUserId,
    targetUser: context.targetUser,
    req,
  });
}

app.post('/api/super-user-access', async (req, res) => {
  try {
    const session = await requireValidSession(req);
    const action = req.body?.action;
    const nowIso = new Date().toISOString();

    if (!isAllowedSuperUserAccessAction(action)) {
      return res.status(400).json({ success: false, error: 'Ação inválida' });
    }

    const actorResult = await fetchSuperUserActor(session.user_id);
    if (!actorResult.ok) {
      return res.status(actorResult.status).json({ success: false, error: actorResult.error });
    }
    const actor = actorResult.actor;

    const result = await handleSuperUserAccessAction({
      action,
      body: req.body,
      actor,
      nowIso,
      req,
    });

    return res.status(result.status).json(result.payload);
  } catch (err) {
    const status = err.statusCode || 500;
    console.error('❌ Erro em /api/super-user-access:', err.message);
    return res.status(status).json({ success: false, error: err.message || 'Erro ao gerir acesso de super usuário' });
  }
});

/**
 * POST /api/tenants
 * Body: { action: 'get_profile' | 'update_profile', tenantId?: string, data?: {...} }
 * Requer sessão válida e role admin/super_user.
 */
app.post('/api/tenants', async (req, res) => {
  try {
    const session = await requireValidSession(req);
    const action = req.body?.action;
    const nowIso = new Date().toISOString();

    if (action !== 'get_profile' && action !== 'update_profile') {
      return res.status(400).json({ success: false, error: 'Ação inválida' });
    }

    const { data: actor, error: actorError } = await supabase
      .from('users')
      .select('id,email,name,role,status,tenant_id')
      .eq('id', session.user_id)
      .single();

    if (actorError || !actor) {
      return res.status(500).json({ success: false, error: actorError?.message || 'Ator não encontrado' });
    }

    const target = resolveTenantTargetForActor(actor, req.body?.tenantId);
    if (!target.ok) {
      return res.status(target.status).json({ success: false, error: target.error });
    }

    const canEdit = await assertTenantEditPermission(actor, target.tenantId);
    if (!canEdit.ok) {
      return res.status(canEdit.status).json({ success: false, error: canEdit.error });
    }

    if (action === 'get_profile') {
      const readResult = await readTenantProfileById(target.tenantId);
      if (!readResult.ok) {
        return res.status(readResult.status).json({ success: false, error: readResult.error });
      }

      return res.status(200).json({ success: true, tenant: readResult.tenant, serverNow: nowIso });
    }

    const payloadResult = parseTenantUpdatePayload(req.body?.data);
    if (!payloadResult.ok) {
      return res.status(400).json({ success: false, error: payloadResult.error });
    }

    const updateResult = await updateTenantProfileById(target.tenantId, {
      ...payloadResult.updates,
      updated_at: nowIso,
      updated_by: actor.id,
    });

    if (!updateResult.ok) {
      return res.status(updateResult.status).json({ success: false, error: updateResult.error });
    }

    return res.status(200).json({ success: true, tenant: updateResult.tenant, serverNow: nowIso });
  } catch (err) {
    const status = err.statusCode || 500;
    console.error('❌ Erro em /api/tenants:', err.message);
    return res.status(status).json({ success: false, error: err.message || 'Erro ao gerir tenant' });
  }
});

/**
 * POST /api/register
 * Cria um novo utilizador
 */
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, phone, specialty, password, role, status } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email obrigatório.' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Senha obrigatória.' });
    }

    const allowedRoles = new Set([
      'client',
      'professional',
      'admin',
      'super_user',
      'almoxarife',
      'secretario',
      'professional_almoxarife',
    ]);

    if (role && !allowedRoles.has(role)) {
      return res.status(400).json({ error: 'Role inválida.' });
    }

    // Hash da senha com SHA256
    const hash = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');

    const { error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        password_hash: hash,
        phone,
        specialty,
        role: role || 'professional',
        status: status || 'Pending'
      });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, message: 'Utilizador registado com sucesso.' });
  } catch (err) {
    console.error('❌ Erro em /api/register:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/change-password
 * Altera a senha de um utilizador
 */
app.post('/api/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Todos os campos são obrigatórios.' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'A nova senha deve ter pelo menos 6 caracteres.' 
      });
    }

    // Hash da senha atual
    const currentHash = crypto
      .createHash('sha256')
      .update(currentPassword)
      .digest('hex');

    // Buscar utilizador e verificar senha atual
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('password_hash', currentHash)
      .single();

    if (fetchError || !user) {
      return res.status(401).json({ 
        error: 'Senha atual inválida.' 
      });
    }

    // Hash da nova senha
    const newHash = crypto
      .createHash('sha256')
      .update(newPassword)
      .digest('hex');

    // Atualizar senha
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', userId);

    if (updateError) {
      return res.status(500).json({ 
        error: 'Erro ao atualizar senha: ' + updateError.message 
      });
    }

    res.json({ success: true, message: 'Senha alterada com sucesso.' });
  } catch (err) {
    console.error('❌ Erro em /api/change-password:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /health
 * Health check do servidor
 */
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor de autenticação em execução.' });
});

/**
 * POST /api/technical-reports/:reportId/request-otp
 * Body: { signerType: 'professional'|'client', email?: string, clientToken?: string }
 * Envia OTP por e-mail para autorizar assinatura PAdES.
 */
app.post('/api/technical-reports/:reportId/request-otp', async (req, res) => {
  try {
    const reportId = Number(req.params.reportId);
    const signerType = req.body?.signerType;
    const emailFromBody = req.body?.email;
    const clientToken = req.body?.clientToken;

    if (!Number.isFinite(reportId)) {
      return res.status(400).json({ success: false, error: 'reportId inválido' });
    }
    if (signerType !== 'professional' && signerType !== 'client') {
      return res.status(400).json({ success: false, error: 'signerType inválido' });
    }

    // Professional must be authenticated. Client can use token.
    let sessionUserId = null;
    if (signerType === 'professional') {
      const session = await requireValidSession(req);
      sessionUserId = session.user_id;
    }

    const report = await loadTechnicalReportForSigning(reportId);

    if (signerType === 'professional' && sessionUserId !== report.generated_by) {
      return res.status(403).json({ success: false, error: 'Apenas o profissional que gerou pode solicitar OTP' });
    }

    if (signerType === 'client' && (!clientToken || String(clientToken) !== String(report.client_sign_token))) {
      return res.status(403).json({ success: false, error: 'Token do cliente inválido' });
    }

    const signerEmail = await resolveSignerEmail({
      signerType,
      reportId,
      serviceRequestId: report.service_request_id,
      generatedBy: report.generated_by,
      emailFromBody,
    });

    if (!signerEmail) {
      return res.status(400).json({ success: false, error: 'E-mail do assinante ausente' });
    }

    const otp = generateOtp6();
    const otpHash = hashOtp(otp);
    const ttlMinutes = Number(process.env.TECH_REPORT_OTP_TTL_MINUTES || 10);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

    await supabase
      .from('technical_report_signatures')
      .upsert({
        technical_report_id: reportId,
        signer_type: signerType,
        signer_email: signerEmail,
        otp_hash: otpHash,
        otp_expires_at: expiresAt,
        otp_verified_at: null,
        otp_attempts: 0,
        otp_locked_at: null,
      }, { onConflict: 'technical_report_id,signer_type' });

    await sendOtpEmail(signerEmail, otp, `Relatório #${reportId} (${signerType})`);

    return res.json({ success: true, expiresAt, email: signerEmail });
  } catch (err) {
    const status = err.statusCode || 500;
    console.error('❌ Erro em /api/technical-reports/:reportId/request-otp:', err.message);
    return res.status(status).json({ success: false, error: err.message || 'Erro ao solicitar OTP' });
  }
});

/**
 * POST /api/technical-reports/:reportId/client-link
 * Cria (ou reaproveita) token de assinatura do cliente.
 * Requer sessão do profissional.
 */
app.post('/api/technical-reports/:reportId/client-link', async (req, res) => {
  try {
    const reportId = Number(req.params.reportId);
    if (!Number.isFinite(reportId)) {
      return res.status(400).json({ success: false, error: 'reportId inválido' });
    }

    const session = await requireValidSession(req);

    const { data: report, error: reportError } = await supabase
      .from('technical_reports')
      .select('id,generated_by,client_sign_token')
      .eq('id', reportId)
      .single();

    if (reportError) {
      if (reportError.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Relatório não encontrado' });
      }
      console.error('❌ Supabase erro ao buscar technical_reports:', reportError);
      return res.status(500).json({ success: false, error: reportError.message || 'Erro ao buscar relatório' });
    }
    if (!report) {
      return res.status(404).json({ success: false, error: 'Relatório não encontrado' });
    }
    if (session.user_id !== report.generated_by) {
      return res.status(403).json({ success: false, error: 'Apenas o profissional que gerou pode criar link' });
    }

    const token = report.client_sign_token || crypto.randomUUID();
    const { error: updateError } = await supabase
      .from('technical_reports')
      .update({ client_sign_token: token })
      .eq('id', reportId);

    if (updateError) {
      return res.status(500).json({ success: false, error: updateError.message });
    }

    // Keep compatibility with both payload formats
    return res.json({ success: true, token, clientToken: token });
  } catch (err) {
    const status = err.statusCode || 500;
    console.error('❌ Erro em /api/technical-reports/:reportId/client-link:', err.message);
    return res.status(status).json({ success: false, error: err.message || 'Erro ao criar link' });
  }
});

/**
 * GET /api/technical-reports/:reportId
 * Query: ?clientToken=...
 * - Professional: requer sessão e ownership
 * - Client: requer clientToken
 */
app.get('/api/technical-reports/:reportId', async (req, res) => {
  try {
    const reportId = Number(req.params.reportId);
    if (!Number.isFinite(reportId)) {
      return res.status(400).json({ success: false, error: 'reportId inválido' });
    }

    const clientToken = req.query?.clientToken;

    const report = await loadTechnicalReportForSigning(reportId);

    // If clientToken is present, allow access for client.
    if (clientToken) {
      requireClientToken(report, clientToken);
    } else {
      // Otherwise require professional session and ownership
      const session = await requireValidSession(req);
      if (session.user_id !== report.generated_by) {
        return res.status(403).json({ success: false, error: 'Apenas o profissional que gerou pode acessar' });
      }
    }

    const fileUrl = report.latest_file_url || report.file_url;

    return res.json({
      success: true,
      report: {
        id: report.id,
        service_request_id: report.service_request_id,
        status: report.status,
        file_url: fileUrl,
        file_name: report.file_name,
        professional_signed_at: report.professional_signed_at,
        client_signed_at: report.client_signed_at,
      },
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, error: err.message || 'Erro ao obter relatório' });
  }
});

/**
 * POST /api/technical-reports/:reportId/verify-otp
 * Body: { signerType: 'professional'|'client', otp: string, clientToken?: string }
 */
app.post('/api/technical-reports/:reportId/verify-otp', async (req, res) => {
  try {
    const reportId = Number(req.params.reportId);
    const signerType = req.body?.signerType;
    const otp = String(req.body?.otp || '').trim();
    const clientToken = req.body?.clientToken;

    if (!Number.isFinite(reportId)) {
      return res.status(400).json({ success: false, error: 'reportId inválido' });
    }
    if (signerType !== 'professional' && signerType !== 'client') {
      return res.status(400).json({ success: false, error: 'signerType inválido' });
    }
    if (!otp) {
      return res.status(400).json({ success: false, error: 'OTP ausente' });
    }

    if (signerType === 'professional') {
      const session = await requireValidSession(req);
      const report = await loadTechnicalReportForSigning(reportId);
      if (session.user_id !== report.generated_by) {
        return res.status(403).json({ success: false, error: 'Apenas o profissional que gerou pode verificar OTP' });
      }
    } else {
      const report = await loadTechnicalReportForSigning(reportId);
      requireClientToken(report, clientToken);
    }

    const { verifiedAt } = await verifyOtpForSignature({ reportId, signerType, otp });
    return res.json({ success: true, verifiedAt });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, error: err.message || 'Erro ao verificar OTP' });
  }
});

async function validateSignatureSubmissionRequest(reportId, signerType, otp) {
  if (!Number.isFinite(reportId)) {
    const err = new Error('reportId inválido');
    err.statusCode = 400;
    throw err;
  }
  if (signerType !== 'professional' && signerType !== 'client') {
    const err = new Error('signerType inválido');
    err.statusCode = 400;
    throw err;
  }
  if (!otp) {
    const err = new Error('OTP ausente');
    err.statusCode = 400;
    throw err;
  }
}

async function verifySignerPermissions(req, report, signerType, clientToken) {
  if (signerType === 'professional') {
    const session = await requireValidSession(req);
    if (session.user_id !== report.generated_by) {
      const err = new Error('Apenas o profissional que gerou pode assinar');
      err.statusCode = 403;
      throw err;
    }
  } else {
    requireClientToken(report, clientToken);
  }
}

function computeReportStatus(signerType, signedAt, report) {
  const nextProfessionalSignedAt = signerType === 'professional' ? signedAt : report.professional_signed_at;
  const nextClientSignedAt = signerType === 'client' ? signedAt : report.client_signed_at;
  
  if (nextProfessionalSignedAt && nextClientSignedAt) {
    return 'fully_signed';
  }
  if (nextProfessionalSignedAt) {
    return 'professional_signed';
  }
  if (nextClientSignedAt) {
    return 'client_signed';
  }
  return report.status || 'generated';
}

async function saveSignatureToDatabase({ reportId, signerType, signatureDataUrl, signedPath, publicUrl, signedAt, report }) {
  const signerEmail = await resolveSignerEmail({
    signerType,
    reportId,
    serviceRequestId: report.service_request_id,
    generatedBy: report.generated_by,
    emailFromBody: null,
  });

  await supabase
    .from('technical_report_signatures')
    .upsert({
      technical_report_id: reportId,
      signer_type: signerType,
      signer_email: signerEmail || 'unknown',
      signature_image_data_url: signatureDataUrl,
      signed_storage_path: signedPath,
      signed_file_url: publicUrl,
      signed_at: signedAt,
    }, { onConflict: 'technical_report_id,signer_type' });
}

async function updateReportWithSignature({ reportId, signerType, signedAt, publicUrl, signedPath, report }) {
  const reportUpdate = {
    latest_file_url: publicUrl,
    latest_storage_path: signedPath,
  };

  if (signerType === 'professional') {
    reportUpdate.professional_signed_at = signedAt;
  } else {
    reportUpdate.client_signed_at = signedAt;
  }

  reportUpdate.status = computeReportStatus(signerType, signedAt, report);

  const { error: reportUpdateError } = await supabase
    .from('technical_reports')
    .update(reportUpdate)
    .eq('id', reportId);

  if (reportUpdateError) {
    const err = new Error(reportUpdateError.message);
    err.statusCode = 500;
    throw err;
  }

  return reportUpdate.status;
}

/**
 * POST /api/technical-reports/:reportId/submit-signature
 * Body: { signerType: 'professional'|'client', otp: string, signatureDataUrl: string, clientToken?: string }
 */
app.post('/api/technical-reports/:reportId/submit-signature', async (req, res) => {
  try {
    const reportId = Number(req.params.reportId);
    const signerType = req.body?.signerType;
    const otp = String(req.body?.otp || '').trim();
    const signatureDataUrl = req.body?.signatureDataUrl;
    const clientToken = req.body?.clientToken;

    await validateSignatureSubmissionRequest(reportId, signerType, otp);

    const report = await loadTechnicalReportForSigning(reportId);
    await verifySignerPermissions(req, report, signerType, clientToken);
    await verifyOtpForSignature({ reportId, signerType, otp });

    const { mimeType, bytes: signatureBytes } = parseDataUrlImage(signatureDataUrl);
    const { bytes: pdfBytes } = await downloadReportPdfBytes(report);

    const signedPdfBytes = await stampSignatureOnPdf({
      pdfBytes,
      signatureBytes,
      signatureMimeType: mimeType,
      signerType,
    });

    const ts = Date.now();
    const baseName = (report.file_name || `Relatorio_${reportId}.pdf`).replace(/\.pdf$/i, '');
    const signedPath = `request_${report.service_request_id}/signed/${reportId}_${signerType}_${ts}_${baseName}.pdf`;

    const { publicUrl } = await uploadSignedPdf({
      bucket: report.storage_bucket || 'technical-reports',
      signedPath,
      pdfBytes: signedPdfBytes,
    });

    const signedAt = new Date().toISOString();

    await saveSignatureToDatabase({ reportId, signerType, signatureDataUrl, signedPath, publicUrl, signedAt, report });
    const status = await updateReportWithSignature({ reportId, signerType, signedAt, publicUrl, signedPath, report });

    return res.json({
      success: true,
      signedAt,
      signedFileUrl: publicUrl,
      status,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ success: false, error: err.message || 'Erro ao assinar relatório' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor de autenticação rodando em http://localhost:${PORT}`);
  console.log(`📝 POST http://localhost:${PORT}/api/login - Fazer login`);
  console.log(`📝 POST http://localhost:${PORT}/api/register - Registar utilizador`);
  console.log(`📝 POST http://localhost:${PORT}/api/change-password - Alterar senha`);
  console.log(`🏥 GET http://localhost:${PORT}/health - Status do servidor`);
});

module.exports = app;

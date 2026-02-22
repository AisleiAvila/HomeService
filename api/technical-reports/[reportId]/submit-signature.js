import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
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

  const mime = match[1];
  const base64 = match[3];

  // Limit ~1MB base64 payload
  if (base64.length > 1_500_000) {
    const err = new Error('Assinatura muito grande');
    err.statusCode = 413;
    throw err;
  }

  return { mime, bytes: Buffer.from(base64, 'base64') };
}

async function downloadReportPdfBytes(supabase, report) {
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

  const bytes = new Uint8Array(await data.arrayBuffer());
  return { bucket, bytes };
}

async function uploadSignedPdf(supabase, bucket, signedPath, pdfBytes) {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(signedPath, Buffer.from(pdfBytes), { contentType: 'application/pdf', upsert: true });

  if (uploadError) {
    const err = new Error(uploadError.message);
    err.statusCode = 500;
    throw err;
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(signedPath);
  const publicUrl = urlData?.publicUrl;
  if (!publicUrl) {
    const err = new Error('Falha ao gerar URL pública');
    err.statusCode = 500;
    throw err;
  }

  return { publicUrl };
}

async function stampSignatureOnPdf({ pdfBytes, signature, signerType }) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const page = pages[pages.length - 1];

  let embedded;
  if (signature.mime === 'image/png') {
    embedded = await pdfDoc.embedPng(signature.bytes);
  } else {
    embedded = await pdfDoc.embedJpg(signature.bytes);
  }

  const { width } = page.getSize();

  const targetW = 160;
  const targetH = 60;
  const marginX = 40;
  const marginY = 40;

  const x = signerType === 'professional' ? width - marginX - targetW : marginX;
  const y = marginY;

  page.drawImage(embedded, {
    x,
    y,
    width: targetW,
    height: targetH,
  });

  return await pdfDoc.save();
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

async function validateRequestInputs(req, body, reportId) {
  if (!body) {
    const err = new Error('Body inválido');
    err.statusCode = 400;
    throw err;
  }

  if (!Number.isFinite(reportId)) {
    const err = new Error('reportId inválido');
    err.statusCode = 400;
    throw err;
  }

  const otp = String(body.otp || '').trim();
  const signatureDataUrl = body.signatureDataUrl;

  if (!otp) {
    const err = new Error('OTP ausente');
    err.statusCode = 400;
    throw err;
  }

  if (!signatureDataUrl) {
    const err = new Error('Assinatura ausente');
    err.statusCode = 400;
    throw err;
  }

  return { otp, signatureDataUrl };
}

async function loadAndValidateReport(supabase, reportId) {
  const { data: report, error: reportError } = await supabase
    .from('technical_reports')
    .select(
      'id,service_request_id,generated_by,client_sign_token,storage_bucket,storage_path,file_url,file_name,latest_file_url,latest_storage_path,status,professional_signed_at,client_signed_at,tenant_id'
    )
    .eq('id', reportId)
    .single();

  if (reportError || !report) {
    const err = new Error('Relatório não encontrado');
    err.statusCode = 404;
    throw err;
  }

  return report;
}

async function validateSignerAuthorization(supabase, req, report, signerType, clientToken) {
  if (signerType === 'professional') {
    const session = await requireValidSession(req, supabase);
    if (session.user_id !== report.generated_by) {
      const err = new Error('Apenas o profissional que gerou pode assinar');
      err.statusCode = 403;
      throw err;
    }
  } else {
    requireClientToken(report, clientToken);
  }
}

function calculateNewStatus(report, signerType) {
  const hadProfessional = !!report.professional_signed_at;
  const hadClient = !!report.client_signed_at;
  const willProfessional = signerType === 'professional' ? true : hadProfessional;
  const willClient = signerType === 'client' ? true : hadClient;

  let nextStatus = report.status || 'generated';
  if (willProfessional && willClient) nextStatus = 'fully_signed';
  else if (willProfessional) nextStatus = 'professional_signed';
  else if (willClient) nextStatus = 'client_signed';

  return nextStatus;
}

async function updateReportWithSignature(supabase, reportId, report, signerType, signedPath, publicUrl, signedAt) {
  const nextStatus = calculateNewStatus(report, signerType);

  const updates = {
    latest_storage_path: signedPath,
    latest_file_url: publicUrl,
    status: nextStatus,
    professional_signed_at: signerType === 'professional' ? signedAt : report.professional_signed_at,
    client_signed_at: signerType === 'client' ? signedAt : report.client_signed_at,
  };

  const { error: reportUpdateError } = await supabase
    .from('technical_reports')
    .update(updates)
    .eq('id', reportId);

  if (reportUpdateError) {
    const err = new Error(reportUpdateError.message);
    err.statusCode = 500;
    throw err;
  }

  return nextStatus;
}

async function saveSignatureRecord(supabase, reportId, signerType, signatureDataUrl, signedPath, publicUrl, signedAt) {
  const { error: sigUpdateError } = await supabase
    .from('technical_report_signatures')
    .upsert(
      {
        technical_report_id: reportId,
        signer_type: signerType,
        signature_image_data_url: signatureDataUrl,
        signed_storage_path: signedPath,
        signed_file_url: publicUrl,
        signed_at: signedAt,
      },
      { onConflict: 'technical_report_id,signer_type' }
    );

  if (sigUpdateError) {
    const err = new Error(sigUpdateError.message);
    err.statusCode = 500;
    throw err;
  }
}

async function validateRequestData(req, body, reportId) {
  if (!body) {
    const err = new Error('Body inválido');
    err.statusCode = 400;
    throw err;
  }

  if (!Number.isFinite(reportId)) {
    const err = new Error('reportId inválido');
    err.statusCode = 400;
    throw err;
  }

  const signerType = body.signerType || 'client';
  const clientToken = body.clientToken;
  const otp = String(body.otp || '').trim();
  const signatureDataUrl = body.signatureDataUrl;

  if (!otp) {
    const err = new Error('OTP ausente');
    err.statusCode = 400;
    throw err;
  }

  if (!signatureDataUrl) {
    const err = new Error('Assinatura ausente');
    err.statusCode = 400;
    throw err;
  }

  return { signerType, clientToken, otp, signatureDataUrl };
}

async function processSignature(supabase, report, reportId, signerType, otp, signatureDataUrl) {
  await verifyOtpForSignature({ supabase, reportId, signerType, otp });

  const signature = parseDataUrlImage(signatureDataUrl);
  const { bucket, bytes: originalPdfBytes } = await downloadReportPdfBytes(supabase, report);

  const signedPdfBytes = await stampSignatureOnPdf({
    pdfBytes: originalPdfBytes,
    signature,
    signerType,
  });

  const baseName = (report.file_name || `Relatorio_${reportId}.pdf`).replace(/\.pdf$/i, '');
  const stampedAt = new Date().toISOString().replaceAll(/[:.]/g, '-');
  const signedPath = `technical-reports/${reportId}/${baseName}_${signerType}_signed_${stampedAt}.pdf`;

  const { publicUrl } = await uploadSignedPdf(supabase, bucket, signedPath, signedPdfBytes);
  const signedAt = new Date().toISOString();

  return { signedPath, publicUrl, signedAt };
}

async function executeSignatureWorkflow(supabase, req, reportId, signerType, clientToken, otp, signatureDataUrl) {
  let resolvedTenant = null;
  try {
    const tenantResult = await resolveTenantByRequest(req, supabase);
    resolvedTenant = tenantResult.tenant;
  } catch (tenantError) {
    console.warn('[TECH-REPORT submit-signature] Falha ao resolver tenant por subdomínio:', tenantError?.message || tenantError);
  }

  const report = await loadAndValidateReport(supabase, reportId);

  if (!assertUserTenant(report.tenant_id, resolvedTenant)) {
    const err = new Error('Relatório não pertence ao tenant deste subdomínio');
    err.statusCode = 403;
    throw err;
  }

  await validateSignerAuthorization(supabase, req, report, signerType, clientToken);

  const { signedPath, publicUrl, signedAt } = await processSignature(
    supabase,
    report,
    reportId,
    signerType,
    otp,
    signatureDataUrl
  );

  await saveSignatureRecord(supabase, reportId, signerType, signatureDataUrl, signedPath, publicUrl, signedAt);

  const nextStatus = await updateReportWithSignature(
    supabase,
    reportId,
    report,
    signerType,
    signedPath,
    publicUrl,
    signedAt
  );

  return { signedFileUrl: publicUrl, status: nextStatus };
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
    const body = parseJsonBody(req);

    const { signerType, clientToken, otp, signatureDataUrl } = await validateRequestData(req, body, reportId);

    const result = await executeSignatureWorkflow(
      supabase,
      req,
      reportId,
      signerType,
      clientToken,
      otp,
      signatureDataUrl
    );

    return res.json({ success: true, ...result });
  } catch (err) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ success: false, error: err?.message || 'Erro ao enviar assinatura' });
  }
}

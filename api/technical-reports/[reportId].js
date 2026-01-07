import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

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

function requireClientToken(report, clientToken) {
  if (!clientToken || String(clientToken) !== String(report.client_sign_token)) {
    const err = new Error('Token do cliente inválido');
    err.statusCode = 403;
    throw err;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

    const reportId = Number(req.query.reportId);
    if (!Number.isFinite(reportId)) {
      return res.status(400).json({ success: false, error: 'reportId inválido' });
    }

    const clientToken = req.query?.clientToken;

    const { data: report, error: reportError } = await supabase
      .from('technical_reports')
      .select(
        'id,service_request_id,generated_by,client_sign_token,storage_bucket,storage_path,file_url,file_name,latest_file_url,latest_storage_path,status,professional_signed_at,client_signed_at'
      )
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return res.status(404).json({ success: false, error: 'Relatório não encontrado' });
    }

    if (clientToken) {
      requireClientToken(report, clientToken);
    } else {
      const session = await requireValidSession(req, supabase);
      if (session.user_id !== report.generated_by) {
        return res
          .status(403)
          .json({ success: false, error: 'Apenas o profissional que gerou pode acessar' });
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
    const status = err?.statusCode || 500;
    return res.status(status).json({ success: false, error: err?.message || 'Erro ao carregar relatório' });
  }
}

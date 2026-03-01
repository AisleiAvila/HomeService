import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const INVOICE_STATUSES = new Set(['draft', 'open', 'paid', 'past_due', 'uncollectible', 'void']);
const SUBSCRIPTION_STATUSES = new Set([
  'trialing',
  'active',
  'past_due',
  'unpaid',
  'canceled',
  'incomplete',
  'incomplete_expired',
]);

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function normalizeNullableText(value) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeNullableTimestamp(value) {
  if (!value) return null;

  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return new Date(asNumber * 1000).toISOString();
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalizePositiveInteger(value, fallback = null) {
  if (value == null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.round(parsed);
}

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8');
  }

  if (typeof req.body === 'string') {
    return req.body;
  }

  if (req.body && typeof req.body === 'object') {
    return JSON.stringify(req.body);
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
}

function parseStripeSignatureHeader(signatureHeader) {
  if (!signatureHeader || typeof signatureHeader !== 'string') {
    return { timestamp: null, signatures: [] };
  }

  const parts = signatureHeader.split(',');
  const signatures = [];
  let timestamp = null;

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (!key || !value) continue;

    if (key === 't') {
      timestamp = value;
      continue;
    }

    if (key === 'v1') {
      signatures.push(value);
    }
  }

  return { timestamp, signatures };
}

function safeCompareHex(a, b) {
  const aBuf = Buffer.from(a, 'hex');
  const bBuf = Buffer.from(b, 'hex');

  if (aBuf.length !== bBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifyStripeSignature(rawBody, signatureHeader, secret) {
  const { timestamp, signatures } = parseStripeSignatureHeader(signatureHeader);

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) {
    return false;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const toleranceSec = Number(process.env.STRIPE_WEBHOOK_TOLERANCE_SEC || 300);
  if (Math.abs(nowSec - ts) > toleranceSec) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  return signatures.some((signature) => safeCompareHex(expected, signature));
}

function getStripeDataObject(payload) {
  if (payload?.data?.object && typeof payload.data.object === 'object') {
    return payload.data.object;
  }
  return null;
}

function resolveTenantId(payload) {
  const dataObject = getStripeDataObject(payload);
  const metadata = dataObject?.metadata && typeof dataObject.metadata === 'object' ? dataObject.metadata : null;

  return normalizeNullableText(
    payload?.tenantId ||
      payload?.tenant_id ||
      dataObject?.tenant_id ||
      dataObject?.tenantId ||
      metadata?.tenant_id ||
      metadata?.tenantId
  );
}

function mapStripeSubscriptionStatus(rawStatus, eventType) {
  const normalizedStatus = normalizeStatus(rawStatus);
  if (SUBSCRIPTION_STATUSES.has(normalizedStatus)) {
    return normalizedStatus;
  }

  const normalizedEvent = normalizeStatus(eventType);
  if (normalizedEvent === 'invoice.payment_failed') return 'past_due';
  if (normalizedEvent === 'invoice.payment_succeeded') return 'active';
  if (normalizedEvent === 'customer.subscription.deleted') return 'canceled';

  return null;
}

function mapStripeSubscriptionPatch(eventType, payload) {
  const dataObject = getStripeDataObject(payload);
  const status = mapStripeSubscriptionStatus(
    dataObject?.status || payload?.status || payload?.subscription_status,
    eventType
  );

  if (!status) return null;

  return {
    status,
    payment_status: normalizeNullableText(dataObject?.payment_status || payload?.payment_status),
    current_period_start: normalizeNullableTimestamp(dataObject?.current_period_start || payload?.current_period_start),
    current_period_end: normalizeNullableTimestamp(dataObject?.current_period_end || payload?.current_period_end),
    grace_until: normalizeNullableTimestamp(payload?.grace_until),
    provider_subscription_id: normalizeNullableText(dataObject?.subscription || dataObject?.id || payload?.subscription_id),
    amount_cents: normalizePositiveInteger(dataObject?.plan?.amount || dataObject?.amount_due || payload?.amount_cents, null),
    currency: String(dataObject?.currency || payload?.currency || 'EUR').toUpperCase(),
    metadata: payload,
    updated_at: new Date().toISOString(),
  };
}

async function upsertTenantSubscriptionFromStripe(supabase, tenantId, eventType, payload) {
  const patch = mapStripeSubscriptionPatch(eventType, payload);
  if (!patch) return;

  const payloadWithTenant = {
    tenant_id: tenantId,
    ...patch,
  };

  if (payloadWithTenant.provider_subscription_id) {
    await supabase
      .from('tenant_subscriptions')
      .upsert(payloadWithTenant, { onConflict: 'provider_subscription_id' });
    return;
  }

  const { data: existing } = await supabase
    .from('tenant_subscriptions')
    .select('id')
    .eq('tenant_id', tenantId)
    .order('current_period_end', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from('tenant_subscriptions')
      .update(payloadWithTenant)
      .eq('id', existing.id);
    return;
  }

  await supabase
    .from('tenant_subscriptions')
    .insert(payloadWithTenant);
}

async function upsertTenantInvoiceFromStripe(supabase, tenantId, payload) {
  const dataObject = getStripeDataObject(payload);
  if (!dataObject) return;

  const providerInvoiceId = normalizeNullableText(dataObject.id || payload?.invoice_id || payload?.provider_invoice_id);
  const invoiceStatus = normalizeStatus(dataObject.status || payload?.status || payload?.invoice_status || 'open');

  if (!providerInvoiceId || !INVOICE_STATUSES.has(invoiceStatus)) {
    return;
  }

  const record = {
    tenant_id: tenantId,
    provider_invoice_id: providerInvoiceId,
    invoice_number: normalizeNullableText(dataObject.number || payload?.invoice_number),
    status: invoiceStatus,
    amount_due_cents: normalizePositiveInteger(dataObject.amount_due || payload?.amount_due_cents, 0),
    amount_paid_cents: normalizePositiveInteger(dataObject.amount_paid || payload?.amount_paid_cents, 0),
    amount_remaining_cents: normalizePositiveInteger(dataObject.amount_remaining || payload?.amount_remaining_cents, 0),
    currency: String(dataObject.currency || payload?.currency || 'EUR').toUpperCase(),
    due_at: normalizeNullableTimestamp(dataObject.due_date || payload?.due_at),
    paid_at: normalizeNullableTimestamp(dataObject?.status_transitions?.paid_at || payload?.paid_at),
    failed_at: normalizeNullableTimestamp(dataObject?.status_transitions?.marked_uncollectible_at || payload?.failed_at),
    hosted_invoice_url: normalizeNullableText(dataObject.hosted_invoice_url || payload?.hosted_invoice_url),
    pdf_url: normalizeNullableText(dataObject.invoice_pdf || payload?.pdf_url),
    metadata: payload,
    updated_at: new Date().toISOString(),
  };

  await supabase
    .from('tenant_invoices')
    .upsert(record, { onConflict: 'provider_invoice_id' });
}

async function markWebhookProcessed(supabase, provider, eventId, processingError = null) {
  await supabase
    .from('billing_webhook_events')
    .update({
      processed_at: new Date().toISOString(),
      processing_error: processingError,
    })
    .eq('provider', provider)
    .eq('event_id', eventId);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  const secret = normalizeNullableText(process.env.STRIPE_WEBHOOK_SECRET);
  if (!secret) {
    return res.status(500).json({ success: false, error: 'Webhook Stripe não configurado (STRIPE_WEBHOOK_SECRET)' });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(500).json({ success: false, error: 'Servidor não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' });
  }

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers?.['stripe-signature'] || req.headers?.['Stripe-Signature'];

    if (!verifyStripeSignature(rawBody, signature, secret)) {
      return res.status(401).json({ success: false, error: 'Assinatura Stripe inválida' });
    }

    const event = rawBody ? JSON.parse(rawBody) : {};
    const eventId = normalizeNullableText(event?.id);
    const eventType = normalizeNullableText(event?.type || 'unknown');

    if (!eventId || !eventType) {
      return res.status(400).json({ success: false, error: 'Evento Stripe inválido' });
    }

    const tenantId = resolveTenantId(event);

    const insertResult = await supabase
      .from('billing_webhook_events')
      .insert({
        provider: 'stripe',
        event_id: eventId,
        event_type: eventType,
        tenant_id: tenantId,
        payload: event,
        received_at: new Date().toISOString(),
      });

    if (insertResult.error) {
      const message = String(insertResult.error?.message || '').toLowerCase();
      const duplicate = message.includes('duplicate key') || message.includes('unique');
      if (duplicate) {
        return res.status(200).json({ success: true, duplicate: true });
      }

      return res.status(500).json({ success: false, error: 'Erro ao registrar evento Stripe' });
    }

    try {
      if (tenantId) {
        await upsertTenantSubscriptionFromStripe(supabase, tenantId, eventType, event);
        await upsertTenantInvoiceFromStripe(supabase, tenantId, event);
      }

      await markWebhookProcessed(supabase, 'stripe', eventId, null);
      return res.status(200).json({ success: true });
    } catch (processingError) {
      const message = String(processingError?.message || processingError || 'Erro ao processar evento Stripe');
      await markWebhookProcessed(supabase, 'stripe', eventId, message);
      return res.status(500).json({ success: false, error: message });
    }
  } catch (error) {
    console.error('[STRIPE_WEBHOOK] Error:', error);
    return res.status(500).json({ success: false, error: 'Erro ao processar webhook Stripe' });
  }
}

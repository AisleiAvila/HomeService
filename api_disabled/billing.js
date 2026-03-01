import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { isSuperUserRole } from './_tenant.js';

const ALLOWED_ACTIONS = new Set([
  'get_billing',
  'list_invoices',
  'upsert_subscription',
  'create_checkout_session',
  'create_billing_portal',
  'ingest_webhook',
]);

const SUBSCRIPTION_STATUSES = new Set([
  'trialing',
  'active',
  'past_due',
  'unpaid',
  'canceled',
  'incomplete',
  'incomplete_expired',
]);

const INVOICE_STATUSES = new Set(['draft', 'open', 'paid', 'past_due', 'uncollectible', 'void']);

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

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeNullableText(value) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeNullableTimestamp(value) {
  if (!value) return null;
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

function isValidWebhookSecret(req) {
  const expected = process.env.BILLING_WEBHOOK_SECRET;
  if (!expected) {
    return false;
  }

  const provided =
    req.headers?.['x-billing-webhook-secret'] ||
    req.headers?.['x-webhook-secret'] ||
    req.headers?.['x-signature-secret'];

  return typeof provided === 'string' && provided.length > 0 && provided === expected;
}

function getAppBaseUrl(req) {
  const configuredBaseUrl = normalizeNullableText(process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL);
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const host = req.headers?.['x-forwarded-host'] || req.headers?.host;
  const proto = req.headers?.['x-forwarded-proto'] || 'https';
  if (host && typeof host === 'string') {
    return `${proto}://${host}`;
  }

  return 'http://localhost:4200';
}

function getStripeSecretKey() {
  return normalizeNullableText(process.env.STRIPE_SECRET_KEY);
}

async function stripeRequest(path, bodyParams) {
  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    throw new Error('Stripe não configurado (STRIPE_SECRET_KEY)');
  }

  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: bodyParams,
  });

  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message = payload?.error?.message || `Stripe API error (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

async function resolveStripePriceId(supabase, bodyData) {
  const explicitPriceId = normalizeNullableText(bodyData?.priceId || bodyData?.price_id);
  if (explicitPriceId) {
    return explicitPriceId;
  }

  const requestedPlanCode = normalizeNullableText(bodyData?.planCode || bodyData?.plan_code);
  if (requestedPlanCode) {
    const { data: plan, error } = await supabase
      .from('billing_plans')
      .select('metadata')
      .eq('code', requestedPlanCode)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const stripePriceFromMetadata = normalizeNullableText(plan?.metadata?.stripe_price_id);
    if (stripePriceFromMetadata) {
      return stripePriceFromMetadata;
    }
  }

  return normalizeNullableText(process.env.STRIPE_DEFAULT_PRICE_ID);
}

async function ensureTenantBillingProfile(supabase, tenantId) {
  const { data: profile, error } = await supabase
    .from('tenant_billing_profiles')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (profile) {
    return profile;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('tenant_billing_profiles')
    .insert({ tenant_id: tenantId, payment_provider: 'stripe' })
    .select('*')
    .single();

  if (insertError) {
    throw insertError;
  }

  return inserted;
}

async function ensureStripeCustomerForTenant({ supabase, tenantId, actor, tenantName }) {
  const profile = await ensureTenantBillingProfile(supabase, tenantId);

  const currentCustomerId = normalizeNullableText(profile?.provider_customer_id);
  if (currentCustomerId) {
    return currentCustomerId;
  }

  const customerParams = new URLSearchParams();
  customerParams.append('name', tenantName || `Tenant ${tenantId}`);

  const email = normalizeNullableText(profile?.billing_email) || normalizeNullableText(actor?.email);
  if (email) {
    customerParams.append('email', email);
  }

  customerParams.append('metadata[tenant_id]', tenantId);
  if (actor?.id != null) {
    customerParams.append('metadata[actor_user_id]', String(actor.id));
  }

  const customer = await stripeRequest('/customers', customerParams);
  const customerId = normalizeNullableText(customer?.id);

  if (!customerId) {
    throw new Error('Falha ao criar customer no Stripe');
  }

  await supabase
    .from('tenant_billing_profiles')
    .upsert({
      tenant_id: tenantId,
      payment_provider: 'stripe',
      provider_customer_id: customerId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id' });

  return customerId;
}

async function getTenantBasicInfo(supabase, tenantId) {
  const { data, error } = await supabase
    .from('tenants')
    .select('id,name,slug')
    .eq('id', tenantId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function createStripeCheckoutSession({ supabase, req, actor, tenantId, body }) {
  const bodyData = body?.data && typeof body.data === 'object' ? body.data : {};
  const tenant = await getTenantBasicInfo(supabase, tenantId);
  const tenantName = tenant?.name || tenant?.slug || `Tenant ${tenantId}`;
  const customerId = await ensureStripeCustomerForTenant({ supabase, tenantId, actor, tenantName });

  const priceId = await resolveStripePriceId(supabase, bodyData);
  if (!priceId) {
    return { ok: false, status: 400, error: 'Preço Stripe não configurado (priceId/planCode/STRIPE_DEFAULT_PRICE_ID)' };
  }

  const baseUrl = getAppBaseUrl(req);
  const successUrl = normalizeNullableText(body?.successUrl || body?.success_url) || `${baseUrl}/?billing=success`;
  const cancelUrl = normalizeNullableText(body?.cancelUrl || body?.cancel_url) || `${baseUrl}/?billing=cancel`;
  const quantity = Math.max(1, normalizePositiveInteger(bodyData?.quantity, 1) || 1);

  const params = new URLSearchParams();
  params.append('mode', 'subscription');
  params.append('customer', customerId);
  params.append('success_url', successUrl);
  params.append('cancel_url', cancelUrl);
  params.append('line_items[0][price]', priceId);
  params.append('line_items[0][quantity]', String(quantity));
  params.append('allow_promotion_codes', 'true');
  params.append('billing_address_collection', 'auto');
  params.append('metadata[tenant_id]', tenantId);
  if (actor?.id != null) {
    params.append('metadata[actor_user_id]', String(actor.id));
  }

  params.append('payment_method_types[0]', 'card');
  params.append('payment_method_types[1]', 'mb_way');
  params.append('payment_method_types[2]', 'multibanco');

  try {
    const session = await stripeRequest('/checkout/sessions', params);
    return {
      ok: true,
      status: 200,
      payload: {
        success: true,
        provider: 'stripe',
        tenantId,
        customerId,
        checkoutSessionId: session?.id || null,
        checkoutUrl: session?.url || null,
      },
    };
  } catch (error) {
    return { ok: false, status: 500, error: String(error?.message || error || 'Falha ao criar sessão de checkout') };
  }
}

async function createStripeBillingPortalSession({ supabase, req, actor, tenantId, body }) {
  const tenant = await getTenantBasicInfo(supabase, tenantId);
  const tenantName = tenant?.name || tenant?.slug || `Tenant ${tenantId}`;
  const customerId = await ensureStripeCustomerForTenant({ supabase, tenantId, actor, tenantName });

  const baseUrl = getAppBaseUrl(req);
  const returnUrl = normalizeNullableText(body?.returnUrl || body?.return_url) || `${baseUrl}/?billing=portal`;

  const params = new URLSearchParams();
  params.append('customer', customerId);
  params.append('return_url', returnUrl);

  try {
    const session = await stripeRequest('/billing_portal/sessions', params);
    return {
      ok: true,
      status: 200,
      payload: {
        success: true,
        provider: 'stripe',
        tenantId,
        customerId,
        portalUrl: session?.url || null,
      },
    };
  } catch (error) {
    return { ok: false, status: 500, error: String(error?.message || error || 'Falha ao criar sessão de portal de cobrança') };
  }
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

  return { ok: false, status: 403, error: 'Apenas admin e super_user podem gerir billing' };
}

async function assertCanReadTenantBilling(supabase, actor, tenantId) {
  if (isAdminRole(actor?.role)) {
    if (!actor?.tenant_id || String(actor.tenant_id) !== String(tenantId)) {
      return { ok: false, status: 403, error: 'Sem permissão para consultar billing deste tenant' };
    }
    return { ok: true };
  }

  if (!isSuperUserRole(actor?.role)) {
    return { ok: false, status: 403, error: 'Apenas admin e super_user podem consultar billing' };
  }

  const { data: canAccess, error } = await supabase.rpc('user_can_access_tenant', {
    p_user_id: actor.id,
    p_tenant_id: tenantId,
  });

  if (error) {
    return { ok: false, status: 500, error: 'Erro ao validar acesso ao tenant' };
  }

  if (!canAccess) {
    return { ok: false, status: 403, error: 'Sem permissão para consultar billing deste tenant' };
  }

  return { ok: true };
}

async function assertCanWriteTenantBilling(supabase, actor, tenantId) {
  if (isAdminRole(actor?.role)) {
    if (!actor?.tenant_id || String(actor.tenant_id) !== String(tenantId)) {
      return { ok: false, status: 403, error: 'Sem permissão para editar billing deste tenant' };
    }
    return { ok: true };
  }

  if (!isSuperUserRole(actor?.role)) {
    return { ok: false, status: 403, error: 'Apenas admin e super_user podem editar billing' };
  }

  const { data: canEdit, error } = await supabase.rpc('user_can_edit_tenant', {
    p_user_id: actor.id,
    p_tenant_id: tenantId,
  });

  if (!error) {
    if (!canEdit) {
      return { ok: false, status: 403, error: 'Sem permissão para editar billing deste tenant' };
    }
    return { ok: true };
  }

  const message = String(error?.message || '').toLowerCase();
  if (message.includes('user_can_edit_tenant') && message.includes('does not exist')) {
    return { ok: true };
  }

  return { ok: false, status: 500, error: 'Erro ao validar permissão de edição do tenant' };
}

async function getTenantBillingState(supabase, tenantId) {
  const { data: stateData, error: stateError } = await supabase.rpc('tenant_billing_state', {
    row_tenant_id: tenantId,
  });

  if (stateError) {
    throw stateError;
  }

  const state = Array.isArray(stateData) ? stateData[0] : stateData;

  const { data: subscription, error: subscriptionError } = await supabase
    .from('tenant_subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('current_period_end', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) throw subscriptionError;

  return {
    state: state || null,
    subscription: subscription || null,
  };
}

async function listTenantInvoices(supabase, tenantId, limit) {
  const { data, error } = await supabase
    .from('tenant_invoices')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

function parseSubscriptionPayload(rawData) {
  const data = rawData && typeof rawData === 'object' ? rawData : {};

  const status = normalizeStatus(data.status);
  if (!SUBSCRIPTION_STATUSES.has(status)) {
    return { ok: false, error: 'status de subscrição inválido' };
  }

  const paymentStatus = normalizeNullableText(data.payment_status || data.paymentStatus);
  const currency = String(data.currency || 'EUR').trim().toUpperCase();
  const amountCents = normalizePositiveInteger(data.amount_cents ?? data.amountCents, null);
  const quantity = normalizePositiveInteger(data.quantity, 1);
  const planId = normalizeNullableText(data.billing_plan_id || data.billingPlanId);
  const providerSubscriptionId = normalizeNullableText(data.provider_subscription_id || data.providerSubscriptionId);
  const graceUntil = normalizeNullableTimestamp(data.grace_until || data.graceUntil);
  const currentPeriodStart = normalizeNullableTimestamp(data.current_period_start || data.currentPeriodStart);
  const currentPeriodEnd = normalizeNullableTimestamp(data.current_period_end || data.currentPeriodEnd);
  const trialEndsAt = normalizeNullableTimestamp(data.trial_ends_at || data.trialEndsAt);
  const canceledAt = normalizeNullableTimestamp(data.canceled_at || data.canceledAt);
  const startedAt = normalizeNullableTimestamp(data.started_at || data.startedAt);
  const endedAt = normalizeNullableTimestamp(data.ended_at || data.endedAt);
  const cancelAtPeriodEnd = Boolean(data.cancel_at_period_end ?? data.cancelAtPeriodEnd);

  if (currency.length !== 3) {
    return { ok: false, error: 'currency inválida (use código ISO de 3 letras)' };
  }

  const metadata = data.metadata && typeof data.metadata === 'object' ? data.metadata : null;

  return {
    ok: true,
    payload: {
      status,
      payment_status: paymentStatus,
      currency,
      amount_cents: amountCents,
      quantity,
      billing_plan_id: planId,
      provider_subscription_id: providerSubscriptionId,
      grace_until: graceUntil,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      trial_ends_at: trialEndsAt,
      canceled_at: canceledAt,
      started_at: startedAt,
      ended_at: endedAt,
      cancel_at_period_end: cancelAtPeriodEnd,
      metadata,
    },
  };
}

async function upsertTenantSubscription(supabase, tenantId, data, actorId) {
  const parsed = parseSubscriptionPayload(data);
  if (!parsed.ok) {
    return { ok: false, status: 400, error: parsed.error };
  }

  const nowIso = new Date().toISOString();
  const payload = {
    tenant_id: tenantId,
    ...parsed.payload,
    updated_at: nowIso,
  };

  if (payload.provider_subscription_id) {
    const { data: rows, error } = await supabase
      .from('tenant_subscriptions')
      .upsert(payload, { onConflict: 'provider_subscription_id' })
      .select('*')
      .limit(1);

    if (error) {
      return { ok: false, status: 500, error: 'Erro ao atualizar subscrição do tenant' };
    }

    const subscription = Array.isArray(rows) ? rows[0] : rows;
    return { ok: true, subscription: subscription || null };
  }

  const { data: existing, error: existingError } = await supabase
    .from('tenant_subscriptions')
    .select('id')
    .eq('tenant_id', tenantId)
    .order('current_period_end', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return { ok: false, status: 500, error: 'Erro ao localizar subscrição existente do tenant' };
  }

  let result;
  if (existing?.id) {
    result = await supabase
      .from('tenant_subscriptions')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single();
  } else {
    result = await supabase
      .from('tenant_subscriptions')
      .insert(payload)
      .select('*')
      .single();
  }

  if (result.error) {
    return { ok: false, status: 500, error: 'Erro ao persistir subscrição do tenant' };
  }

  await supabase.from('super_user_audit_log').insert({
    actor_user_id: actorId,
    actor_role: 'billing_update',
    action: 'upsert_tenant_subscription',
    target_tenant_id: tenantId,
    target_resource: 'tenant_subscriptions',
    target_resource_id: result.data?.id || null,
    success: true,
    after_state: result.data,
    created_at: nowIso,
  });

  return { ok: true, subscription: result.data || null };
}

function parseWebhookEvent(body) {
  const dataObject = body?.data?.object && typeof body.data.object === 'object' ? body.data.object : null;
  const metadata = dataObject?.metadata && typeof dataObject.metadata === 'object' ? dataObject.metadata : null;

  const provider = normalizeNullableText(body.provider || body.source || 'unknown');
  const eventId = normalizeNullableText(body.eventId || body.event_id || body.id);
  const eventType = normalizeNullableText(body.eventType || body.event_type || body.type || 'unknown');
  const tenantId = normalizeNullableText(
    body.tenantId ||
      body.tenant_id ||
      metadata?.tenant_id ||
      metadata?.tenantId ||
      dataObject?.tenant_id ||
      dataObject?.tenantId
  );
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : body;

  if (!provider || !eventId || !eventType) {
    return { ok: false, error: 'Webhook inválido (provider, eventId e eventType são obrigatórios)' };
  }

  return {
    ok: true,
    provider,
    eventId,
    eventType,
    tenantId,
    payload,
  };
}

function getWebhookDataObject(payload) {
  if (payload?.data?.object && typeof payload.data.object === 'object') {
    return payload.data.object;
  }
  return payload && typeof payload === 'object' ? payload : null;
}

function mapStripeSubscriptionStatus(rawStatus, eventType) {
  const status = normalizeStatus(rawStatus);
  if (SUBSCRIPTION_STATUSES.has(status)) {
    return status;
  }

  const normalizedType = String(eventType || '').toLowerCase();
  if (normalizedType === 'invoice.payment_failed') return 'past_due';
  if (normalizedType === 'invoice.payment_succeeded') return 'active';
  if (normalizedType === 'customer.subscription.deleted') return 'canceled';

  return null;
}

async function markWebhookProcessed(supabase, provider, eventId, processingError = null) {
  const values = {
    processed_at: new Date().toISOString(),
    processing_error: processingError,
  };

  const { error } = await supabase
    .from('billing_webhook_events')
    .update(values)
    .eq('provider', provider)
    .eq('event_id', eventId);

  if (error) {
    console.warn('[BILLING] Falha ao marcar webhook processado:', error?.message || error);
  }
}

function mapWebhookToSubscriptionPatch(eventType, payload) {
  const normalizedType = String(eventType || '').toLowerCase();
  const dataObject = getWebhookDataObject(payload);

  if (normalizedType.includes('subscription') || normalizedType.includes('invoice')) {
    const status = mapStripeSubscriptionStatus(
      payload.subscription_status ||
        payload.status ||
        payload.subscription?.status ||
        dataObject?.status,
      normalizedType
    );

    if (!status) {
      return null;
    }

    return {
      status,
      payment_status: normalizeNullableText(
        payload.payment_status ||
          payload.invoice_payment_status ||
          dataObject?.payment_status
      ),
      current_period_start: normalizeNullableTimestamp(
        payload.current_period_start || dataObject?.current_period_start
      ),
      current_period_end: normalizeNullableTimestamp(
        payload.current_period_end || dataObject?.current_period_end
      ),
      grace_until: normalizeNullableTimestamp(payload.grace_until),
      provider_subscription_id: normalizeNullableText(
        payload.provider_subscription_id ||
          payload.subscription_id ||
          dataObject?.subscription ||
          dataObject?.id
      ),
      amount_cents: normalizePositiveInteger(
        payload.amount_cents || dataObject?.plan?.amount || dataObject?.amount_due,
        null
      ),
      currency: String(payload.currency || dataObject?.currency || 'EUR').toUpperCase(),
      metadata: payload,
    };
  }

  return null;
}

async function upsertInvoiceFromWebhook(supabase, tenantId, payload) {
  const dataObject = getWebhookDataObject(payload);
  const invoiceStatus = normalizeStatus(payload.invoice_status || payload.status || dataObject?.status || 'open');
  const providerInvoiceId = normalizeNullableText(payload.provider_invoice_id || payload.invoice_id || dataObject?.id);

  if (!providerInvoiceId || !INVOICE_STATUSES.has(invoiceStatus)) {
    return;
  }

  const nowIso = new Date().toISOString();
  const dueAt = normalizeNullableTimestamp(payload.due_at || dataObject?.due_date);
  const paidAt = normalizeNullableTimestamp(payload.paid_at || dataObject?.status_transitions?.paid_at);
  const failedAt = normalizeNullableTimestamp(payload.failed_at || dataObject?.status_transitions?.marked_uncollectible_at);

  const upsertPayload = {
    tenant_id: tenantId,
    provider_invoice_id: providerInvoiceId,
    invoice_number: normalizeNullableText(payload.invoice_number || dataObject?.number),
    status: invoiceStatus,
    amount_due_cents: normalizePositiveInteger(payload.amount_due_cents || dataObject?.amount_due, 0),
    amount_paid_cents: normalizePositiveInteger(payload.amount_paid_cents || dataObject?.amount_paid, 0),
    amount_remaining_cents: normalizePositiveInteger(payload.amount_remaining_cents || dataObject?.amount_remaining, 0),
    currency: String(payload.currency || dataObject?.currency || 'EUR').toUpperCase(),
    due_at: dueAt,
    paid_at: paidAt,
    failed_at: failedAt,
    hosted_invoice_url: normalizeNullableText(payload.hosted_invoice_url || dataObject?.hosted_invoice_url),
    pdf_url: normalizeNullableText(payload.pdf_url || dataObject?.invoice_pdf),
    metadata: payload,
    updated_at: nowIso,
  };

  await supabase.from('tenant_invoices').upsert(upsertPayload, { onConflict: 'provider_invoice_id' });
}

async function ingestWebhookEvent(supabase, req, body) {
  if (!isValidWebhookSecret(req)) {
    return { ok: false, status: 401, error: 'Webhook secret inválido' };
  }

  const parsed = parseWebhookEvent(body);
  if (!parsed.ok) {
    return { ok: false, status: 400, error: parsed.error };
  }

  const nowIso = new Date().toISOString();
  const insertPayload = {
    provider: parsed.provider,
    event_id: parsed.eventId,
    event_type: parsed.eventType,
    tenant_id: parsed.tenantId,
    payload: parsed.payload,
    received_at: nowIso,
  };

  const { error: insertError } = await supabase
    .from('billing_webhook_events')
    .insert(insertPayload);

  if (insertError) {
    const message = String(insertError?.message || '').toLowerCase();
    const duplicate = message.includes('duplicate key') || message.includes('unique');
    if (duplicate) {
      return { ok: true, status: 200, payload: { success: true, duplicate: true } };
    }
    return { ok: false, status: 500, error: 'Erro ao registrar webhook de billing' };
  }

  try {
    if (parsed.tenantId) {
      const subscriptionPatch = mapWebhookToSubscriptionPatch(parsed.eventType, parsed.payload);
      if (subscriptionPatch) {
        const upsertResult = await upsertTenantSubscription(
          supabase,
          parsed.tenantId,
          subscriptionPatch,
          null
        );

        if (!upsertResult.ok) {
          await markWebhookProcessed(supabase, parsed.provider, parsed.eventId, upsertResult.error);
          return { ok: false, status: upsertResult.status || 500, error: upsertResult.error };
        }
      }

      await upsertInvoiceFromWebhook(supabase, parsed.tenantId, parsed.payload);
    }

    await markWebhookProcessed(supabase, parsed.provider, parsed.eventId, null);
    return { ok: true, status: 200, payload: { success: true } };
  } catch (error) {
    const message = String(error?.message || error || 'Erro inesperado ao processar webhook');
    await markWebhookProcessed(supabase, parsed.provider, parsed.eventId, message);
    return { ok: false, status: 500, error: message };
  }
}

async function resolveAuthenticatedBillingContext(supabase, req, body, nowIso) {
  const token = body.token || getBearerToken(req);

  if (!token || typeof token !== 'string') {
    return { ok: false, status: 401, payload: { success: false, error: 'Token ausente' } };
  }

  const tokenHash = hashToken(token);
  const { session, actor } = await getSessionAndActor(supabase, tokenHash);

  if (!session || !actor) {
    return {
      ok: false,
      status: 401,
      payload: { success: false, error: 'Sessão inválida ou expirada', serverNow: nowIso },
    };
  }

  const tenantContext = await resolveTargetTenantId(actor, body.tenantId);
  if (!tenantContext.ok) {
    return {
      ok: false,
      status: tenantContext.status,
      payload: { success: false, error: tenantContext.error, serverNow: nowIso },
    };
  }

  return {
    ok: true,
    actor,
    targetTenantId: tenantContext.tenantId,
  };
}

async function handleReadBillingAction(supabase, actor, targetTenantId, nowIso) {
  const canRead = await assertCanReadTenantBilling(supabase, actor, targetTenantId);
  if (!canRead.ok) {
    return { status: canRead.status, payload: { success: false, error: canRead.error, serverNow: nowIso } };
  }

  const billing = await getTenantBillingState(supabase, targetTenantId);
  return { status: 200, payload: { success: true, tenantId: targetTenantId, ...billing, serverNow: nowIso } };
}

async function handleListInvoicesAction(supabase, actor, targetTenantId, body, nowIso) {
  const canRead = await assertCanReadTenantBilling(supabase, actor, targetTenantId);
  if (!canRead.ok) {
    return { status: canRead.status, payload: { success: false, error: canRead.error, serverNow: nowIso } };
  }

  const requestedLimit = normalizePositiveInteger(body.limit, 20);
  const limit = Math.max(1, Math.min(requestedLimit || 20, 100));
  const invoices = await listTenantInvoices(supabase, targetTenantId, limit);
  return { status: 200, payload: { success: true, tenantId: targetTenantId, invoices, serverNow: nowIso } };
}

async function handleCheckoutSessionAction(supabase, req, actor, targetTenantId, body, nowIso) {
  const canWrite = await assertCanWriteTenantBilling(supabase, actor, targetTenantId);
  if (!canWrite.ok) {
    return { status: canWrite.status, payload: { success: false, error: canWrite.error, serverNow: nowIso } };
  }

  const checkoutResult = await createStripeCheckoutSession({
    supabase,
    req,
    actor,
    tenantId: targetTenantId,
    body,
  });

  if (!checkoutResult.ok) {
    return {
      status: checkoutResult.status,
      payload: { success: false, error: checkoutResult.error, serverNow: nowIso },
    };
  }

  return { status: checkoutResult.status, payload: { ...checkoutResult.payload, serverNow: nowIso } };
}

async function handleBillingPortalAction(supabase, req, actor, targetTenantId, body, nowIso) {
  const canWrite = await assertCanWriteTenantBilling(supabase, actor, targetTenantId);
  if (!canWrite.ok) {
    return { status: canWrite.status, payload: { success: false, error: canWrite.error, serverNow: nowIso } };
  }

  const portalResult = await createStripeBillingPortalSession({
    supabase,
    req,
    actor,
    tenantId: targetTenantId,
    body,
  });

  if (!portalResult.ok) {
    return {
      status: portalResult.status,
      payload: { success: false, error: portalResult.error, serverNow: nowIso },
    };
  }

  return { status: portalResult.status, payload: { ...portalResult.payload, serverNow: nowIso } };
}

async function handleUpsertSubscriptionAction(supabase, actor, targetTenantId, body, nowIso) {
  const canWrite = await assertCanWriteTenantBilling(supabase, actor, targetTenantId);
  if (!canWrite.ok) {
    return { status: canWrite.status, payload: { success: false, error: canWrite.error, serverNow: nowIso } };
  }

  const writeResult = await upsertTenantSubscription(supabase, targetTenantId, body.data, actor.id);
  if (!writeResult.ok) {
    return { status: writeResult.status, payload: { success: false, error: writeResult.error, serverNow: nowIso } };
  }

  const billing = await getTenantBillingState(supabase, targetTenantId);

  return {
    status: 200,
    payload: {
      success: true,
      tenantId: targetTenantId,
      subscription: writeResult.subscription,
      ...billing,
      serverNow: nowIso,
    },
  };
}

async function processAuthenticatedBillingAction({ supabase, req, body, action, actor, targetTenantId, nowIso }) {
  const handlers = {
    get_billing: () => handleReadBillingAction(supabase, actor, targetTenantId, nowIso),
    list_invoices: () => handleListInvoicesAction(supabase, actor, targetTenantId, body, nowIso),
    create_checkout_session: () => handleCheckoutSessionAction(supabase, req, actor, targetTenantId, body, nowIso),
    create_billing_portal: () => handleBillingPortalAction(supabase, req, actor, targetTenantId, body, nowIso),
    upsert_subscription: () => handleUpsertSubscriptionAction(supabase, actor, targetTenantId, body, nowIso),
  };

  const executor = handlers[action] || handlers.upsert_subscription;
  return executor();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(500).json({ success: false, error: 'Servidor não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)' });
  }

  const body = parseJsonBody(req);
  const action = body.action;

  if (!ALLOWED_ACTIONS.has(action)) {
    return res.status(400).json({ success: false, error: 'Ação inválida' });
  }

  if (action === 'ingest_webhook') {
    const webhookResult = await ingestWebhookEvent(supabase, req, body);
    if (!webhookResult.ok) {
      return res.status(webhookResult.status).json({ success: false, error: webhookResult.error });
    }
    return res.status(webhookResult.status).json(webhookResult.payload);
  }

  const nowIso = new Date().toISOString();

  try {
    const authContext = await resolveAuthenticatedBillingContext(supabase, req, body, nowIso);
    if (!authContext.ok) {
      return res.status(authContext.status).json(authContext.payload);
    }

    const result = await processAuthenticatedBillingAction({
      supabase,
      req,
      body,
      action,
      actor: authContext.actor,
      targetTenantId: authContext.targetTenantId,
      nowIso,
    });

    return res.status(result.status).json(result.payload);
  } catch (error) {
    console.error('[BILLING_API] Error:', error);
    return res.status(500).json({ success: false, error: 'Erro ao processar billing do tenant' });
  }
}

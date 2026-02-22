function normalizeHost(value) {
  if (!value || typeof value !== 'string') return null;
  const host = value.trim().toLowerCase();
  if (!host) return null;
  return host.split(':')[0] || null;
}

function extractSubdomainFromHost(host) {
  if (!host) return null;

  if (host === 'localhost' || host.endsWith('.localhost')) {
    const parts = host.split('.');
    if (parts.length >= 2) {
      return parts[0] || null;
    }
    return null;
  }

  const parts = host.split('.');
  if (parts.length < 3) {
    return null;
  }

  return parts[0] || null;
}

export function getRequestSubdomain(req) {
  const forwardedHost = req?.headers?.['x-forwarded-host'];
  const hostHeader = req?.headers?.host;
  const host = normalizeHost(forwardedHost || hostHeader);
  return extractSubdomainFromHost(host);
}

export function getRequestHost(req) {
  const forwardedHost = req?.headers?.['x-forwarded-host'];
  const hostHeader = req?.headers?.host;
  return normalizeHost(forwardedHost || hostHeader);
}

export async function resolveTenantByRequest(req, supabase) {
  const host = getRequestHost(req);
  const subdomain = getRequestSubdomain(req);

  if (host) {
    const { data: tenantDomain, error: domainError } = await supabase
      .from('tenant_domains')
      .select('tenant_id,status,domain')
      .eq('domain', host)
      .eq('status', 'active')
      .maybeSingle();

    if (domainError) throw domainError;

    if (tenantDomain?.tenant_id) {
      const { data: tenantByDomain, error: tenantDomainLookupError } = await supabase
        .from('tenants')
        .select('id,slug,subdomain,status')
        .eq('id', tenantDomain.tenant_id)
        .eq('status', 'active')
        .maybeSingle();

      if (tenantDomainLookupError) throw tenantDomainLookupError;

      if (tenantByDomain) {
        return {
          tenant: tenantByDomain,
          subdomain,
          host,
          source: 'domain',
        };
      }
    }
  }

  if (!subdomain || subdomain === 'www') {
    return { tenant: null, subdomain: null, host, source: null };
  }

  const { data, error } = await supabase
    .from('tenants')
    .select('id,slug,subdomain,status')
    .or(`subdomain.eq.${subdomain},slug.eq.${subdomain}`)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;

  return {
    tenant: data || null,
    subdomain,
    host,
    source: 'subdomain',
  };
}

export function assertUserTenant(userTenantId, tenant) {
  if (!tenant) return true;
  return String(userTenantId || '') === String(tenant.id || '');
}

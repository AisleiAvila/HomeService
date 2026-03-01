export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sessionTtlHours = process.env.SESSION_TTL_HOURS;

  return res.status(200).json({
    success: true,
    vercel: {
      env: process.env.VERCEL_ENV || null,
      region: process.env.VERCEL_REGION || null,
      gitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
    },
    config: {
      hasSupabaseUrl: Boolean(supabaseUrl),
      supabaseUrlHost: supabaseUrl ? safeHost(supabaseUrl) : null,
      hasServiceRoleKey: Boolean(serviceRoleKey),
      serviceRoleKeyLength: typeof serviceRoleKey === 'string' ? serviceRoleKey.length : 0,
      sessionTtlHours: sessionTtlHours || null,
    },
  });
}

function safeHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

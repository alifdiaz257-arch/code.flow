/**
 * ============================================================
 * CodeFlow — Cloudflare Worker
 * ============================================================
 * Dua endpoint:
 *   POST /api/verify           → verifikasi token Cloudflare Turnstile
 *   POST /api/github/exchange  → tukar OAuth "code" GitHub menjadi access_token
 *
 * Secret yang dibutuhkan (set lewat `wrangler secret put <NAMA>`,
 * JANGAN ditulis langsung di file ini):
 *   TURNSTILE_SECRET_KEY   → dari dashboard Cloudflare Turnstile
 *   GITHUB_CLIENT_SECRET   → dari GitHub OAuth App
 *
 * Variabel biasa (boleh di wrangler.toml, tidak rahasia):
 *   GITHUB_CLIENT_ID
 *   ALLOWED_ORIGIN          → domain tempat frontend di-deploy (untuk CORS)
 * ============================================================
 */

function corsHeaders(origin, allowedOrigin){
  const allow = allowedOrigin && allowedOrigin !== '*' ? allowedOrigin : (origin || '*');
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

async function handleVerify(request, env, cors){
  try{
    const { token } = await request.json();
    if (!token){
      return json({ success: false, message: 'Token tidak ditemukan.' }, 400, cors);
    }

    const form = new FormData();
    form.append('secret', env.TURNSTILE_SECRET_KEY);
    form.append('response', token);
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip) form.append('remoteip', ip);

    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const result = await verifyRes.json();

    return json({
      success: !!result.success,
      message: result.success ? 'Verifikasi berhasil.' : 'Verifikasi ditolak Cloudflare.',
      errorCodes: result['error-codes'] || [],
    }, 200, cors);
  }catch(err){
    return json({ success: false, message: 'Kesalahan server saat verifikasi.' }, 500, cors);
  }
}

async function handleGithubExchange(request, env, cors){
  try{
    const { code, redirect_uri } = await request.json();
    if (!code){
      return json({ message: 'Kode OAuth tidak ditemukan.' }, 400, cors);
    }

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri,
      }),
    });
    const data = await tokenRes.json();

    if (data.error){
      return json({ message: data.error_description || data.error }, 400, cors);
    }

    return json({ access_token: data.access_token, scope: data.scope, token_type: data.token_type }, 200, cors);
  }catch(err){
    return json({ message: 'Kesalahan server saat menukar token.' }, 500, cors);
  }
}

function json(body, status, cors){
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

export default {
  async fetch(request, env){
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === 'OPTIONS'){
      return new Response(null, { headers: cors });
    }

    if (request.method === 'POST' && url.pathname === '/api/verify'){
      return handleVerify(request, env, cors);
    }

    if (request.method === 'POST' && url.pathname === '/api/github/exchange'){
      return handleGithubExchange(request, env, cors);
    }

    return json({ message: 'Not found' }, 404, cors);
  },
};

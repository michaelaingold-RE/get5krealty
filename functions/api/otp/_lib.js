// Shared helpers for the Shingle phone verification functions (Twilio Verify).
// Secrets come from Cloudflare Pages environment variables. Nothing is logged.
export const LIMITS = { phoneHour: 3, ipHour: 6, dailyCap: 200, checkWindow: 5, smsPerPhone: 2, callPerPhone: 1 };

export const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

// US numbers only. Returns E.164 (+1XXXXXXXXXX) or null.
export function usPhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length === 11 && d[0] === '1') d = d.slice(1);
  if (d.length !== 10) return null;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(d)) return null; // NANP area code and exchange can't start with 0 or 1
  return '+1' + d;
}

export function configured(env) {
  const auth = (env.TWILIO_API_KEY_SID && env.TWILIO_API_KEY_SECRET) || env.TWILIO_AUTH_TOKEN;
  return !!(env.TWILIO_ACCOUNT_SID && auth && env.TWILIO_VERIFY_SERVICE_SID && env.TURNSTILE_SECRET_KEY && env.OTP_KV);
}

function authHeader(env) {
  const user = env.TWILIO_API_KEY_SID && env.TWILIO_API_KEY_SECRET ? env.TWILIO_API_KEY_SID : env.TWILIO_ACCOUNT_SID;
  const pass = env.TWILIO_API_KEY_SID && env.TWILIO_API_KEY_SECRET ? env.TWILIO_API_KEY_SECRET : env.TWILIO_AUTH_TOKEN;
  return 'Basic ' + btoa(user + ':' + pass);
}

export async function twilio(env, path, params) {
  const url = `https://verify.twilio.com/v2/Services/${env.TWILIO_VERIFY_SERVICE_SID}/${path}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { authorization: authHeader(env), 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  let data = {};
  try { data = await r.json(); } catch (_) {}
  return { ok: r.ok, status: r.status, data };
}

export async function turnstileOk(env, token, ip) {
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET_KEY);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const d = await r.json().catch(() => ({}));
  return d.success === true;
}

// Fixed-window counter in KV. Returns the new count; ttl in seconds (KV minimum 60).
export async function bump(kv, key, ttl) {
  const n = parseInt((await kv.get(key)) || '0', 10) + 1;
  await kv.put(key, String(n), { expirationTtl: Math.max(60, ttl) });
  return n;
}
export async function peek(kv, key) { return parseInt((await kv.get(key)) || '0', 10); }

export const clientIp = (request) => request.headers.get('cf-connecting-ip') || '';
export const today = () => new Date().toISOString().slice(0, 10);
export async function readJson(request) { try { return await request.json(); } catch (_) { return null; } }

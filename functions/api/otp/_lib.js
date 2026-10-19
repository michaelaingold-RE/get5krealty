// © 2026 Ingold Group Properties, LLC dba 5K Realty. All rights reserved.
// Shared helpers for the Shingle phone verification functions (Twilio Verify).
// Secrets come from Cloudflare Pages environment variables. Only Twilio error status and code are logged.
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

// Owner test mode: OWNER_TEST_PHONES is a comma-separated list of E.164 numbers (other US formats are normalized).
// Those numbers skip the per-phone code limits in /api/otp/start, and their receipts are stored with is_test = 1.
// Unset or empty: nobody is an owner, so nothing changes.
export function ownerPhones(env) {
  return new Set(String((env && env.OWNER_TEST_PHONES) || '').split(',').map(usPhone).filter(Boolean));
}
export const isOwnerPhone = (env, phone) => !!phone && ownerPhones(env).has(phone);

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

// Receipt token: proves this phone passed a code check in the last 30 minutes. Format "<exp>.<sig>",
// sig = base64url(HMAC-SHA256(RECEIPT_TOKEN_SECRET, "<phone>.<exp>")). exp is Unix seconds.
export const TOKEN_TTL = 1800;
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg)));
}
export async function signToken(secret, phone, now = Date.now()) {
  const exp = Math.floor(now / 1000) + TOKEN_TTL;
  return `${exp}.${await hmac(secret, `${phone}.${exp}`)}`;
}
// Returns the time the code was approved (ISO) when the token is valid for this phone, else null.
export async function verifyToken(secret, token, phone, now = Date.now()) {
  const m = /^(\d{10})\.([\w-]{43})$/.exec(String(token || ''));
  if (!secret || !m || !phone) return null;
  const exp = parseInt(m[1], 10);
  if (exp * 1000 < now) return null;
  const want = await hmac(secret, `${phone}.${exp}`);
  let diff = 0; for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ m[2].charCodeAt(i);
  return diff === 0 ? new Date((exp - TOKEN_TTL) * 1000).toISOString() : null;
}

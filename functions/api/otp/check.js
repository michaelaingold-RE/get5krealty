// POST /api/otp/check  { phone, code }  ->  { ok: true, verifiedAt } when Twilio approves the code.
import { LIMITS, json, usPhone, configured, twilio, bump, peek, readJson } from './_lib.js';

export async function onRequestPost({ request, env }) {
  if (!configured(env)) return json({ ok: false, error: 'not_configured' }, 503);
  const body = await readJson(request);
  if (!body) return json({ ok: false, error: 'bad_request' }, 400);
  const phone = usPhone(body.phone);
  const code = String(body.code || '').trim();
  if (!phone) return json({ ok: false, error: 'us_only' }, 400);
  if (!/^\d{4,10}$/.test(code)) return json({ ok: false, error: 'bad_code' }, 400);

  const kv = env.OTP_KV;
  if ((await peek(kv, `chk:${phone}`)) >= LIMITS.checkWindow) return json({ ok: false, error: 'rate_check' }, 429);
  await bump(kv, `chk:${phone}`, 600);

  const r = await twilio(env, 'VerificationCheck', { To: phone, Code: code });
  if (r.ok && r.data && r.data.status === 'approved') return json({ ok: true, verifiedAt: new Date().toISOString() });
  if (r.status === 404) return json({ ok: false, error: 'expired' }, 400); // Twilio returns 404 when no pending verification
  if (r.ok) return json({ ok: false, error: 'wrong_code' }, 400);
  return json({ ok: false, error: 'check_failed' }, 502);
}

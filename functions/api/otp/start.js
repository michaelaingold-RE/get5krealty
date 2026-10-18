// © 2026 Ingold Group Properties, LLC dba 5K Realty. All rights reserved.
// POST /api/otp/start  { phone, channel: "sms" | "call", turnstileToken }
// Sends a code with Twilio Verify. SMS twice at most (first send + one resend), then one voice call.
import { LIMITS, json, usPhone, configured, twilio, turnstileOk, bump, peek, clientIp, today, readJson } from './_lib.js';

// Twilio error codes. Account-level problems (auth, compliance, fraud block, max attempts) are on our end.
const ACCOUNT_CODES = [20003, 21608, 60410, 60203];
const BAD_NUMBER_CODES = [60200, 21211, 21614];

export async function onRequestPost({ request, env }) {
  if (!configured(env)) return json({ ok: false, error: 'not_configured' }, 503);
  const body = await readJson(request);
  if (!body) return json({ ok: false, error: 'bad_request' }, 400);
  const phone = usPhone(body.phone);
  if (!phone) return json({ ok: false, error: 'us_only' }, 400);
  const channel = body.channel === 'call' ? 'call' : 'sms';
  const ip = clientIp(request);

  if (!(await turnstileOk(env, body.turnstileToken, ip))) return json({ ok: false, error: 'turnstile' }, 403);

  const kv = env.OTP_KV;
  const day = today();
  if ((await peek(kv, `cap:${day}`)) >= LIMITS.dailyCap) return json({ ok: false, error: 'daily_cap' }, 429);
  if ((await peek(kv, `ip:${ip}`)) >= LIMITS.ipHour) return json({ ok: false, error: 'rate_ip' }, 429);
  if ((await peek(kv, `ph:${phone}`)) >= LIMITS.phoneHour) return json({ ok: false, error: 'rate_phone' }, 429);

  const sms = await peek(kv, `sms:${phone}`);
  if (channel === 'sms' && sms >= LIMITS.smsPerPhone) return json({ ok: false, error: 'use_call' }, 429);
  if (channel === 'call') {
    if (sms < 1) return json({ ok: false, error: 'sms_first' }, 400);
    if ((await peek(kv, `call:${phone}`)) >= LIMITS.callPerPhone) return json({ ok: false, error: 'rate_phone' }, 429);
  }

  await bump(kv, `cap:${day}`, 86400);
  await bump(kv, `ip:${ip}`, 3600);
  await bump(kv, `ph:${phone}`, 3600);

  const r = await twilio(env, 'Verifications', { To: phone, Channel: channel });
  if (!r.ok) {
    const code = r.data.code || 0;
    console.log('otp start twilio error', r.status, code); // status and code only, never the phone
    const error = ACCOUNT_CODES.includes(code) ? 'unavailable' : BAD_NUMBER_CODES.includes(code) ? 'bad_number' : 'send_failed';
    return json({ ok: false, error, twilio: code }, 502);
  }
  await bump(kv, `${channel}:${phone}`, 3600);
  return json({ ok: true, channel, resendLeft: Math.max(0, LIMITS.smsPerPhone - (channel === 'sms' ? sms + 1 : sms)) });
}

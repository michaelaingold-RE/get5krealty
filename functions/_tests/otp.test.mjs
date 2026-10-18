// Unit tests for functions/api/otp with a mocked Twilio, Turnstile and KV. No network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost as start } from '../api/otp/start.js';
import { onRequestPost as check } from '../api/otp/check.js';
import { usPhone } from '../api/otp/_lib.js';

function kv() { const m = new Map(); return { m, get: async k => m.get(k) ?? null, put: async (k, v) => { m.set(k, v) } }; }
function env(over = {}) {
  return { TWILIO_ACCOUNT_SID: 'ACtest', TWILIO_API_KEY_SID: 'SKtest', TWILIO_API_KEY_SECRET: 'sec', TWILIO_VERIFY_SERVICE_SID: 'VAtest',
    TURNSTILE_SECRET_KEY: 'ts', OTP_KV: kv(), ...over };
}
let calls = [];
function mockFetch({ turnstile = true, verifyStatus = 201, verifyCode, checkStatus = 'approved', checkHttp = 200 } = {}) {
  calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('turnstile')) return new Response(JSON.stringify({ success: turnstile }));
    if (String(url).endsWith('/Verifications')) return new Response(JSON.stringify(verifyCode ? { code: verifyCode, status: verifyStatus } : { status: 'pending' }), { status: verifyStatus });
    if (String(url).endsWith('/VerificationCheck')) return new Response(JSON.stringify({ status: checkStatus }), { status: checkHttp });
    throw new Error('unexpected network call ' + url);
  };
}
const req = (body, ip = '1.2.3.4') => new Request('https://x/api/otp/start', { method: 'POST', headers: { 'cf-connecting-ip': ip }, body: JSON.stringify(body) });
const go = async (fn, e, body, ip) => { const r = await fn({ request: req(body, ip), env: e }); return { status: r.status, ...(await r.json()) }; };

test('usPhone: US only', () => {
  assert.equal(usPhone('(704) 649-6781'), '+17046496781');
  assert.equal(usPhone('1-704-649-6781'), '+17046496781');
  assert.equal(usPhone('+44 20 7946 0958'), null);
  assert.equal(usPhone('123'), null);
  assert.equal(usPhone('0046496781'), null);
});

test('not configured returns 503 and makes no calls', async () => {
  mockFetch();
  const r = await go(start, env({ TWILIO_VERIFY_SERVICE_SID: '' }), { phone: '7046496781', turnstileToken: 't' });
  assert.equal(r.status, 503); assert.equal(calls.length, 0);
});

test('turnstile failure blocks the send', async () => {
  mockFetch({ turnstile: false });
  const r = await go(start, env(), { phone: '7046496781', turnstileToken: 't' });
  assert.equal(r.error, 'turnstile'); assert.ok(!calls.some(c => c.url.includes('twilio')));
});

test('non-US number rejected before any call', async () => {
  mockFetch();
  const r = await go(start, env(), { phone: '+442079460958', turnstileToken: 't' });
  assert.equal(r.error, 'us_only'); assert.equal(calls.length, 0);
});

test('sms, one resend, then call; sends correct Twilio request with API key auth', async () => {
  mockFetch(); const e = env();
  const a = await go(start, e, { phone: '7046496781', channel: 'sms', turnstileToken: 't' });
  assert.equal(a.ok, true); assert.equal(a.resendLeft, 1);
  const tw = calls.find(c => c.url.includes('verify.twilio.com'));
  assert.equal(tw.url, 'https://verify.twilio.com/v2/Services/VAtest/Verifications');
  assert.equal(tw.init.headers.authorization, 'Basic ' + btoa('SKtest:sec'));
  assert.equal(tw.init.body, 'To=%2B17046496781&Channel=sms');
  const b = await go(start, e, { phone: '7046496781', channel: 'sms', turnstileToken: 't' });
  assert.equal(b.ok, true); assert.equal(b.resendLeft, 0);
  const c = await go(start, e, { phone: '7046496781', channel: 'sms', turnstileToken: 't' });
  assert.equal(c.error, 'use_call');
  const d = await go(start, e, { phone: '7046496781', channel: 'call', turnstileToken: 't' });
  assert.equal(d.ok, true); assert.equal(d.channel, 'call');
  const f = await go(start, e, { phone: '7046496781', channel: 'call', turnstileToken: 't' });
  assert.equal(f.status, 429);
});

test('call before any sms is refused', async () => {
  mockFetch();
  const r = await go(start, env(), { phone: '7046496781', channel: 'call', turnstileToken: 't' });
  assert.equal(r.error, 'sms_first');
});

test('auth token fallback when no API key', async () => {
  mockFetch();
  await go(start, env({ TWILIO_API_KEY_SID: '', TWILIO_API_KEY_SECRET: '', TWILIO_AUTH_TOKEN: 'tok' }), { phone: '7046496781', turnstileToken: 't' });
  assert.equal(calls.find(c => c.url.includes('twilio')).init.headers.authorization, 'Basic ' + btoa('ACtest:tok'));
});

test('per-IP limit and daily cap', async () => {
  mockFetch(); const e = env();
  for (let i = 0; i < 6; i++) await go(start, e, { phone: `70455501${10 + i}`, turnstileToken: 't' }, '9.9.9.9');
  const r = await go(start, e, { phone: '7045550199', turnstileToken: 't' }, '9.9.9.9');
  assert.equal(r.error, 'rate_ip');
  e.OTP_KV.m.set('cap:' + new Date().toISOString().slice(0, 10), '200');
  const q = await go(start, e, { phone: '7045550198', turnstileToken: 't' }, '8.8.8.8');
  assert.equal(q.error, 'daily_cap');
});

test('twilio send error returns 502 with the twilio code', async () => {
  mockFetch({ verifyStatus: 500 });
  const r = await go(start, env(), { phone: '7046496781', turnstileToken: 't' });
  assert.equal(r.status, 502); assert.equal(r.error, 'send_failed'); assert.equal(r.twilio, 0);
});

test('account-level twilio codes map to unavailable', async () => {
  for (const code of [20003, 21608, 60410, 60203]) {
    mockFetch({ verifyStatus: 400, verifyCode: code });
    const r = await go(start, env(), { phone: '7046496781', turnstileToken: 't' });
    assert.deepEqual(r, { status: 502, ok: false, error: 'unavailable', twilio: code });
  }
});

test('bad-number twilio codes map to bad_number', async () => {
  for (const code of [60200, 21211, 21614]) {
    mockFetch({ verifyStatus: 400, verifyCode: code });
    const r = await go(start, env(), { phone: '7046496781', turnstileToken: 't' });
    assert.deepEqual(r, { status: 502, ok: false, error: 'bad_number', twilio: code });
  }
});

test('failed send does not use up the per-phone sms allowance', async () => {
  const e = env();
  mockFetch({ verifyStatus: 400, verifyCode: 21608 });
  await go(start, e, { phone: '7046496781', turnstileToken: 't' });
  assert.equal(e.OTP_KV.m.get('sms:+17046496781'), undefined);
  mockFetch();
  const r = await go(start, e, { phone: '7046496781', turnstileToken: 't' });
  assert.equal(r.ok, true); assert.equal(r.resendLeft, 1);
});

test('failure log has status and code only, never the phone', async () => {
  const logs = []; const orig = console.log; console.log = (...a) => logs.push(a.join(' '));
  try {
    mockFetch({ verifyStatus: 400, verifyCode: 21608 });
    await go(start, env(), { phone: '7046496781', turnstileToken: 't' });
  } finally { console.log = orig; }
  assert.deepEqual(logs, ['otp start twilio error 400 21608']);
});

test('check: approved, wrong, expired, rate limited', async () => {
  const e = env();
  mockFetch(); let r = await go(check, e, { phone: '7046496781', code: '123456' });
  assert.equal(r.ok, true); assert.ok(r.verifiedAt);
  assert.equal(calls[0].init.body, 'To=%2B17046496781&Code=123456');
  mockFetch({ checkStatus: 'pending' }); r = await go(check, e, { phone: '7046496781', code: '000000' });
  assert.equal(r.error, 'wrong_code');
  mockFetch({ checkHttp: 404 }); r = await go(check, e, { phone: '7046496781', code: '000000' });
  assert.equal(r.error, 'expired');
  mockFetch(); for (let i = 0; i < 2; i++) await go(check, e, { phone: '7046496781', code: '111111' });
  r = await go(check, e, { phone: '7046496781', code: '111111' });
  assert.equal(r.error, 'rate_check');
  r = await go(check, e, { phone: '7046496781', code: 'abc' });
  assert.equal(r.error, 'bad_code');
});

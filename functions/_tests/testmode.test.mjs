// Unit tests for owner test mode (OWNER_TEST_PHONES): code-limit bypass, is_test tagging, summary exclusion. No network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost as start } from '../api/otp/start.js';
import { onRequestPost as receipt } from '../api/receipt.js';
import { onRequestGet as summary } from '../api/receipts/summary.js';
import { onRequestGet as ownerPage } from '../owner/receipts.js';
import { onRequestGet as exportCsv } from '../api/receipts/export.csv.js';
import { ownerPhones, isOwnerPhone, signToken } from '../api/otp/_lib.js';
import { COLS } from '../api/receipts/_lib.js';

const OWNER = '+17046496781', OTHER = '+17045550123';
function kv() { const m = new Map(); return { m, get: async k => m.get(k) ?? null, put: async (k, v) => { m.set(k, v) } }; }
const baseEnv = (over = {}) => ({ TWILIO_ACCOUNT_SID: 'ACtest', TWILIO_API_KEY_SID: 'SKtest', TWILIO_API_KEY_SECRET: 'sec',
  TWILIO_VERIFY_SERVICE_SID: 'VAtest', TURNSTILE_SECRET_KEY: 'ts', OTP_KV: kv(), OWNER_TEST_PHONES: OWNER, ...over });
let calls = [];
function mockFetch({ turnstile = true } = {}) {
  calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('turnstile')) return new Response(JSON.stringify({ success: turnstile }));
    if (String(url).endsWith('/Verifications')) return new Response(JSON.stringify({ status: 'pending' }), { status: 201 });
    throw new Error('unexpected network call ' + url);
  };
}
const post = (body, ip = '1.2.3.4') => new Request('https://x/api', { method: 'POST', headers: { 'cf-connecting-ip': ip }, body: JSON.stringify(body) });
const go = async (fn, env, body, ip) => { const r = await fn({ request: post(body, ip), env }); return { status: r.status, ...(await r.json()) }; };

test('ownerPhones: comma list, any US format, junk ignored, unset means nobody', () => {
  assert.deepEqual([...ownerPhones({ OWNER_TEST_PHONES: ' +17046496781, (803) 555-0100 ,garbage,' })], ['+17046496781', '+18035550100']);
  assert.equal(ownerPhones({}).size, 0);
  assert.equal(isOwnerPhone({}, OWNER), false);
  assert.equal(isOwnerPhone({ OWNER_TEST_PHONES: OWNER }, OWNER), true);
  assert.equal(isOwnerPhone({ OWNER_TEST_PHONES: OWNER }, OTHER), false);
  assert.equal(isOwnerPhone({ OWNER_TEST_PHONES: OWNER }, null), false);
});

test('owner phone skips phoneHour, smsPerPhone (use_call) and callPerPhone', async () => {
  mockFetch(); const e = baseEnv();
  // 5 SMS in a row, from different IPs so the per-IP limit isn't what we're testing
  for (let i = 0; i < 5; i++) {
    const r = await go(start, e, { phone: '7046496781', channel: 'sms', turnstileToken: 't' }, `10.0.0.${i}`);
    assert.equal(r.ok, true, `sms ${i}`); assert.equal(r.resendLeft, 1);
  }
  for (let i = 0; i < 3; i++) {
    const r = await go(start, e, { phone: '7046496781', channel: 'call', turnstileToken: 't' }, `10.0.1.${i}`);
    assert.equal(r.ok, true, `call ${i}`); assert.equal(r.channel, 'call');
  }
});

test('other numbers keep every limit when an owner list is set', async () => {
  mockFetch(); const e = baseEnv();
  const a = await go(start, e, { phone: '7045550123', channel: 'sms', turnstileToken: 't' }, '10.1.0.1');
  const b = await go(start, e, { phone: '7045550123', channel: 'sms', turnstileToken: 't' }, '10.1.0.2');
  assert.equal(a.resendLeft, 1); assert.equal(b.resendLeft, 0);
  assert.equal((await go(start, e, { phone: '7045550123', channel: 'sms', turnstileToken: 't' }, '10.1.0.3')).error, 'use_call');
  assert.equal((await go(start, e, { phone: '7045550123', channel: 'call', turnstileToken: 't' }, '10.1.0.4')).ok, true);
  assert.equal((await go(start, e, { phone: '7045550123', channel: 'call', turnstileToken: 't' }, '10.1.0.5')).status, 429);
  // phoneHour (3 sends per hour) for another number
  const e2 = baseEnv(); e2.OTP_KV.m.set(`ph:${OTHER}`, '3');
  assert.equal((await go(start, e2, { phone: '7045550123', turnstileToken: 't' })).error, 'rate_phone');
  const e3 = baseEnv(); e3.OTP_KV.m.set(`ph:${OWNER}`, '3');
  assert.equal((await go(start, e3, { phone: '7046496781', turnstileToken: 't' })).ok, true);
});

test('owner phone still needs Turnstile, still counts toward the IP limit and the daily cap, and sms comes before call', async () => {
  mockFetch({ turnstile: false });
  assert.equal((await go(start, baseEnv(), { phone: '7046496781', turnstileToken: 't' })).error, 'turnstile');
  assert.equal((await go(start, baseEnv(), { phone: '7046496781' })).error, 'turnstile');
  assert.ok(!calls.some(u => u.includes('twilio')));
  mockFetch(); const e = baseEnv();
  for (let i = 0; i < 6; i++) assert.equal((await go(start, e, { phone: '7046496781', turnstileToken: 't' }, '9.9.9.9')).ok, true);
  assert.equal((await go(start, e, { phone: '7046496781', turnstileToken: 't' }, '9.9.9.9')).error, 'rate_ip');
  assert.equal(e.OTP_KV.m.get('ip:9.9.9.9'), '6');
  assert.equal(e.OTP_KV.m.get('cap:' + new Date().toISOString().slice(0, 10)), '6');
  e.OTP_KV.m.set('cap:' + new Date().toISOString().slice(0, 10), '200');
  assert.equal((await go(start, e, { phone: '7046496781', turnstileToken: 't' }, '8.8.8.8')).error, 'daily_cap');
  assert.equal((await go(start, baseEnv(), { phone: '7046496781', channel: 'call', turnstileToken: 't' })).error, 'sms_first');
});

test('no OWNER_TEST_PHONES: the owner number gets the normal limits', async () => {
  mockFetch(); const e = baseEnv({ OWNER_TEST_PHONES: undefined });
  await go(start, e, { phone: '7046496781', turnstileToken: 't' }, '10.2.0.1');
  await go(start, e, { phone: '7046496781', turnstileToken: 't' }, '10.2.0.2');
  assert.equal((await go(start, e, { phone: '7046496781', turnstileToken: 't' }, '10.2.0.3')).error, 'use_call');
});

// Minimal D1 stand-in: records statements and binds; answers the SELECT id lookup.
function d1(first = {}) {
  const log = [];
  return { log, prepare(sql) { const st = { sql, args: [], bind(...a) { st.args = a; return st; },
    run: async () => { log.push({ sql, args: st.args }); return { meta: { changes: 1 } }; },
    first: async () => { log.push({ sql, args: st.args }); return /^SELECT id FROM/.test(sql.trim()) ? { id: 7 } : first; },
    all: async () => { log.push({ sql, args: st.args }); return { results: first.rows || [] }; } }; return st; } };
}
const rcpt = phone => ({ phone, names: ['Pat Seller'], addr: '1 Main St', cityZip: 'Charlotte 28202', state: 'NC', email: 'p@example.com',
  version: '1.0', effective: '2026-10-18', acceptedAt: new Date().toISOString() });

test('receipt: owner phone stored with is_test = 1, other phones with 0', async () => {
  for (const [phone, want] of [[OWNER, 1], [OTHER, 0], ['(704) 649-6781', 1]]) {
    const db = d1(), e = { RECEIPTS_DB: db, OTP_KV: kv(), RECEIPT_TOKEN_SECRET: 's', OWNER_TEST_PHONES: OWNER };
    const norm = phone.startsWith('+') ? phone : OWNER;
    const r = await go(receipt, e, { ...rcpt(phone), token: await signToken('s', norm) });
    assert.equal(r.ok, true); assert.equal(r.id, 7);
    const ins = db.log.find(x => /INSERT INTO receipts/.test(x.sql));
    assert.match(ins.sql, /created_at, is_test\) VALUES \(\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?\)/);
    assert.equal(ins.args.length, 12); assert.equal(ins.args[11], want, phone);
  }
  const db = d1(), e = { RECEIPTS_DB: db, OTP_KV: kv(), RECEIPT_TOKEN_SECRET: 's' }; // no owner list
  await go(receipt, e, { ...rcpt(OWNER), token: await signToken('s', OWNER) });
  assert.equal(db.log.find(x => /INSERT/.test(x.sql)).args[11], 0);
});

// Access is mocked by giving accessOk a valid RS256 JWT, as in receipts.test.mjs.
const b64u = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
async function accessJwt(aud) {
  const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k-' + aud };
  globalThis.fetch = async () => new Response(JSON.stringify({ keys: [jwk] }));
  const h = b64u({ alg: 'RS256', kid: jwk.kid }), p = b64u({ aud: [aud], iss: 'https://team.cloudflareaccess.com', exp: Math.floor(Date.now() / 1000) + 600 });
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p));
  return h + '.' + p + '.' + Buffer.from(sig).toString('base64url');
}
const get = jwt => new Request('https://x/', { headers: { 'cf-access-jwt-assertion': jwt } });

test('summary: SQL leaves test rows out of total/last_24h/last_7d/newest_*, adds test_total', async () => {
  const db = d1({ total: 0, last_24h: 0, last_7d: 0, newest_id: null, newest_accepted_at_utc: null, test_total: 1 });
  const env = { ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com', ACCESS_AUD_SUMMARY: 'sum', RECEIPTS_DB: db };
  const r = await summary({ request: get(await accessJwt('sum')), env });
  const j = await r.json();
  assert.equal(r.status, 200);
  assert.deepEqual({ ...j, generated_at_utc: 'x' }, { ok: true, generated_at_utc: 'x', total: 0, last_24h: 0, last_7d: 0, newest_accepted_at_utc: null, newest_id: null, test_total: 1 });
  const sql = db.log[0].sql;
  for (const k of ['total', 'last_24h', 'last_7d', 'newest_id', 'newest_accepted_at_utc']) {
    const line = sql.split('\n').find(l => l.includes(`AS ${k},`) || l.trim().endsWith(`AS ${k}`) || l.includes(`AS ${k}`));
    assert.match(line, /is_test = 0/, k);
  }
  assert.match(sql, /WHERE is_test != 0\) AS test_total/);
});

test('owner page and export.csv carry the TEST marker', async () => {
  assert.equal(COLS[0], 'id'); assert.equal(COLS.at(-1), 'is_test');
  const rows = [{ id: 2, owner_names: '["Real Seller"]', is_test: 0 }, { id: 1, owner_names: '["Michael Ingold"]', is_test: 1 }];
  const env = { ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com', ACCESS_AUD: 'own', RECEIPTS_DB: d1({ rows }) };
  const jwt = await accessJwt('own');
  const html = await (await ownerPage({ request: get(jwt), env })).text();
  assert.match(html, /<th>test<\/th>/);
  assert.match(html, /<tr class="test"><td><b>TEST<\/b><\/td><td>1<\/td>/);
  assert.match(html, /<tr><td><\/td><td>2<\/td>/);
  assert.match(html, /1 marked TEST/);
  const csv = await (await exportCsv({ request: get(jwt), env })).text();
  const lines = csv.trim().split('\r\n');
  assert.ok(lines[0].startsWith('id,') && lines[0].endsWith(',created_at,is_test'));
  assert.ok(lines[1].endsWith(',0')); assert.ok(lines[2].endsWith(',1'));
});

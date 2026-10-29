// Unit tests for POST /api/receipt contact rules (phone OR email). In-memory D1 and KV fakes. No network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../api/receipt.js';
import { signToken } from '../api/otp/_lib.js';

function fakeDb() {
  const rows = [];
  return {
    rows,
    prepare(sql) {
      return {
        bind(...a) {
          return {
            async run() {
              assert.match(sql, /^INSERT INTO receipts/);
              const [accepted_at_utc, owner_names, property_address, city_zip, state, phone, email,
                disclaimer_version, disclaimer_effective, phone_verified_at, created_at] = a;
              for (const v of [accepted_at_utc, owner_names, property_address, city_zip, state, phone, email, disclaimer_version, disclaimer_effective, created_at])
                assert.notEqual(v, null, 'NOT NULL column got null');
              if (rows.some(r => r.phone === phone && r.disclaimer_version === disclaimer_version && r.accepted_at_utc === accepted_at_utc)) return;
              rows.push({ id: rows.length + 1, accepted_at_utc, owner_names, property_address, city_zip, state, phone, email,
                disclaimer_version, disclaimer_effective, phone_verified_at, created_at });
            },
            async first() {
              const emailOnly = /phone = ''/.test(sql);
              const [p, v, at] = emailOnly ? ['', a[1], a[2]] : a;
              const r = rows.find(r => r.phone === p && r.disclaimer_version === v && r.accepted_at_utc === at && (!emailOnly || r.email === a[0]));
              return r ? { id: r.id } : null;
            },
          };
        },
      };
    },
  };
}
const fakeKv = () => { const m = new Map(); return { async get(k) { return m.get(k) ?? null; }, async put(k, v) { m.set(k, v); } }; };
const SECRET = 'test-secret';
const mkEnv = (extra = {}) => ({ RECEIPTS_DB: fakeDb(), OTP_KV: fakeKv(), RECEIPT_TOKEN_SECRET: SECRET, ...extra });
const base = () => ({ names: ['Pat Seller'], addr: '1 Main St', cityZip: 'Fort Mill 29715', state: 'SC',
  version: '1.3', effective: '2026-10-15', acceptedAt: new Date(Date.now() - 1000).toISOString() });
const post = async (env, body, ip = '1.1.1.1') => {
  const r = await onRequestPost({ env, request: new Request('https://x/api/receipt', { method: 'POST', headers: { 'cf-connecting-ip': ip }, body: JSON.stringify(body) }) });
  return { status: r.status, body: await r.json() };
};

test('neither phone nor email: 400 invalid phone_or_email', async () => {
  const r = await post(mkEnv(), base());
  assert.equal(r.status, 400); assert.equal(r.body.error, 'invalid'); assert.deepEqual(r.body.fields, ['phone_or_email']);
  const r2 = await post(mkEnv(), { ...base(), phone: '  ', email: '' });
  assert.deepEqual(r2.body.fields, ['phone_or_email']);
});

test('address, city/ZIP, state, names, version still required', async () => {
  const r = await post(mkEnv(), { ...base(), email: 'a@b.co', addr: '', cityZip: '', state: 'GA', names: [] });
  assert.equal(r.status, 400);
  assert.deepEqual(r.body.fields.sort(), ['city_zip', 'owner_names', 'property_address', 'state']);
});

test('a phone or email that is sent but invalid is rejected, not ignored', async () => {
  assert.deepEqual((await post(mkEnv(), { ...base(), phone: '123', email: 'a@b.co' })).body.fields, ['phone']);
  assert.deepEqual((await post(mkEnv(), { ...base(), email: 'not-an-email' })).body.fields, ['email']);
});

test('email only: no token needed, phone stored as empty, phone_verified_at NULL', async () => {
  const env = mkEnv();
  const r = await post(env, { ...base(), email: 'pat@example.com' });
  assert.equal(r.status, 200); assert.equal(r.body.ok, true);
  const row = env.RECEIPTS_DB.rows[0];
  assert.equal(row.phone, ''); assert.equal(row.email, 'pat@example.com'); assert.equal(row.phone_verified_at, null);
});

test('email only: same retry is idempotent; different email at the same instant gets 409 retry', async () => {
  const env = mkEnv(), b = { ...base(), email: 'pat@example.com' };
  const a1 = await post(env, b), a2 = await post(env, b);
  assert.equal(a1.body.id, a2.body.id); assert.equal(env.RECEIPTS_DB.rows.length, 1);
  const other = await post(env, { ...b, email: 'sam@example.com' });
  assert.equal(other.status, 409); assert.equal(other.body.error, 'retry');
});

test('phone only: token required; stored with phone_verified_at and email empty', async () => {
  const env = mkEnv();
  assert.equal((await post(env, { ...base(), phone: '(704) 555-0199' })).body.error, 'no_token');
  assert.equal((await post(env, { ...base(), phone: '7045550199', token: await signToken(SECRET, '+17045550111') })).body.error, 'bad_token');
  const r = await post(env, { ...base(), phone: '7045550199', token: await signToken(SECRET, '+17045550199') });
  assert.equal(r.status, 200);
  const row = env.RECEIPTS_DB.rows[0];
  assert.equal(row.phone, '+17045550199'); assert.equal(row.email, ''); assert.ok(row.phone_verified_at);
});

test('phone and email: phone path (token required), both stored', async () => {
  const env = mkEnv();
  assert.equal((await post(env, { ...base(), phone: '7045550199', email: 'pat@example.com' })).status, 401);
  const r = await post(env, { ...base(), phone: '7045550199', email: 'pat@example.com', token: await signToken(SECRET, '+17045550199') });
  assert.equal(r.status, 200);
  const row = env.RECEIPTS_DB.rows[0];
  assert.equal(row.phone, '+17045550199'); assert.equal(row.email, 'pat@example.com'); assert.ok(row.phone_verified_at);
});

test('RECEIPT_ALLOW_UNVERIFIED=true: phone without token is stored with phone_verified_at NULL', async () => {
  const env = mkEnv({ RECEIPT_ALLOW_UNVERIFIED: 'true' });
  assert.equal((await post(env, { ...base(), phone: '7045550199' })).status, 200);
  assert.equal(env.RECEIPTS_DB.rows[0].phone_verified_at, null);
});

test('IP limit still applies (10 per hour), including email-only', async () => {
  const env = mkEnv(), T = Date.now() - 60e3;
  for (let i = 0; i < 10; i++) assert.equal((await post(env, { ...base(), email: `p${i}@example.com`, acceptedAt: new Date(T - i * 1000).toISOString() })).status, 200);
  assert.equal((await post(env, { ...base(), email: 'p10@example.com' })).status, 429);
});

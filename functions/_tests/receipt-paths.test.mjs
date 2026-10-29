// Unit tests for /api/receipt phone vs email-only paths, with in-memory D1 and KV fakes. No network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../api/receipt.js';
import { signToken } from '../api/otp/_lib.js';

const SECRET = 'test-secret-0123456789abcdef';
function env() {
  const kv = new Map(), rows = [];
  const OTP_KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v) }, delete: async k => { kv.delete(k) } };
  const RECEIPTS_DB = { prepare(sql) { return { bind(...a) { return {
    run: async () => { if (/^\s*INSERT/.test(sql)) { const [acc, , , , , phone, email, ver, , pva] = a;
      if (!rows.some(r => r.phone === phone && r.ver === ver && r.acc === acc)) rows.push({ id: rows.length + 1, acc, phone, email, ver, pva }); } },
    first: async () => { if (/phone = ''/.test(sql)) { const [email, ver, acc] = a; return rows.find(r => r.phone === '' && r.email === email && r.ver === ver && r.acc === acc) || null; }
      const [phone, ver, acc] = a; return rows.find(r => r.phone === phone && r.ver === ver && r.acc === acc) || null; } } } } } };
  return { OTP_KV, RECEIPTS_DB, RECEIPT_TOKEN_SECRET: SECRET, rows };
}
const base = () => ({ names: ['Pat Seller'], addr: '123 Main St', cityZip: 'Fort Mill 29715', state: 'SC', version: '1.1', effective: '2026-10-15', acceptedAt: new Date().toISOString() });
const post = (e, body) => onRequestPost({ env: e, request: new Request('https://x/api/receipt', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '1.2.3.4' }, body: JSON.stringify(body) }) });

test('rejects 400 when neither phone nor email', async () => {
  const r = await post(env(), { ...base(), phone: '', email: '' });
  assert.equal(r.status, 400);
});
test('email-only: no token needed, phone stored empty, not verified', async () => {
  const e = env(); const r = await post(e, { ...base(), phone: '', email: 'pat@example.com' });
  assert.equal(r.status, 200); const j = await r.json(); assert.equal(j.ok, true); assert.ok(j.id);
  assert.equal(e.rows[0].phone, ''); assert.equal(e.rows[0].email, 'pat@example.com'); assert.equal(e.rows[0].pva, null);
});
test('email-only: invalid email is 400', async () => {
  const r = await post(env(), { ...base(), email: 'nope' });
  assert.equal(r.status, 400);
});
test('phone path: no token is 401 no_token, bad token is 401 bad_token', async () => {
  let r = await post(env(), { ...base(), phone: '704-555-0123', email: '' });
  assert.equal(r.status, 401); assert.equal((await r.json()).error, 'no_token');
  r = await post(env(), { ...base(), phone: '704-555-0123', email: 'pat@example.com', token: 'x.y' });
  assert.equal(r.status, 401); assert.equal((await r.json()).error, 'bad_token');
});
test('phone path: valid token, email optional', async () => {
  const e = env(); const token = await signToken(SECRET, '+17045550123');
  const r = await post(e, { ...base(), phone: '(704) 555-0123', email: '', token });
  assert.equal(r.status, 200); assert.equal((await r.json()).ok, true);
  assert.equal(e.rows[0].phone, '+17045550123'); assert.equal(e.rows[0].email, ''); assert.ok(e.rows[0].pva);
});
test('phone path: invalid phone is 400 even with email', async () => {
  const r = await post(env(), { ...base(), phone: '12345', email: 'pat@example.com' });
  assert.equal(r.status, 400);
});

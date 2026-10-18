// Unit tests for the receipt token and the Cloudflare Access check. No network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { signToken, verifyToken } from '../api/otp/_lib.js';
import { accessOk } from '../api/receipts/_lib.js';

test('receipt token: valid for its phone only, until it expires', async () => {
  const t = await signToken('s3', '+15555550100', 1_800_000_000_000);
  assert.ok(await verifyToken('s3', t, '+15555550100', 1_800_000_000_000));
  assert.equal(await verifyToken('s3', t, '+15555550101', 1_800_000_000_000), null);
  assert.equal(await verifyToken('other', t, '+15555550100', 1_800_000_000_000), null);
  assert.equal(await verifyToken('s3', t, '+15555550100', 1_800_000_000_000 + 1801e3), null);
  assert.equal(await verifyToken('', t, '+15555550100', 1_800_000_000_000), null);
});

const b64u = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
async function setup() {
  const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
  globalThis.fetch = async url => { assert.equal(String(url), 'https://team.cloudflareaccess.com/cdn-cgi/access/certs'); return new Response(JSON.stringify({ keys: [jwk] })); };
  const sign = async (claims) => {
    const h = b64u({ alg: 'RS256', kid: 'k1' }), p = b64u(claims);
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p));
    return h + '.' + p + '.' + Buffer.from(sig).toString('base64url');
  };
  return sign;
}
const req = jwt => new Request('https://x/owner/receipts', { headers: jwt ? { 'cf-access-jwt-assertion': jwt } : {} });
const env = { ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com', ACCESS_AUD: 'aud1' };

test('Access: valid JWT passes; wrong aud, issuer, expiry, or missing config fail closed', async () => {
  const sign = await setup(), now = Math.floor(Date.now() / 1000);
  const good = { aud: ['aud1'], iss: 'https://team.cloudflareaccess.com', exp: now + 600, email: 'owner@example.com' };
  assert.equal(await accessOk(req(await sign(good)), env), true);
  assert.equal(await accessOk(req(await sign({ ...good, aud: ['other'] })), env), false);
  assert.equal(await accessOk(req(await sign({ ...good, iss: 'https://evil.cloudflareaccess.com' })), env), false);
  assert.equal(await accessOk(req(await sign({ ...good, exp: now - 1 })), env), false);
  assert.equal(await accessOk(req(await sign(good)), {}), false);
  assert.equal(await accessOk(req(''), env), false);
  const t = await sign(good); assert.equal(await accessOk(req(t.slice(0, -4) + 'AAAA'), env), false);
});

test('receipt phone is stored as +1XXXXXXXXXX for every common format', async () => {
  const { usPhone } = await import('../api/otp/_lib.js');
  for (const p of ['7046496781', '17046496781', '(704) 649-6781', '+1 704-649-6781']) assert.equal(usPhone(p), '+17046496781');
});

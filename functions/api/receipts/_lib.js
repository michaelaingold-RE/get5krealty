// © 2026 Ingold Group Properties, LLC dba 5K Realty. All rights reserved.
// Owner-only access for receipts. Cloudflare Access sits in front of /owner/* and /api/receipts/* and adds a signed
// Cf-Access-Jwt-Assertion header for a signed-in person or a valid service token. We verify that JWT here too.
// Fails closed: without ACCESS_TEAM_DOMAIN (e.g. 5krealty.cloudflareaccess.com) and ACCESS_AUD, every request gets 403.
// /api/receipts/summary is its own Access app (Michael + the Lookout service token) and passes its own AUD (ACCESS_AUD_SUMMARY).
export const COLS = ['id', 'accepted_at_utc', 'owner_names', 'property_address', 'city_zip', 'state', 'phone', 'email',
  'disclaimer_version', 'disclaimer_effective', 'phone_verified_at', 'created_at', 'is_test'];
// is_test (migration 0002): 1 = the owner's own test (OWNER_TEST_PHONES), 0 = a real seller. Kept last so id stays column 1.

const dec = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
let certs = { at: 0, keys: [] };

export async function accessOk(request, env, now = Date.now(), aud = env.ACCESS_AUD) {
  const team = env.ACCESS_TEAM_DOMAIN;
  const jwt = request.headers.get('cf-access-jwt-assertion') || '';
  const parts = jwt.split('.');
  if (!team || !aud || parts.length !== 3) return false;
  try {
    const head = JSON.parse(new TextDecoder().decode(dec(parts[0])));
    const body = JSON.parse(new TextDecoder().decode(dec(parts[1])));
    if (head.alg !== 'RS256') return false;
    if (now - certs.at > 3600e3 || !certs.keys.some(k => k.kid === head.kid)) {
      const r = await fetch(`https://${team}/cdn-cgi/access/certs`);
      certs = { at: now, keys: (await r.json()).keys || [] };
    }
    const jwk = certs.keys.find(k => k.kid === head.kid);
    if (!jwk) return false;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, dec(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
    const auds = [].concat(body.aud || []);
    const t = now / 1000;
    return ok && auds.includes(aud) && body.iss === `https://${team}` && body.exp > t && (!body.nbf || body.nbf <= t + 60);
  } catch (_) { return false; }
}

export const denied = () => new Response('Forbidden', { status: 403, headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' } });

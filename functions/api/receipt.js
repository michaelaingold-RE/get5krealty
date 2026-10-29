// © 2026 Ingold Group Properties, LLC dba 5K Realty. All rights reserved.
// POST /api/receipt  { token, phone, names[], addr, cityZip, state, email, version, effective, acceptedAt }  ->  { ok: true, id }
// Stores one disclaimer receipt in D1 (RECEIPTS_DB): 5K Realty's record copy. No email or text is sent, and 5K Realty
// does not contact the seller from this record; 5K only reaches out if the seller asks (Talk to 5K Realty form).
// The seller needs a name and either a phone or an email (or both):
//  - Phone path (a phone was given): a valid receipt token from /api/otp/check for that phone is required, unless
//    RECEIPT_ALLOW_UNVERIFIED is "true" (only for when phone checks are turned off; phone_verified_at stays NULL).
//    Email is optional and stored as '' when absent.
//  - Email-only path (no phone): a valid email is required, no token, phone stored as '', phone_verified_at NULL.
// Unused contact fields are stored as '' so the NOT NULL columns hold (see _migrations/0002_contact_optional.md).
// The same contact, disclaimer version and acceptance time never creates a second row.
import { json, usPhone, verifyToken, bump, peek, clientIp, readJson } from './otp/_lib.js';

const IP_HOUR = 10; // receipts per IP per hour
const str = (v, max) => { const s = String(v ?? '').trim(); return s && s.length <= max ? s : null; };

export async function onRequestPost({ request, env }) {
  if (!env.RECEIPTS_DB || !env.OTP_KV) return json({ ok: false, error: 'not_configured' }, 503);
  const b = await readJson(request);
  if (!b) return json({ ok: false, error: 'bad_request' }, 400);

  const rawPhone = String(b.phone ?? '').trim(), rawEmail = String(b.email ?? '').trim();
  const phonePath = !!rawPhone;
  if (!rawPhone && !rawEmail) return json({ ok: false, error: 'invalid', fields: ['phone_or_email'] }, 400);
  const phone = phonePath ? usPhone(rawPhone) : '';
  const email = rawEmail ? (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? str(rawEmail, 254) : null) : '';
  const names = Array.isArray(b.names) ? b.names.map(n => str(n, 120)) : [];
  const accepted = str(b.acceptedAt, 30);
  const t = accepted ? Date.parse(accepted) : NaN;
  const row = {
    accepted_at_utc: Number.isFinite(t) && t <= Date.now() + 600e3 && t >= Date.now() - 90 * 864e5 ? new Date(t).toISOString() : null,
    owner_names: names.length >= 1 && names.length <= 10 && names.every(Boolean) ? JSON.stringify(names) : null,
    property_address: str(b.addr, 200),
    city_zip: str(b.cityZip, 120),
    state: ['NC', 'SC'].includes(b.state) ? b.state : null,
    phone,
    email,
    disclaimer_version: str(b.version, 20),
    disclaimer_effective: str(b.effective, 20),
  };
  // phone and email may be '' (the unused contact path); null means given but invalid.
  const missing = Object.keys(row).filter(k => (k === 'phone' || k === 'email') ? row[k] === null : !row[k]);
  if (missing.length) return json({ ok: false, error: 'invalid', fields: missing }, 400);

  const ip = clientIp(request);
  if ((await peek(env.OTP_KV, `rcpt:${ip}`)) >= IP_HOUR) return json({ ok: false, error: 'rate_ip' }, 429);
  await bump(env.OTP_KV, `rcpt:${ip}`, 3600);

  let verifiedAt = null;
  if (phonePath) {
    verifiedAt = await verifyToken(env.RECEIPT_TOKEN_SECRET, b.token, phone);
    if (!verifiedAt && env.RECEIPT_ALLOW_UNVERIFIED !== 'true') return json({ ok: false, error: b.token ? 'bad_token' : 'no_token' }, 401);
  }

  const db = env.RECEIPTS_DB;
  await db.prepare(`INSERT INTO receipts (accepted_at_utc, owner_names, property_address, city_zip, state, phone, email,
      disclaimer_version, disclaimer_effective, phone_verified_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT (phone, disclaimer_version, accepted_at_utc) DO NOTHING`)
    .bind(row.accepted_at_utc, row.owner_names, row.property_address, row.city_zip, row.state, row.phone, row.email,
      row.disclaimer_version, row.disclaimer_effective, verifiedAt, new Date().toISOString()).run();
  const got = phonePath
    ? await db.prepare('SELECT id FROM receipts WHERE phone = ? AND disclaimer_version = ? AND accepted_at_utc = ?')
      .bind(row.phone, row.disclaimer_version, row.accepted_at_utc).first()
    : await db.prepare("SELECT id FROM receipts WHERE phone = '' AND email = ? AND disclaimer_version = ? AND accepted_at_utc = ?")
      .bind(row.email, row.disclaimer_version, row.accepted_at_utc).first();
  if (!got) return json({ ok: false, error: 'conflict' }, 409);
  return json({ ok: true, id: got.id });
}

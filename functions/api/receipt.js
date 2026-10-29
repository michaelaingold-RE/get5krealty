// © 2026 Ingold Group Properties, LLC dba 5K Realty. All rights reserved.
// POST /api/receipt  { token, phone, names[], addr, cityZip, state, email, version, effective, acceptedAt }  ->  { ok: true, id }
// Stores one disclaimer receipt in D1 (RECEIPTS_DB). No email is sent.
// Contact: at least one of a valid US phone or a valid email is required. A field that is sent but not valid is rejected.
// Phone path (phone sent, with or without email): a valid receipt token from /api/otp/check for that phone is required,
// unless RECEIPT_ALLOW_UNVERIFIED is "true" (only for when phone checks are turned off); those rows have phone_verified_at NULL.
// Email-only path (no phone): no token; phone is stored as '' and phone_verified_at is NULL.
// A missing phone or email is stored as '' (both columns are NOT NULL in 0001_receipts.sql).
// The same phone, disclaimer version and acceptance time never creates a second row. Email-only rows share phone '',
// so the read-back also matches email; a different seller with the exact same acceptedAt gets 409 retry.
import { json, usPhone, verifyToken, bump, peek, clientIp, readJson } from './otp/_lib.js';

const IP_HOUR = 10; // receipts per IP per hour
const str = (v, max) => { const s = String(v ?? '').trim(); return s && s.length <= max ? s : null; };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost({ request, env }) {
  if (!env.RECEIPTS_DB || !env.OTP_KV) return json({ ok: false, error: 'not_configured' }, 503);
  const b = await readJson(request);
  if (!b) return json({ ok: false, error: 'bad_request' }, 400);

  const names = Array.isArray(b.names) ? b.names.map(n => str(n, 120)) : [];
  const accepted = str(b.acceptedAt, 30);
  const t = accepted ? Date.parse(accepted) : NaN;
  const row = {
    accepted_at_utc: Number.isFinite(t) && t <= Date.now() + 600e3 && t >= Date.now() - 90 * 864e5 ? new Date(t).toISOString() : null,
    owner_names: names.length >= 1 && names.length <= 10 && names.every(Boolean) ? JSON.stringify(names) : null,
    property_address: str(b.addr, 200),
    city_zip: str(b.cityZip, 120),
    state: ['NC', 'SC'].includes(b.state) ? b.state : null,
    disclaimer_version: str(b.version, 20),
    disclaimer_effective: str(b.effective, 20),
  };
  const missing = Object.keys(row).filter(k => !row[k]);

  const phoneSent = String(b.phone ?? '').trim() !== '';
  const emailRaw = String(b.email ?? '').trim();
  const phone = phoneSent ? usPhone(b.phone) : null;
  const email = emailRaw && EMAIL.test(emailRaw) ? str(emailRaw, 254) : null;
  if (phoneSent && !phone) missing.push('phone');
  if (emailRaw && !email) missing.push('email');
  if (!phoneSent && !emailRaw) missing.push('phone_or_email');
  if (missing.length) return json({ ok: false, error: 'invalid', fields: missing }, 400);

  const ip = clientIp(request);
  if ((await peek(env.OTP_KV, `rcpt:${ip}`)) >= IP_HOUR) return json({ ok: false, error: 'rate_ip' }, 429);
  await bump(env.OTP_KV, `rcpt:${ip}`, 3600);

  let verifiedAt = null;
  if (phone) {
    verifiedAt = await verifyToken(env.RECEIPT_TOKEN_SECRET, b.token, phone);
    if (!verifiedAt && env.RECEIPT_ALLOW_UNVERIFIED !== 'true') return json({ ok: false, error: b.token ? 'bad_token' : 'no_token' }, 401);
  }
  row.phone = phone || '';
  row.email = email || '';

  const db = env.RECEIPTS_DB;
  await db.prepare(`INSERT INTO receipts (accepted_at_utc, owner_names, property_address, city_zip, state, phone, email,
      disclaimer_version, disclaimer_effective, phone_verified_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT (phone, disclaimer_version, accepted_at_utc) DO NOTHING`)
    .bind(row.accepted_at_utc, row.owner_names, row.property_address, row.city_zip, row.state, row.phone, row.email,
      row.disclaimer_version, row.disclaimer_effective, verifiedAt, new Date().toISOString()).run();
  const got = phone
    ? await db.prepare('SELECT id FROM receipts WHERE phone = ? AND disclaimer_version = ? AND accepted_at_utc = ?')
      .bind(row.phone, row.disclaimer_version, row.accepted_at_utc).first()
    : await db.prepare("SELECT id FROM receipts WHERE phone = '' AND email = ? AND disclaimer_version = ? AND accepted_at_utc = ?")
      .bind(row.email, row.disclaimer_version, row.accepted_at_utc).first();
  if (!got) return json({ ok: false, error: 'retry' }, 409);
  return json({ ok: true, id: got.id });
}

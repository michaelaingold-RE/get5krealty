// © 2026 Ingold Group Properties, LLC dba 5K Realty. All rights reserved.
// GET /api/receipts/summary  ->  counts only, for sign-up alerts (Lookout). No names, phones, emails or addresses.
// Its own Cloudflare Access app (Michael only + the "lookout-receipts-summary" service token); that token cannot reach
// export.csv. Verifies the summary app's AUD (ACCESS_AUD_SUMMARY), never ACCESS_AUD. Fails closed: missing var -> 403.
import { accessOk, denied } from './_lib.js';
import { json } from '../otp/_lib.js';

export async function onRequestGet({ request, env }) {
  if (!env.ACCESS_AUD_SUMMARY || !(await accessOk(request, env, Date.now(), env.ACCESS_AUD_SUMMARY))) return denied();
  if (!env.RECEIPTS_DB) return new Response('Not configured', { status: 503, headers: { 'cache-control': 'no-store' } });
  const now = Date.now(), iso = ms => new Date(ms).toISOString();
  const r = await env.RECEIPTS_DB.prepare(`SELECT
      (SELECT COUNT(*) FROM receipts) AS total,
      (SELECT COUNT(*) FROM receipts WHERE created_at >= ?1) AS last_24h,
      (SELECT COUNT(*) FROM receipts WHERE created_at >= ?2) AS last_7d,
      (SELECT id FROM receipts ORDER BY id DESC LIMIT 1) AS newest_id,
      (SELECT accepted_at_utc FROM receipts ORDER BY id DESC LIMIT 1) AS newest_accepted_at_utc`)
    .bind(iso(now - 864e5), iso(now - 7 * 864e5)).first();
  const n = v => Number(v) || 0;
  const body = { ok: true, generated_at_utc: iso(now), total: n(r && r.total), last_24h: n(r && r.last_24h), last_7d: n(r && r.last_7d),
    newest_accepted_at_utc: (r && r.newest_accepted_at_utc) || null, newest_id: r && r.newest_id != null ? n(r.newest_id) : null };
  return json(body); // json() sets cache-control: no-store
}

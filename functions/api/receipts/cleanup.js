// © 2026 Ingold Group Properties, LLC dba 5K Realty. All rights reserved.
// POST /api/receipts/cleanup  ->  deletes receipts older than RECEIPT_RETENTION_DAYS (by created_at). Owner only (Cloudflare Access).
// OFF by default: does nothing unless RECEIPT_CLEANUP_ENABLED is "true". Nothing calls it on a schedule.
import { accessOk, denied } from './_lib.js';
import { json } from '../otp/_lib.js';

export async function onRequestPost({ request, env }) {
  if (!(await accessOk(request, env))) return denied();
  const days = parseInt(env.RECEIPT_RETENTION_DAYS || '', 10);
  if (env.RECEIPT_CLEANUP_ENABLED !== 'true' || !(days > 0) || !env.RECEIPTS_DB) return json({ ok: true, enabled: false, deleted: 0 });
  const cutoff = new Date(Date.now() - days * 864e5).toISOString();
  const r = await env.RECEIPTS_DB.prepare('DELETE FROM receipts WHERE created_at < ?').bind(cutoff).run();
  return json({ ok: true, enabled: true, cutoff, deleted: r.meta.changes || 0 });
}

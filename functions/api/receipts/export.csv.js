// © 2026 Ingold Group Properties, LLC dba 5K Realty. All rights reserved.
// GET /api/receipts/export.csv  ->  every receipt as CSV, newest first. Owner only (Cloudflare Access).
import { accessOk, denied, COLS } from './_lib.js';

// Quote per RFC 4180. Text starting with = @ tab, or + - not followed by only digits, gets a ' so spreadsheets don't run it as a formula.
const cell = v => { let s = v == null ? '' : String(v); if (/^[=@\t]|^[+-](?!\d+$)/.test(s)) s = "'" + s; return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

export async function onRequestGet({ request, env }) {
  if (!(await accessOk(request, env))) return denied();
  if (!env.RECEIPTS_DB) return new Response('Not configured', { status: 503 });
  const { results } = await env.RECEIPTS_DB.prepare(`SELECT ${COLS.join(',')} FROM receipts ORDER BY id DESC`).all();
  const csv = [COLS.join(','), ...results.map(r => COLS.map(c => cell(r[c])).join(','))].join('\r\n') + '\r\n';
  return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="shingle-receipts-${new Date().toISOString().slice(0, 10)}.csv"`, 'cache-control': 'no-store' } });
}

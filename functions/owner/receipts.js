// © 2026 Ingold Group Properties, LLC dba 5K Realty. All rights reserved.
// GET /owner/receipts  ->  simple table of disclaimer receipts, newest first. Owner only (Cloudflare Access).
import { accessOk, denied, COLS } from '../api/receipts/_lib.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function onRequestGet({ request, env }) {
  if (!(await accessOk(request, env))) return denied();
  if (!env.RECEIPTS_DB) return new Response('Not configured', { status: 503 });
  const { results } = await env.RECEIPTS_DB.prepare(`SELECT ${COLS.join(',')} FROM receipts ORDER BY id DESC LIMIT 1000`).all();
  // Owner test rows (is_test = 1) get a TEST label in the first column and a shaded row.
  const head = '<th>test</th>' + COLS.filter(c => c !== 'is_test').map(c => `<th>${esc(c)}</th>`).join('');
  const rows = results.map(r => `<tr${r.is_test ? ' class="test"' : ''}><td>${r.is_test ? '<b>TEST</b>' : ''}</td>${COLS.filter(c => c !== 'is_test').map(c => `<td>${esc(c === 'owner_names' ? JSON.parse(r[c] || '[]').join(', ') : r[c])}</td>`).join('')}</tr>`).join('');
  const tests = results.filter(r => r.is_test).length;
  const html = `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Shingle receipts</title>
<style>body{font:14px system-ui,sans-serif;margin:16px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 6px;text-align:left;vertical-align:top}th{background:#f3f3f3}tr.test td{background:#fff6d6;color:#555}</style>
<h1>Shingle disclaimer receipts</h1><p>${results.length} shown, newest first (up to 1000)${tests ? `, ${tests} marked TEST (your own test sign-ups, not leads)` : ''}. <a href="/api/receipts/export.csv">Download all as CSV</a></p>
<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'" } });
}

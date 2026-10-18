// © 2026 Ingold Group Properties, LLC dba 5K Realty. All rights reserved.
// Shingle runtime config. Phone verification stays OFF until the Twilio and Turnstile secrets exist in Cloudflare Pages.
// To turn it on: set otpGate to true and paste the public Turnstile site key below (see /workspace/fsbo-toolkit/otp-setup.md).
window.SHINGLE_CFG = { otpGate: true, turnstileSiteKey: '0x4AAAAAAFXpvbCpe-81k5K6' };

// Every phone that leaves the device uses one format, +1XXXXXXXXXX. Anything that isn't a 10 digit US number is sent as typed.
// Same rule as usPhone() in functions/api/otp/_lib.js and shinglePhone in /shingle/landing.js.
window.shinglePhone = function(raw){ const t = String(raw || '').trim(); let d = t.replace(/\D/g, ''); if (d.length === 11 && d[0] === '1') d = d.slice(1); return /^[2-9]\d{2}[2-9]\d{6}$/.test(d) ? '+1' + d : t; };

// Save a file to the device.
// Automatic: iPhone, iPad, and Android phones and tablets get the share sheet (Save to Files, Drive, Mail, Print).
// Computers (Windows, Mac, Linux, Chromebook) get a normal download to the Downloads folder.
// The seller can override this in Settings > Saving files, which is the backup if detection guesses wrong.
window.shingleDevice = function(){
  const ua = navigator.userAgent || '', tp = navigator.maxTouchPoints || 0;
  if (/iPhone|iPod/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && tp > 1)) return 'iPad';
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android phone' : 'Android tablet';
  if (/Windows/.test(ua)) return 'Windows computer';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/CrOS/.test(ua)) return 'Chromebook';
  return tp > 1 && /Mobile|Tablet/.test(ua) ? 'phone or tablet' : 'computer';
};
window.shingleSaveMode = function(m){ try { if (m) localStorage.setItem('shingle-save-mode', m); return localStorage.getItem('shingle-save-mode') || 'auto'; } catch (e) { return 'auto'; } };
window.shingleSave = async function(blob, name, type, forceMode){
  const mime = type || blob.type || 'application/octet-stream';
  const b = blob.type === mime ? blob : new Blob([blob], {type: mime});
  const mode = forceMode || shingleSaveMode(), dev = shingleDevice();
  const wantShare = mode === 'share' || (mode === 'auto' && /iPhone|iPad|Android|phone or tablet/.test(dev));
  if (wantShare && window.File && navigator.canShare && navigator.share) {
    try {
      const f = new File([b], name, {type: mime, lastModified: Date.now()});
      if (navigator.canShare({files: [f]})) { await navigator.share({files: [f]}); return 'shared'; }
    } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  }
  const u = URL.createObjectURL(b);
  const a = document.createElement('a'); a.href = u; a.download = name; a.rel = 'noopener'; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(u); }, 60000);
  return 'downloaded';
};
window.shingleSaveToast = function(r, what){
  if (r === 'cancelled' || typeof toast !== 'function') return;
  toast(r === 'shared' ? what + ' ready. Tap Save to Files to keep it.' : what + ' saved to your Downloads folder');
};
window.shingleBlobFromDataURL = function(d){ const [h, b64] = d.split(','); const m = h.match(/:(.*?);/)[1]; const bin = atob(b64); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], {type: m}); };
window.shingleSaveCard = function(){
  const m = shingleSaveMode(), o = (v, t) => `<option value="${v}"${m === v ? ' selected' : ''}>${t}</option>`;
  return `<div class="card" id="save-mode"><h3>Saving files</h3><p class="muted">Shingle thinks this is ${/^[aeiouAEIOU]|^i[A-Z]/.test(shingleDevice())?'an':'a'} <b>${shingleDevice()}</b>. If backups, signs, or PDFs aren't saving, pick your device type here.</p>
<label for="sv-mode">Save files using</label><select id="sv-mode">${o('auto', 'Automatic (recommended)')}${o('share', 'Apple: iPhone or iPad (share sheet, then Save to Files)')}${o('download', 'Android, Windows, or a computer (straight to Downloads)')}</select></div>`;
};

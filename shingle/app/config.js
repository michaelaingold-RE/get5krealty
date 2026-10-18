// © 2026 Ingold Group Properties, LLC dba 5K Realty. All rights reserved.
// Shingle runtime config. Phone verification stays OFF until the Twilio and Turnstile secrets exist in Cloudflare Pages.
// To turn it on: set otpGate to true and paste the public Turnstile site key below (see /workspace/fsbo-toolkit/otp-setup.md).
window.SHINGLE_CFG = { otpGate: true, turnstileSiteKey: '0x4AAAAAAFXpvbCpe-81k5K6' };

// Save a file to the device. On phones (iPhone, Android) this opens the share sheet so the seller can pick
// Save to Files, Drive, Mail, or Print. Elsewhere it downloads the file with the right name and type.
window.shingleSave = async function(blob, name, type){
  const mime = type || blob.type || 'application/octet-stream';
  const b = blob.type === mime ? blob : new Blob([blob], {type: mime});
  const touch = (navigator.maxTouchPoints || 0) > 0 && /iPhone|iPad|iPod|Android|Macintosh/.test(navigator.userAgent);
  try {
    if (touch && window.File && navigator.canShare) {
      const f = new File([b], name, {type: mime});
      if (navigator.canShare({files: [f]})) { await navigator.share({files: [f], title: name}); return 'shared'; }
    }
  } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  const u = URL.createObjectURL(b);
  const a = document.createElement('a'); a.href = u; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 60000);
  return 'downloaded';
};
window.shingleSaveToast = function(r, what){ if (r === 'cancelled') return; if (typeof toast === 'function') toast(r === 'shared' ? what + ' ready. Pick Save to Files to keep it.' : what + ' downloaded'); };

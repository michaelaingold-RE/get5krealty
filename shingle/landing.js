// © 2026 Ingold Group Properties, LLC dba 5K Realty. All rights reserved.
(function(){var f=document.getElementById('lead-form');if(!f||!window.fetch)return;
// Phone goes out as +1XXXXXXXXXX (same rule as window.shinglePhone in /shingle/app/config.js); anything else as typed.
var shinglePhone=function(raw){var t=String(raw||'').trim(),d=t.replace(/\D/g,'');if(d.length===11&&d[0]==='1')d=d.slice(1);return /^[2-9]\d{2}[2-9]\d{6}$/.test(d)?'+1'+d:t};
// Owner test mode: SHA-256 (hex) of each owner phone (+1XXXXXXXXXX). Same list as SHINGLE_OWNER_SHA in /shingle/app/config.js
// and OWNER_TEST_PHONES in Cloudflare Pages. An owner phone sends the subject as 'TEST - [Shingle Lead] ...' plus test=yes.
var SHINGLE_OWNER_SHA=['5053b13ebf025792d97f4ad87e5791ca0f1ec57da00393eaccda492fd3a0a0e3'];
var ownerTest=function(p){try{return crypto.subtle.digest('SHA-256',new TextEncoder().encode(p)).then(function(b){return SHINGLE_OWNER_SHA.indexOf(Array.prototype.map.call(new Uint8Array(b),function(x){return('0'+x.toString(16)).slice(-2)}).join(''))>=0},function(){return false})}catch(x){return Promise.resolve(false)}};
f.addEventListener('submit',function(e){e.preventDefault();var st=document.getElementById('lf-status'),b=document.getElementById('lf-send');
 if(!f.checkValidity()){f.reportValidity();return}
 f.needs.value=Array.prototype.map.call(f.querySelectorAll('.lf-need:checked'),function(x){return x.value}).join(', ');
 b.disabled=true;b.textContent='Sending...';st.innerHTML='';
 var ph=shinglePhone(f.phone.value);
 ownerTest(ph).then(function(test){
 f._replyto.value=f.email.value.trim();f._subject.value=(test?'TEST - ':'')+'[Shingle Lead] '+f.name.value.trim()+' - '+f.city_zip.value.trim();if(f.subject)f.subject.value=f._subject.value;
 var fd=new FormData(f);fd.set('phone',ph);if(test)fd.set('test','yes');
 return fetch(f.action,{method:'POST',body:fd,headers:{Accept:'application/json'}}).then(function(r){if(!r.ok)throw r.status;
  Array.prototype.forEach.call(f.querySelectorAll('input,select,textarea,button'),function(x){x.disabled=true});b.textContent='Sent';
  st.innerHTML='<p class="ok">Thanks for reaching out. Michael Ingold with 5K Realty will call you shortly. If it\'s urgent, call <a href="tel:7046496781">704.649.6781</a>.</p>'})
 .catch(function(){b.disabled=false;b.textContent='Send to 5K Realty';st.innerHTML='<p class="err">That didn\'t go through. Please call <a href="tel:7046496781">704.649.6781</a> or email <a href="mailto:michael@get5krealty.com">michael@get5krealty.com</a>.</p>'})})});})();

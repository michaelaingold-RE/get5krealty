// © 2026 Ingold Group Properties, LLC dba 5K Realty. All rights reserved.
(function(){var f=document.getElementById('lead-form');if(!f||!window.fetch)return;
// Phone goes out as +1XXXXXXXXXX (same rule as window.shinglePhone in /shingle/app/config.js); anything else as typed.
var shinglePhone=function(raw){var t=String(raw||'').trim(),d=t.replace(/\D/g,'');if(d.length===11&&d[0]==='1')d=d.slice(1);return /^[2-9]\d{2}[2-9]\d{6}$/.test(d)?'+1'+d:t};
f.addEventListener('submit',function(e){e.preventDefault();var st=document.getElementById('lf-status'),b=document.getElementById('lf-send');
 if(!f.checkValidity()){f.reportValidity();return}
 f.needs.value=Array.prototype.map.call(f.querySelectorAll('.lf-need:checked'),function(x){return x.value}).join(', ');
 f._replyto.value=f.email.value.trim();f._subject.value='[Shingle Lead] '+f.name.value.trim()+' - '+f.city_zip.value.trim();if(f.subject)f.subject.value=f._subject.value;
 b.disabled=true;b.textContent='Sending...';st.innerHTML='';
 var fd=new FormData(f);fd.set('phone',shinglePhone(f.phone.value));
 fetch(f.action,{method:'POST',body:fd,headers:{Accept:'application/json'}}).then(function(r){if(!r.ok)throw r.status;
  Array.prototype.forEach.call(f.querySelectorAll('input,select,textarea,button'),function(x){x.disabled=true});b.textContent='Sent';
  st.innerHTML='<p class="ok">Thanks for reaching out. Michael Ingold with 5K Realty will call you shortly. If it\'s urgent, call <a href="tel:7046496781">704.649.6781</a>.</p>'})
 .catch(function(){b.disabled=false;b.textContent='Send to 5K Realty';st.innerHTML='<p class="err">That didn\'t go through. Please call <a href="tel:7046496781">704.649.6781</a> or email <a href="mailto:michael@get5krealty.com">michael@get5krealty.com</a>.</p>'})});})();

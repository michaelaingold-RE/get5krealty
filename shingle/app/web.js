// Web launch additions: Talk to 5K Realty form, backup export and import, backup reminder,
// install card, storage persistence, fair housing word check, QR default.
// The only network call in the app is the lead form, and only when the user taps Send.
const FORM_URL='https://formspree.io/f/mvkpgapo';
const NEEDS=['Pricing','An offer just came in','A buyer agent showed up','Paperwork','Just list it for me'];
let PREV_SCREEN='help';
addEventListener('hashchange',e=>{const o=(e.oldURL.split('#')[1]||'welcome');if(o!=='help')PREV_SCREEN=o});
function leadForm(source){return `<div class="card" id="lead"><h3>Talk to 5K Realty</h3><p class="muted">Send this and Michael Ingold will call you. Fields marked * are required.</p>
<form class="lead-form" id="lead-form" action="${FORM_URL}" method="POST" novalidate>
<input type="hidden" name="source" value="${source}"><input type="hidden" name="screen" value=""><input type="hidden" name="_subject" value=""><input type="hidden" name="subject" value=""><input type="hidden" name="_replyto" value=""><input type="hidden" name="needs" value="">
<div class="hp" aria-hidden="true"><label>Leave this empty<input type="text" name="_gotcha" tabindex="-1" autocomplete="off"></label></div>
<label for="lf-name">Name <span class="req">*</span></label><input id="lf-name" name="name" required autocomplete="name" value="${ea(S.seller)}">
<label for="lf-phone">Phone <span class="req">*</span></label><input id="lf-phone" name="phone" type="tel" required autocomplete="tel">
<label for="lf-email">Email <span class="req">*</span></label><input id="lf-email" name="email" type="email" required autocomplete="email">
<label for="lf-address">Property address</label><input id="lf-address" name="address" autocomplete="street-address" value="${ea(S.home.addr)}">
<label for="lf-cz">City or ZIP</label><input id="lf-cz" name="city_zip" value="${ea(S.zip)}">
<label for="lf-state">State</label><select id="lf-state" name="state"><option value="">Choose one</option><option${S.state==='NC'?' selected':''}>NC</option><option${S.state==='SC'?' selected':''}>SC</option></select>
<fieldset><legend>What I need help with</legend>${NEEDS.map((t,i)=>`<label class="check"><input type="checkbox" class="lf-need" id="lf-n${i}" value="${t}"> ${t}</label>`).join('')}</fieldset>
<label for="lf-time">Best time to reach you</label><input id="lf-time" name="best_time" placeholder="For example, weekday evenings">
<label for="lf-msg">Message</label><textarea id="lf-msg" name="message" rows="4"></textarea>
<!-- Consent placeholder: a call or text consent checkbox is intentionally NOT included yet (Chief of Staff, Oct 15, 2026). Add it here only after Michael approves the wording. -->
<p class="muted" style="margin-top:12px">When you tap Send, these details go to 5K Realty through Formspree, our form service. Nothing else in Shingle is sent. <a href="/shingle/privacy/">Privacy policy</a></p>
<button class="btn" type="submit" id="lf-send">Send to 5K Realty</button><div id="lf-status" role="status" aria-live="polite" style="margin-top:8px"></div>
</form></div>`}
function bindLeadForm(screen){const f=document.getElementById('lead-form');if(!f)return;
 f.onsubmit=async e=>{e.preventDefault();const st=document.getElementById('lf-status');
  if(!f.checkValidity()){f.reportValidity();return}
  f.needs.value=[...f.querySelectorAll('.lf-need:checked')].map(x=>x.value).join(', ');
  f.screen.value=screen;f._replyto.value=f.email.value.trim();
  f._subject.value='[Shingle Lead] '+f.name.value.trim()+' - '+f.city_zip.value.trim();if(f.subject)f.subject.value=f._subject.value;
  const b=document.getElementById('lf-send');b.disabled=true;b.textContent='Sending...';st.innerHTML='';
  try{const r=await fetch(FORM_URL,{method:'POST',body:new FormData(f),headers:{Accept:'application/json'}});if(!r.ok)throw new Error(r.status);
   f.querySelectorAll('input,select,textarea,button').forEach(x=>x.disabled=true);b.textContent='Sent';
   st.innerHTML='<p class="form-ok">Thanks for reaching out. Michael Ingold with 5K Realty will call you shortly. If it\'s urgent, call <a href="tel:7046496781">704.649.6781</a>.</p>'}
  catch(err){b.disabled=false;b.textContent='Send to 5K Realty';st.innerHTML='<p class="form-err">That didn\'t go through. Please call <a href="tel:7046496781">704.649.6781</a> or email <a href="mailto:michael@get5krealty.com">michael@get5krealty.com</a>.</p>'}}}
// ---------- Backup ----------
const daysSince=d=>d?(Date.now()-new Date(d).getTime())/864e5:Infinity;
function backupCard(){return `<div class="card" id="backup"><h3>Back up your data</h3><p class="muted">Shingle keeps everything on this device. Your browser can clear it, for example if you clear site data, switch phones, or on iPhone, don't open Shingle in Safari for a while. Save a backup file to your own Files or Drive.</p>
<p class="muted" id="bk-last">${S.lastBackup?'Last backup: '+new Date(S.lastBackup).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}):'No backup yet.'}</p>
<button class="btn" id="bk-export">Export backup</button><label class="btn ghost" for="bk-file" style="margin-top:8px">Import backup</label><input type="file" id="bk-file" accept="application/json,.json" class="hp"></div>`}
function exportBackup(){S.lastBackup=new Date().toISOString();save();const blob=new Blob([JSON.stringify({app:'shingle',key:KEY,exportedAt:S.lastBackup,data:S},null,2)],{type:'application/json'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='shingle-backup-'+S.lastBackup.slice(0,10)+'.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);toast('Backup saved');render()}
function importBackup(file){const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result);const d=j&&j.app==='shingle'?j.data:null;if(!d||typeof d!=='object'||!d.home)throw 0;
  if(!confirm('Replace what is on this device with this backup from '+(j.exportedAt?new Date(j.exportedAt).toLocaleDateString():'an earlier date')+'?'))return;
  localStorage.setItem(KEY,JSON.stringify(d));location.reload()}catch(e){toast('That file is not a Shingle backup')}};r.readAsText(file)}
// ---------- Install card ----------
let deferredPrompt=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;if(location.hash==='#home')render()});
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function installCard(){if(standalone()||S.installDismissed)return '';
 const android=/android/i.test(navigator.userAgent);
 if(isIOS())return `<section class="install-card" data-platform="ios" aria-labelledby="ic-ios-h">
<header class="ic-head"><img src="/shingle/assets/img/shingle-icon.svg" width="44" height="44" alt="" class="ic-logo"><div><p class="ic-kicker">iPhone and iPad, in Safari</p><h3 id="ic-ios-h">Add Shingle to your Home Screen</h3></div></header>
<ol class="ic-steps"><li class="ic-step"><span class="ic-num" aria-hidden="true">1</span><span class="ic-glyph"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8a1.5 1.5 0 0 0-1.5-1.5H16"/></svg></span><span class="ic-text"><b>Tap Share</b>The square with the arrow, in the Safari toolbar.</span></li><li class="ic-step"><span class="ic-num" aria-hidden="true">2</span><span class="ic-glyph"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/></svg></span><span class="ic-text"><b>Tap Add to Home Screen</b>Scroll down the share sheet if you don’t see it. Then tap Add.</span></li><li class="ic-step"><span class="ic-num" aria-hidden="true">3</span><span class="ic-glyph"><img src="/shingle/assets/img/shingle-icon.svg" width="24" height="24" alt="" class="ic-app"></span><span class="ic-text"><b>Open Shingle</b>Start it from the new icon on your Home Screen.</span></li></ol>
<p class="ic-note">Timeline reminders come from your own calendar after you add the .ics file. You don't need to install Shingle for that.</p><button class="btn ghost ic-x" id="in-x" type="button">Not now</button></section>`;
 if(android||deferredPrompt)return `<section class="install-card" data-platform="android" aria-labelledby="ic-and-h">
<header class="ic-head"><img src="/shingle/assets/img/shingle-icon.svg" width="44" height="44" alt="" class="ic-logo"><div><p class="ic-kicker">Android, in Chrome</p><h3 id="ic-and-h">Install the Shingle app</h3></div></header>
<button class="ic-install" type="button" id="in-go" ${deferredPrompt?'':'hidden'} data-install><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 7.5v7"/><path d="M9 11.5l3 3 3-3"/><path d="M10.5 18.5h3"/></svg><span>Install app</span></button>
<ol class="ic-steps"><li class="ic-step"><span class="ic-num" aria-hidden="true">1</span><span class="ic-glyph"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="currentColor"><circle cx="12" cy="5" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="12" cy="19" r="1.9"/></svg></span><span class="ic-text"><b>Tap the menu</b>The three dots at the top right of Chrome.</span></li><li class="ic-step"><span class="ic-num" aria-hidden="true">2</span><span class="ic-glyph"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 7.5v7"/><path d="M9 11.5l3 3 3-3"/><path d="M10.5 18.5h3"/></svg></span><span class="ic-text"><b>Tap Install app</b>Some phones say Add to Home screen. Then tap Install.</span></li><li class="ic-step"><span class="ic-num" aria-hidden="true">3</span><span class="ic-glyph"><img src="/shingle/assets/img/shingle-icon.svg" width="24" height="24" alt="" class="ic-app"></span><span class="ic-text"><b>Open Shingle</b>It opens from your app drawer like any other app.</span></li></ol><button class="btn ghost ic-x" id="in-x" type="button">Not now</button></section>`;
 return ''}
function backupNudge(){if(daysSince(S.lastBackup)<7)return '';return `<div class="card" id="bk-nudge"><h3>${S.lastBackup?"It's been a week since your last backup":'Back up your data'}</h3><p class="muted" style="margin:0">Your Shingle data lives only on this device. Save a backup file so you don't lose it.</p><button class="btn" id="bk-now">Back up now</button></div>`}
// ---------- Fair housing word check ----------
const FH_WORDS=['family-friendly','family friendly','perfect for families','great for families','perfect for young','young couple','ideal for','perfect for','safe neighborhood','exclusive neighborhood','adults only','no children','no kids','singles','bachelor','mature','empty nester','christian','church nearby','walking distance to church','integrated','ethnic','handicapped','able-bodied','english only'];
function fhCheck(t){const l=t.toLowerCase();return FH_WORDS.filter(w=>l.includes(w))}
function webBind(v){
 if(v==='help')bindLeadForm(PREV_SCREEN);
 if(v==='settings'){const x=$('#bk-export');if(x)x.onclick=exportBackup;const fi=$('#bk-file');if(fi)fi.onchange=()=>fi.files[0]&&importBackup(fi.files[0])}
 if(v==='home'){const A=$('#app'),h=A.querySelector('h1,h2');const extra=installCard()+backupNudge();if(extra){const w=document.createElement('div');w.innerHTML=extra;(h&&h.parentNode===A?h:A.firstChild).after(...w.childNodes)}
  const ig=$('#in-go');if(ig)ig.onclick=async()=>{deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;render()};
  const ix=$('#in-x');if(ix)ix.onclick=()=>{S.installDismissed=true;save();render()};const bn=$('#bk-now');if(bn)bn.onclick=exportBackup}
 if(v==='post'){const t=$('#ps-text'),o=$('#ps-fh');const u=()=>{const hits=fhCheck(t.value);o.innerHTML=hits.length?`<p class="fh-warn"><b>Fair housing check:</b> consider removing ${hits.map(h=>'"'+h+'"').join(', ')}. Describe the home, not who should live there.</p>`:''};t.addEventListener('input',u);u()}
 if(v==='sign'){const u=$('#sg-url');if(u&&!$('#sg-land')){u.insertAdjacentHTML('afterend','<button class="btn ghost" type="button" id="sg-land" style="margin-top:8px">No listing link? Use the Shingle page</button><p class="muted" style="margin:4px 0 0">Point the QR at your own listing link (for example a listing you posted yourself), or at get5krealty.com/shingle. Hosted listing pages are coming soon.</p>');
  $('#sg-land').onclick=()=>{u.value='https://get5krealty.com/shingle/';u.dispatchEvent(new Event('input'))}}}
}
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
if(navigator.storage&&navigator.storage.persist)navigator.storage.persisted().then(p=>p||navigator.storage.persist()).catch(()=>{});
render();
// ---------- Email this to me (mailto only, nothing is sent by Shingle) ----------
const MAIL_MAX=1800; // max length of the encoded body, keeps the whole mailto link well under common URL limits
function mailMe(subject,body){let b=String(body).trim();const end='\n\n(Shortened to fit. Open Shingle for the rest.)';
 if(encodeURIComponent(b).length>MAIL_MAX){while(b.length&&encodeURIComponent(b+end).length>MAIL_MAX)b=b.slice(0,-20);b=b.trimEnd()+end}
 const to=S.myEmail?encodeURIComponent(S.myEmail):'';location.href=`mailto:${to}?subject=${encodeURIComponent(String(subject).slice(0,120))}&body=${encodeURIComponent(b)}`}
// ---------- Showings: real dates from the day labels ("Thu 15") ----------
function showingDate(k){const m=k.match(/^(\w{3}) (\d+) (\d+):(\d\d)$/);if(!m)return null;const day=+m[2];let h=+m[3];if(h<9)h+=12; // slots run 10 am to 6 pm
 const t=new Date();t.setHours(0,0,0,0);for(let i=-7;i<120;i++){const d=new Date(t);d.setDate(t.getDate()+i);
  if(d.getDate()===day&&d.toLocaleDateString('en-US',{weekday:'short'})===m[1]){d.setHours(h,+m[4],0,0);return d}}return null}
const whenLabel=d=>d.toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
function showingIcs(b){const d=showingDate(b.k);if(!d){toast("Couldn't work out that date");return}
 dlIcs(icsEvents([{uid:'shingle-showing-'+b.k.replace(/\W/g,'')+'-'+b.n.replace(/\W/g,''),start:d,mins:60,summary:`Showing: ${b.n} at ${addr().replace(/[,;]/g,' ')}`,desc:'Planned in Shingle. Check that the buyer sent a pre-approval letter or proof of funds.',alarm:'-PT1H'}]),'shingle-showing.ics')}
function buyerSummary(b){const ok=b.docs.pre&&b.docs.id&&!b.docs.agent;return `Buyer: ${b.n}\nStatus: ${b.docs.agent?'Agent pitch':ok?'Ready':'Not yet'}\n${b.type||''}${b.note?' · '+b.note:''}\nPre-approval or proof of funds received: ${b.docs.pre?'Yes':'No'}\nName and phone confirmed: ${b.docs.id?'Yes':'No'}\nProperty: ${addr()}`}
function offersSummary(){return 'Offers on '+addr()+'\n\n'+S.offers.map(o=>`${o.n}: ${money(o.price)}, ${o.fin}, seller pays ${money(o.conc||0)}`).join('\n')+'\n\nEstimate only. Closing costs, payoff, and taxes not included.'}
function showingsSummary(){return 'Planned showings at '+addr()+'\n\n'+S.booked.map(b=>{const d=showingDate(b.k);return `${d?whenLabel(d):b.k}: ${b.n}`}).join('\n')}
const smallBtn=(attr,label,aria)=>`<button class="btn ghost" type="button" ${attr} style="margin:0;width:auto;padding:6px 10px;font-size:13px"${aria?` aria-label="${ea(aria)}"`:''}>${label}</button>`;
// ---------- Disclaimer acceptance record (made on the device with jsPDF) ----------
function acceptanceRecord(){const L=S.legal;if(!L)return;const {jsPDF}=window.jspdf;const d=new jsPDF({unit:'pt',format:'letter'});let y=60;const W=492;
 const line=(t,o={})=>{d.setFont('helvetica',o.b?'bold':'normal');d.setFontSize(o.s||11);d.splitTextToSize(t,W).forEach(r=>{if(y>740){d.addPage();y=60}d.text(r,60,y);y+=(o.s||11)*1.45});y+=o.gap||4};
 line('Shingle: The Seller Assist App',{b:1,s:16});line('Disclaimer acceptance record',{b:1,s:13,gap:10});
 line('Disclaimer version: '+L.version+' (effective '+lgDate(L.effective||LG_DATE)+')');
 line('Accepted by: '+(L.names||[]).join(', '));if(L.addr)line('Property: '+L.addr+(L.cityZip?', '+L.cityZip:'')+(L.state?' ('+L.state+')':''));if(L.phone)line('Phone: '+L.phone);if(L.email)line('Email: '+L.email);line('Date: '+(L.date||new Date(L.acceptedAt).toLocaleDateString()));line('Time: '+(L.time||new Date(L.acceptedAt).toLocaleTimeString()));line('Recorded (UTC): '+L.acceptedAt,{gap:12});
 line('Disclaimer text',{b:1});LG.disc.forEach(t=>line(t));line(LG.broker);line(LG.accept,{gap:12});
 line('This record was made on your device from what you entered in Shingle. It is not legal advice. Shingle by 5K Realty, Ingold Group Properties, LLC.',{s:9});
 d.save('shingle-disclaimer-acceptance-'+L.acceptedAt.slice(0,10)+'.pdf')}
const ACK_URL='https://formspree.io/f/mvkpgapo';
function ackText(){const L=S.legal;return ['Shingle: The Seller Assist App, disclaimer acknowledgement','Owners: '+(L.names||[]).join(', '),'Property: '+(L.addr||'')+(L.cityZip?', '+L.cityZip:'')+(L.state?' ('+L.state+')':''),'Phone: '+(L.phone||''),'Email: '+(L.email||''),'Date: '+L.date,'Time: '+L.time,'Disclaimer version: '+L.version+' (effective '+lgDate(L.effective||LG_DATE)+')','','I accepted this disclaimer:',...LG.disc,LG.accept].join('\n')}
function mailAck(){S.myEmail=S.legal.email||S.myEmail;mailMe('My Shingle disclaimer acknowledgement, '+(S.legal.addr||''),ackText())}
window.sendAck=function(manual){const L=S.legal;if(!L)return;const fd=new FormData();const sub='[Shingle Acknowledgement] '+(L.addr||'');
 fd.append('subject',sub);fd.append('_subject',sub);fd.append('_replyto',L.email||'');fd.append('email',L.email||'');fd.append('form','acknowledgement');fd.append('source','shingle-app');
 fd.append('owner_names',(L.names||[]).join(', '));(L.names||[]).forEach((n,i)=>fd.append('owner_'+(i+1),n));
 fd.append('phone',L.phone||'');fd.append('property_address',L.addr||'');fd.append('city_zip',L.cityZip||'');fd.append('state',L.state||'');fd.append('date',L.date);fd.append('time',L.time);fd.append('accepted_at_utc',L.acceptedAt);fd.append('disclaimer_version',L.version);fd.append('phone_verified',L.phoneVerified?'yes, by Twilio Verify '+L.phoneVerifiedAt:'not checked');fd.append('disclaimer_effective',L.effective||LG_DATE);fd.append('_gotcha','');
 fetch(ACK_URL,{method:'POST',body:fd,headers:{Accept:'application/json'}}).then(r=>{if(!r.ok)throw 0;S.legal.receipt='sent';save();if(manual){toast('Receipt sent');render()}}).catch(()=>{S.legal.receipt='failed';save();if(manual)toast('Could not send. Check your connection and try again.')})};
window.addEventListener('online',()=>{if(S.legal&&S.legal.receipt&&S.legal.receipt!=='sent')sendAck()});
// Phone verification (Twilio Verify through /api/otp/*). Off unless SHINGLE_CFG.otpGate is true.
const otpDigits=p=>{let d=String(p||'').replace(/\D/g,'');if(d.length===11&&d[0]==='1')d=d.slice(1);return d.length===10&&/^[2-9]\d{2}[2-9]/.test(d)?d:''};
window.otpOn=()=>!!(window.SHINGLE_CFG&&SHINGLE_CFG.otpGate&&SHINGLE_CFG.turnstileSiteKey);
window.otpVerifiedFor=p=>!!(S.otp&&S.otp.ok&&S.otp.phone&&S.otp.phone===otpDigits(p));
window.otpBox=()=>`<div class="card" id="otp" style="margin:8px 0"><p class="muted" style="margin:0 0 6px">We text a code to confirm this phone before you sign. US numbers only.</p><div id="otp-ts"></div><button class="btn ghost" type="button" id="otp-send">Send code</button><label for="otp-code">Code</label><input id="otp-code" inputmode="numeric" autocomplete="one-time-code" maxlength="10"><button class="btn ghost" type="button" id="otp-check">Check code</button><button class="btn ghost hidden" type="button" id="otp-resend">Resend code</button><button class="btn ghost hidden" type="button" id="otp-call">Call me instead</button><p class="muted" id="otp-msg" role="status" aria-live="polite"></p></div>`;
let otpTs=null,otpSends=0;
const OTP_MSG={us_only:'Enter a 10 digit US phone number.',turnstile:'Please finish the check above and try again.',rate_phone:'Too many tries for this number. Try again in an hour.',rate_ip:'Too many tries. Try again in an hour.',daily_cap:'Phone checks are paused for today. Try again tomorrow.',use_call:'Use Call me instead.',send_failed:'We could not send the code. Try again.',unavailable:'Text codes are down on our end right now. Try again later, or email michael@get5krealty.com.',bad_number:'That number can\'t get texts. Check it and try again.',wrong_code:'That code didn\'t match.',expired:'That code expired. Send a new one.',rate_check:'Too many tries. Wait 10 minutes.',not_configured:'Phone check isn\'t set up yet.'};
function otpBind(){const box=$('#otp');if(!box)return;const msg=(t,err)=>{const m=$('#otp-msg');m.textContent=t;m.style.color=err?'#b00020':err===false?'#1b7a35':'';m.style.fontWeight=err?'700':'';m.scrollIntoView({block:'center'})},bad=t=>msg(t,true),good=t=>msg(t,false);
 const ensureTs=()=>new Promise(res=>{if(window.turnstile)return res();const s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.onload=res;s.onerror=res;document.head.appendChild(s)});
 ensureTs().then(()=>{if(window.turnstile&&$('#otp-ts'))otpTs=turnstile.render('#otp-ts',{sitekey:SHINGLE_CFG.turnstileSiteKey,callback:()=>{if(waitCh){const c=waitCh;waitCh=null;send(c)}}})});
 const tok=()=>window.turnstile&&otpTs!=null?turnstile.getResponse(otpTs):'';
 let waitCh=null,busy=false;
 const send=async ch=>{const d=otpDigits($('#lg-phone').value);if(!d)return bad(OTP_MSG.us_only);if(busy)return;
  const t=tok();if(!t){waitCh=ch;return msg('One moment, finishing the security check...')}
  const btns=['#otp-send','#otp-resend','#otp-call'].map(q=>$(q)),btn=$(ch==='call'?'#otp-call':otpSends?'#otp-resend':'#otp-send'),label=btn.textContent;
  busy=true;btns.forEach(b=>b.disabled=true);btn.textContent='Sending...';msg(ch==='call'?'Calling you now...':'Sending...');
  try{const r=await fetch('/api/otp/start',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone:d,channel:ch,turnstileToken:t})});const j=await r.json();
   if(window.turnstile&&otpTs!=null)turnstile.reset(otpTs);
   if(!j.ok)return bad(OTP_MSG[j.error]||'Something went wrong. Try again.');
   if(ch==='sms'){otpSends++;$('#otp-send').classList.add('hidden');$('#otp-resend').classList.toggle('hidden',otpSends>=2);$('#otp-call').classList.toggle('hidden',otpSends<2)}else{$('#otp-call').classList.add('hidden')}
   good(ch==='call'?'We\'re calling with your code.':'Code sent. Check your texts.')}catch(_){bad('You look offline. Connect and try again.')}
  finally{busy=false;btns.forEach(b=>b.disabled=false);btn.textContent=label}};
 $('#otp-send').onclick=()=>send('sms');$('#otp-resend').onclick=()=>send('sms');$('#otp-call').onclick=()=>send('call');
 $('#otp-check').onclick=async()=>{const d=otpDigits($('#lg-phone').value),c=$('#otp-code').value.trim();if(!d)return bad(OTP_MSG.us_only);if(!/^\d{4,10}$/.test(c))return bad('Enter the code you got.');
  try{const r=await fetch('/api/otp/check',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone:d,code:c})});const j=await r.json();
   if(!j.ok)return bad(OTP_MSG[j.error]||'Something went wrong. Try again.');S.otp={ok:true,phone:d,at:j.verifiedAt};save();good('Phone confirmed.');if(window.lgSync)lgSync()}catch(_){bad('You look offline. Connect and try again.')}};
 if(otpVerifiedFor($('#lg-phone').value)){const m=$('#otp-msg');m.textContent='Phone confirmed.';m.style.color='#1b7a35'}}
const prevWebBind=webBind;webBind=function(v){prevWebBind(v);
 if(v==='disclaimer')otpBind();
 if(v==='settings'){const r=$('#lg-record');if(r)r.onclick=acceptanceRecord;const m=$('#lg-mail');if(m)m.onclick=mailAck;const rs=$('#lg-resend');if(rs)rs.onclick=()=>sendAck(true)}
 if(v==='showings'&&S.booked.length){const list=[...document.querySelectorAll('.card.list .item')];
  list.forEach((it,i)=>{const b=S.booked[i];if(!b)return;it.insertAdjacentHTML('beforeend',`<span style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${smallBtn(`data-shcal="${i}"`,'Add to calendar','Add showing with '+b.n+' to calendar')}</span>`)});
  const card=document.querySelector('.card.list');card.insertAdjacentHTML('beforeend','<button class="btn ghost" type="button" id="sh-mail">Email this to me</button>');
  document.querySelectorAll('[data-shcal]').forEach(x=>x.onclick=()=>showingIcs(S.booked[x.dataset.shcal]));$('#sh-mail').onclick=()=>mailMe('Shingle: planned showings at '+addr(),showingsSummary())}
 if(v==='buyers'){document.querySelectorAll('#app > .card').forEach(c=>{const cb=c.querySelector('input[data-i]');if(!cb)return;const i=+cb.dataset.i;c.insertAdjacentHTML('beforeend',`<button class="btn ghost" type="button" data-bmail="${i}">Email this to me</button>`)});
  document.querySelectorAll('[data-bmail]').forEach(x=>x.onclick=()=>{const b=S.buyers[x.dataset.bmail];mailMe('Shingle: buyer '+b.n+' for '+addr(),buyerSummary(b))})}
 if(v==='offers'&&S.offers.length){const t=document.querySelector('#app table');if(t){t.closest('.card').insertAdjacentHTML('beforeend','<button class="btn ghost" type="button" id="of-mail">Email this to me</button>');$('#of-mail').onclick=()=>mailMe('Shingle: offers on '+addr(),offersSummary())}}
 if(v==='settings'){const bk=$('#backup');if(bk&&!$('#my-email')){bk.insertAdjacentHTML('beforebegin',`<div class="card"><h3>Your email</h3><label for="my-email">Used to fill in "Email this to me." Optional, and it stays on this device.</label><input id="my-email" type="email" autocomplete="email" value="${ea(S.myEmail||'')}"></div>`);$('#my-email').onchange=e=>{S.myEmail=e.target.value.trim();save();toast('Saved on this device')}}}
};
render();

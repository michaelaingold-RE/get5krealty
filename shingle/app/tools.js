// Reply templates, Post it elsewhere, Under-contract timeline. No network calls, nothing sent automatically.
(function(){
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const H=()=>S.home,addr=()=>H().addr||'my home';
function copy(t){(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('Copied'),()=>{const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove();toast('Copied')})}
// ---------- Reply templates ----------
const TPL=[
 ['Showing request',`Hi! Thanks for asking about ${'{addr}'}. Reply with two or three times that work for you. Before the showing, please send a pre-approval letter or proof of funds. Thanks!`],
 ['Prequal reminder',`Thanks for setting up a showing at {addr}. Just a reminder that I need a pre-approval letter or proof of funds before we confirm. You can send it to me by replying to this message.`],
 ['Agent pitch, no thanks',`Thanks for reaching out. I'm selling on my own for now and not looking to list. If you have a buyer for {addr}, I'm happy to hear from you.`],
 ['Offer received',`Thanks for your offer on {addr}. I've received it and will get back to you by {date}.`],
 ['Home is under contract',`Thanks for your interest in {addr}. The home is now under contract, so I'm not scheduling more showings right now.`]];
function fill(t){return t.replace(/\{addr\}/g,addr()).replace(/\{date\}/g,'[date]')}
V.replies=()=>{S.replies=S.replies||TPL.map(t=>fill(t[1]));return `<h2>Reply templates</h2><p class="muted">Edit any reply, then copy it or open it in your own email or text app. Shingle never sends anything for you.</p>${(S.replies&&S.repliesUsed)?'':'<div class="card empty"><img src="assets/empty/no-replies.svg" alt="" width="160" height="120"><h3>Nothing sent yet</h3><p class="muted">Pick a reply below, make it yours, and send it from your own phone or email.</p></div>'}
${TPL.map((t,i)=>`<div class="card"><label for="rp-${i}">${t[0]}</label><textarea id="rp-${i}" rows="4" style="width:100%;padding:12px;border:1px solid var(--line);border-radius:12px;font:inherit;font-size:16px">${esc(S.replies[i]||fill(t[1]))}</textarea>
<div class="row" style="margin-top:8px"><button class="btn" style="margin:0" data-copy="${i}">Copy</button><button class="btn ghost" style="margin:0" data-mail="${i}">Email</button><button class="btn ghost" style="margin:0" data-sms="${i}">Text</button></div><button class="btn ghost" type="button" data-mailme="${i}" style="margin-top:8px">Email this to me</button></div>`).join('')}
${fhNotice()}${help}`};
// ---------- Post it elsewhere ----------
function listing(){const h=H(),p=[];p.push(`For sale by owner: ${h.beds} bed, ${h.baths} bath, about ${Number(h.sqft).toLocaleString()} sq ft${h.addr?` at ${h.addr}`:''}.`);
 if(h.year)p.push(`Built in ${h.year}.`);p.push(h.hoa==='yes'?'Part of an HOA.':'No HOA.');if(h.price)p.push(`Asking ${money(h.price)}.`);
 p.push('Showings by appointment. Please have a pre-approval letter or proof of funds ready.');p.push(S.signPhone?`Call or text ${S.signPhone}.`:'Message me to set up a showing.');
 if(h.year&&h.year<1978)p.push('Home built before 1978: lead-based paint disclosure and EPA pamphlet provided.');return p.join(' ')}
V.post=()=>`<h2>Post it elsewhere</h2><p class="muted">More eyes on the house. Copy this text, then paste it on the sites you choose.</p>
<div class="card"><label for="ps-text">Your listing text (built from your property details)</label><textarea id="ps-text" rows="8" style="width:100%;padding:12px;border:1px solid var(--line);border-radius:12px;font:inherit;font-size:16px">${esc(S.postText||listing())}</textarea>
<div class="row" style="margin-top:8px"><button class="btn" style="margin:0" id="ps-copy">Copy text</button><button class="btn ghost" style="margin:0" id="ps-reset">Rebuild from details</button></div>
<p class="muted" style="margin-top:8px">Add your own photos on each site.</p><div id="ps-fh" role="status" aria-live="polite"></div></div>${fhNotice()}${leadNotice()}
<div class="card"><h3>Where to post</h3><p class="muted" style="margin:0">Copy your listing text to post anywhere you like. Shingle doesn't post for you and doesn't put homes on the MLS.</p></div>
${want('Want buyer agents to see it too?')}${help}`;
// ---------- Under-contract timeline ----------
const KEYS=[['contract','Contract signed'],['inspection','Inspection or due diligence ends'],['appraisal','Appraisal deadline'],['financing','Financing deadline'],['closing','Closing']];
const tl=()=>S.tl=S.tl||{dates:{},remind:'2'};
const fmt=d=>new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
function daysFrom(d){const t=new Date();t.setHours(12,0,0,0);return Math.round((new Date(d+'T12:00:00')-t)/864e5)}
V.timeline=()=>{const o=tl(),ev=KEYS.filter(k=>o.dates[k[0]]).map(k=>[k[1],o.dates[k[0]],k[0]]).sort((a,b)=>a[1]<b[1]?-1:1);
return `<h2>Under-contract timeline</h2><p class="muted">Enter the dates from your signed contract. Shingle doesn't guess deadline lengths. Your contract and your attorney set them.</p>
<div class="card">${KEYS.map(k=>`<label for="tl-${k[0]}">${k[1]}</label><input type="date" id="tl-${k[0]}" value="${o.dates[k[0]]||''}">`).join('')}
<label for="tl-rem">Remind me</label><select id="tl-rem">${[['1','1 day before'],['2','2 days before'],['3','3 days before'],['7','1 week before']].map(r=>`<option value="${r[0]}" ${o.remind===r[0]?'selected':''}>${r[1]}</option>`).join('')}</select></div>
<div class="card"><h3>Your timeline</h3>${ev.length?`<ol style="list-style:none;padding:0;margin:0">${ev.map(e=>{const n=daysFrom(e[1]);return `<li class="item tl-row" style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)"><span><b>${e[0]}</b><br><span class="muted">${fmt(e[1])}</span></span><span style="display:flex;gap:8px;align-items:center"><span class="pill ${n<0?'':n<=3?'warn':''}">${n<0?'Done':n===0?'Today':n+' days'}</span><button class="btn ghost cal-btn" type="button" data-tlcal="${e[2]}" style="margin:0;width:auto;padding:6px 10px;font-size:13px" aria-label="Add ${e[0]} to calendar">Add to calendar</button></span></li>`}).join('')}</ol>`:'<div class="empty"><img src="assets/empty/no-timeline.svg" alt="" width="160" height="120"><h3>No dates yet</h3><p class="muted">Add your contract date above to start your timeline.</p></div>'}
<button class="btn" id="tl-ics" ${ev.length?'':'disabled'}>Download calendar file (.ics)</button><p class="muted" style="margin-top:6px">Opens in Google Calendar, Apple Calendar, or Outlook. Each date gets a reminder.</p></div>
${attyPrompt('Contract, earnest money, and closing')}${earnestNote()}<div class="note">Check every date against your signed contract and with your closing attorney. Deadlines can change if the contract is amended.</div>
${want('Want someone watching the deadlines with you?')}${help}`};
// Shared .ics builder. Each event: {uid, date:'YYYY-MM-DD'} for all-day, or {uid, start:Date, mins} for a timed event (floating local time).
const icsEsc=t=>String(t).replace(/\\/g,'\\\\').replace(/[,;]/g,m=>'\\'+m).replace(/\n/g,'\\n');
const icsLocal=d=>d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')+'T'+String(d.getHours()).padStart(2,'0')+String(d.getMinutes()).padStart(2,'0')+'00';
function icsEvents(list){const now=new Date().toISOString().replace(/[-:]/g,'').split('.')[0]+'Z',L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Shingle//Shingle//EN','CALSCALE:GREGORIAN'];
 list.forEach(e=>{L.push('BEGIN:VEVENT',`UID:${e.uid}@shingle.local`,`DTSTAMP:${now}`);
  if(e.date){const n=new Date(e.date+'T12:00:00');n.setDate(n.getDate()+1);L.push(`DTSTART;VALUE=DATE:${e.date.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${n.toISOString().slice(0,10).replace(/-/g,'')}`)}
  else{const end=new Date(e.start.getTime()+(e.mins||60)*6e4);L.push(`DTSTART:${icsLocal(e.start)}`,`DTEND:${icsLocal(end)}`)}
  L.push(`SUMMARY:${icsEsc(e.summary)}`,`DESCRIPTION:${icsEsc(e.desc||'')}`);
  if(e.alarm)L.push('BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${icsEsc(e.summary)}`,`TRIGGER:${e.alarm}`,'END:VALARM');L.push('END:VEVENT')});
 L.push('END:VCALENDAR');return L.join('\r\n')+'\r\n'}
function dlIcs(text,name){const u=URL.createObjectURL(new Blob([text],{type:'text/calendar'}));const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);toast('Calendar file downloaded')}
const tlEvent=(k,o)=>({uid:`shingle-${k[0]}-${o.dates[k[0]].replace(/-/g,'')}`,date:o.dates[k[0]],summary:`${k[1]} (${addr().replace(/[,;]/g,' ')})`,desc:'From your Shingle timeline. Check this date against your signed contract.',alarm:`-P${o.remind}D`});
function ics(){const o=tl();return icsEvents(KEYS.filter(k=>o.dates[k[0]]).map(k=>tlEvent(k,o)))}
const prev=bind;bind=function(v){prev(v);
 if(v==='replies'){document.querySelectorAll('textarea[id^=rp-]').forEach((t,i)=>t.oninput=()=>{S.replies[i]=t.value;save()});
  const val=i=>document.getElementById('rp-'+i).value,sub=i=>TPL[i][0]+': '+addr();
  const used=()=>{S.repliesUsed=true;save()};document.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>{used();copy(val(b.dataset.copy))});
  document.querySelectorAll('[data-mail]').forEach(b=>b.onclick=()=>{used();location.href=`mailto:?subject=${encodeURIComponent(sub(b.dataset.mail))}&body=${encodeURIComponent(val(b.dataset.mail))}`});
  document.querySelectorAll('[data-mailme]').forEach(b=>b.onclick=()=>mailMe(sub(b.dataset.mailme),val(b.dataset.mailme)));
  document.querySelectorAll('[data-sms]').forEach(b=>b.onclick=()=>{used();location.href=`sms:?&body=${encodeURIComponent(val(b.dataset.sms))}`})}
 if(v==='post'){const t=$('#ps-text');t.oninput=()=>{S.postText=t.value;save()};$('#ps-copy').onclick=()=>copy(t.value);$('#ps-reset').onclick=()=>{delete S.postText;save();render()}}
 if(v==='timeline'){const o=tl();KEYS.forEach(k=>{document.getElementById('tl-'+k[0]).onchange=e=>{o.dates[k[0]]=e.target.value;save();render()}});$('#tl-rem').onchange=e=>{o.remind=e.target.value;save()};
  $('#tl-ics').onclick=()=>dlIcs(ics(),'shingle-timeline.ics');
  document.querySelectorAll('[data-tlcal]').forEach(b=>b.onclick=()=>{const k=KEYS.find(x=>x[0]===b.dataset.tlcal);dlIcs(icsEvents([tlEvent(k,o)]),'shingle-'+k[0]+'.ics')})}};
Object.assign(window,{icsEvents,dlIcs,addr});
if(['#replies','#post','#timeline'].includes(location.hash))render();
})();

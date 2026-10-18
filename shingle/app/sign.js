// © 2026 Ingold Group Properties, LLC dba 5K Realty. All rights reserved.
// Yard sign maker. Landscape 24 x 18 in, based on the Canvas "hanging shingle" design.
// Everything runs in the browser. QR: vendor/qrcode.js. PDF: vendor/jspdf.umd.min.js. No network calls.
(function(){
const IN={w:24,h:18},BLEED=0.125,SAFE=0.5,DPI=150;
const STYLES={a:{name:'Hanging shingle (green)',bg:'#1F3A2E',panel:'#F6EFE2',ink:'#1F3A2E',accent:'#B9572F'},
 b:{name:'Roof courses (charcoal)',bg:'#1B1E21',panel:'#F1ECE4',ink:'#1B1E21',accent:'#B8641E'},
 c:{name:'Scalloped house (teal)',bg:'#0F4A47',panel:'#FBF1D6',ink:'#0F4A47',accent:'#C2462D'}};
const st=()=>{S.sign=S.sign||{phone:S.signPhone||'',url:'',usePhone:!!S.signPhone,useQR:true,style:'a',sample:false};return S.sign};
function qrMatrix(text){const q=qrcode(0,'H');q.addData(text);q.make();const n=q.getModuleCount(),m=[];for(let r=0;r<n;r++){m.push([]);for(let c=0;c<n;c++)m[r].push(q.isDark(r,c))}return m}
function fit(ctx,txt,font,maxW,start){let s=start;do{ctx.font=font.replace('{s}',s);if(ctx.measureText(txt).width<=maxW)break;s-=2}while(s>10);return s}
function draw(cv,scale,guides){const o=st(),C=STYLES[o.style]||STYLES.a;
 const W=(IN.w+2*BLEED)*DPI*scale,H=(IN.h+2*BLEED)*DPI*scale,u=DPI*scale;cv.width=Math.round(W);cv.height=Math.round(H);const x=cv.getContext('2d');
 const b=BLEED*u,s=SAFE*u,L=b+s,T=b+s,R=W-b-s,B=H-b-s;
 x.fillStyle=C.bg;x.fillRect(0,0,W,H);
 // cream panel with a shingle roof point, inside trim
 const px=b+0.6*u,py=b+0.6*u,pw=W-2*px,ph=H-2*py;x.fillStyle=C.panel;x.beginPath();x.moveTo(px,py+1.6*u);x.lineTo(W/2,py);x.lineTo(px+pw,py+1.6*u);x.lineTo(px+pw,py+ph);x.lineTo(px,py+ph);x.closePath();x.fill();
 const usePhone=o.usePhone&&o.phone.trim(),useQR=o.useQR&&o.url.trim();
 const qs=useQR?Math.min(9*u,ph-1.9*u-2.4*u):0; // QR side, 9 in when there is room (at least 8 in)
 const qx=px+pw-0.9*u-0.45*u-qs,qy=py+1.9*u+0.45*u;const textR=useQR?qx-1.2*u:R,textL=L+0.6*u,tw=textR-textL,cx=useQR?textL:W/2;x.textAlign=useQR?'left':'center';x.textBaseline='alphabetic';
 x.fillStyle=C.ink;let fs=fit(x,'For Sale','700 {s}px Fraunces, Georgia, serif',tw,Math.round(3.6*u));const blockH=fs*0.8+fit(x,'BY OWNER','800 {s}px Archivo, Arial, sans-serif',tw,Math.round(1.25*u))*1.5+(usePhone?2.6*u:0);let y=py+1.6*u+((ph-1.6*u)-blockH)/2+fs*0.8;x.font=`700 ${fs}px Fraunces, Georgia, serif`;x.fillText('For Sale',cx,y);
 x.fillStyle=C.accent;let f2=fit(x,'BY OWNER','800 {s}px Archivo, Arial, sans-serif',tw,Math.round(1.25*u));y+=f2*1.5;x.font=`800 ${f2}px Archivo, Arial, sans-serif`;x.fillText('BY OWNER',cx,y);
 if(usePhone){x.fillStyle=C.ink;let f3=fit(x,o.phone,'700 {s}px Archivo, Arial, sans-serif',tw,Math.round(1.6*u));y+=f3*1.8;x.font=`700 ${Math.round(f3*0.45)}px Archivo, Arial, sans-serif`;x.fillText('CALL OR TEXT',cx,y-f3*1.05);x.font=`700 ${f3}px Archivo, Arial, sans-serif`;x.fillText(o.phone,cx,y)}
 if(useQR){const pad=0.45*u;x.fillStyle='#fff';x.fillRect(qx-pad,qy-pad,qs+2*pad,qs+2*pad);x.strokeStyle=C.ink;x.lineWidth=0.12*u;x.strokeRect(qx-pad,qy-pad,qs+2*pad,qs+2*pad);
  const m=qrMatrix(o.url.trim()),n=m.length,ms=qs/n;x.fillStyle=C.ink;for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(m[r][c])x.fillRect(qx+c*ms,qy+r*ms,Math.ceil(ms),Math.ceil(ms));
  x.textAlign='center';x.fillStyle=C.ink;const f4=fit(x,'Scan for photos and showings','700 {s}px Archivo, Arial, sans-serif',qs+2*pad,Math.round(0.8*u));x.font=`700 ${f4}px Archivo, Arial, sans-serif`;x.fillText('Scan for photos and showings',qx+qs/2,qy+qs+pad+f4*1.4)}
 x.textAlign='left';x.fillStyle=C.ink;x.font=`700 ${Math.round(0.7*u)}px Inter, Arial, sans-serif`;x.fillText('Shingle',textL,py+ph-0.8*u);
 if(o.sample){x.save();x.translate(W/2,H/2);x.rotate(-0.35);x.textAlign='center';x.fillStyle='rgba(200,40,40,.28)';x.font=`900 ${Math.round(4.2*u)}px Arial, sans-serif`;x.fillText('SAMPLE',0,u*1.4);x.restore()}
 if(guides){x.setLineDash([6,5]);x.lineWidth=2;x.strokeStyle='#d33';x.strokeRect(b,b,W-2*b,H-2*b);x.strokeStyle='#2a7';x.strokeRect(L,T,R-L,B-T);x.setLineDash([])}
 return {usePhone,useQR,qsIn:qs/u}}
function fname(ext){return `shingle-yard-sign-24x18${st().sample?'-SAMPLE':''}.${ext}`}
function dl(href,name){const a=document.createElement('a');a.href=href;a.download=name;document.body.appendChild(a);a.click();a.remove()}
V.sign=()=>{const o=st();return `<h2>Make my yard sign</h2><p class="muted">Add your phone, a QR code for your listing link, or both. Preview it, then download a print-ready file.</p>${(o.url.trim()||o.phone.trim())?'':'<div class="card empty"><img src="assets/empty/sign-not-made.svg" alt="" width="160" height="120"><h3>No sign yet</h3><p class="muted">Add a listing link or a phone number below and your preview shows up here.</p></div>'}
<div class="card"><label for="sg-style">Design</label><select id="sg-style">${Object.entries(STYLES).map(([k,v])=>`<option value="${k}" ${o.style===k?'selected':''}>${v.name}</option>`).join('')}</select>
<label class="check" style="border:0"><input type="checkbox" id="sg-useqr" ${o.useQR?'checked':''}><span>Add a QR code</span></label>
<label for="sg-url">Your listing link</label><input id="sg-url" type="url" inputmode="url" placeholder="https://..." value="${o.url}" aria-describedby="sg-url-h"><p class="muted" id="sg-url-h" style="margin:4px 0 0">The QR is made right here on your phone. Nothing is uploaded.</p>
<label class="check" style="border:0"><input type="checkbox" id="sg-usephone" ${o.usePhone?'checked':''}><span>Add my phone number <span class="muted">(optional)</span></span></label>
<label for="sg-phone">Phone</label><input id="sg-phone" type="tel" placeholder="704 555 0123" value="${o.phone}"></div>
<div class="card"><h3>Preview</h3><div class="preview-frame"><canvas id="sg-prev" style="width:100%;height:auto;border-radius:12px;display:block" role="img" aria-label="Yard sign preview, 24 by 18 inches"></canvas></div><p class="preview-cap">Preview, 24 x 18 in</p>
<label class="check" style="border:0"><input type="checkbox" id="sg-guides" checked><span>Show trim (red) and safe area (green). Guides don't print.</span></label>
<p class="muted" id="sg-info" aria-live="polite"></p>
<button class="btn" id="sg-pdf">Download print-ready PDF</button><button class="btn ghost" id="sg-png">Download PNG</button>
${demoBtn(`<button class="btn ghost" id="sg-sample" style="margin-top:14px">${o.sample?'Demo: clear sample data':'Demo: fill with sample data'}</button>`)}</div>
<div class="card"><h3>Recommended size</h3><p class="muted" style="margin:0">24 x 18 in (landscape) on 4 mm corrugated plastic with a wire H-stake. That size is offered by Vistaprint, FedEx Office, and Staples (checked Oct 15, 2026). Staples and FedEx Office list it as 24" x 18" landscape, so this file is landscape.</p>
<p class="muted">File: 24.25 x 18.25 in with 0.125 in bleed on each side, text kept 0.5 in inside the trim, 150 dpi. Check your printer's own template before you order and adjust if theirs differs.</p>
<p class="muted" style="margin:0"><b>QR size:</b> keep it at least 8 in square. A common rule of thumb is that a QR scans from about 10 times its width, so 8 in works from about 6 to 7 ft. That means the sidewalk or the end of the driveway, not a passing car. Test it with your own phone before you print.</p></div>
<div class="note">Before you put it out, check your HOA rules and your city or county sign rules. Some neighborhoods limit yard signs. We don't know your HOA's rules, so ask them.</div>${help}`};
const oldBind=bind;bind=function(v){oldBind(v);if(v!=='sign')return;const o=st(),pv=$('#sg-prev');
 const up=()=>{o.style=$('#sg-style').value;o.url=$('#sg-url').value;o.phone=$('#sg-phone').value;o.useQR=$('#sg-useqr').checked;o.usePhone=$('#sg-usephone').checked;S.signPhone=o.usePhone?o.phone.trim():'';save();
  const r=draw(pv,0.16,$('#sg-guides').checked);const ok=r.usePhone||r.useQR;$('#sg-pdf').disabled=$('#sg-png').disabled=!ok;
  $('#sg-info').textContent=!ok?'Add a listing link or a phone number to make a sign.':`Includes: ${[r.useQR&&`QR code (${r.qsIn.toFixed(1)} in square)`,r.usePhone&&'phone number'].filter(Boolean).join(' and ')}.${o.sample?' SAMPLE data.':''}`};
 ['sg-style','sg-url','sg-phone','sg-useqr','sg-usephone','sg-guides'].forEach(id=>{const e=document.getElementById(id);e.oninput=e.onchange=up});up();
 $('#sg-png').onclick=()=>{const c=document.createElement('canvas');draw(c,1,false);shingleSave(shingleBlobFromDataURL(c.toDataURL('image/png')),fname('png'),'image/png').then(r=>shingleSaveToast(r,'Sign image'))};
 $('#sg-pdf').onclick=()=>{const c=document.createElement('canvas');draw(c,1,false);const {jsPDF}=window.jspdf;const W=IN.w+2*BLEED,H=IN.h+2*BLEED;
  const d=new jsPDF({orientation:'landscape',unit:'in',format:[W,H],compress:true});d.setProperties({title:'Shingle yard sign 24x18'+(o.sample?' SAMPLE':'')});d.addImage(c.toDataURL('image/png'),'PNG',0,0,W,H,undefined,'FAST');shingleSave(d.output('blob'),fname('pdf'),'application/pdf').then(r=>shingleSaveToast(r,'Sign PDF'))};
 if($('#sg-sample'))$('#sg-sample').onclick=()=>{if(o.sample){Object.assign(o,{sample:false,url:'',phone:''})}else Object.assign(o,{sample:true,url:'https://example.com/sample-listing',phone:'704-555-0100',useQR:true,usePhone:true});save();render()};
};
if(location.hash==="#sign")render();
})();

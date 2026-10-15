// Android/Chrome: show the one-tap Install button only when the browser offers it.
(function(){let ev;addEventListener('beforeinstallprompt',e=>{e.preventDefault();ev=e;document.querySelectorAll('[data-install]').forEach(b=>b.hidden=false)});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-install]');if(!b||!ev)return;ev.prompt();await ev.userChoice;ev=null;b.hidden=true});
addEventListener('appinstalled',()=>document.querySelectorAll('[data-install]').forEach(b=>b.hidden=true));
// Optional: show only the card for the visitor's platform. Remove to always show both.
const ua=navigator.userAgent,ios=/iPhone|iPad|iPod/.test(ua)||(ua.includes('Mac')&&'ontouchend' in document),and=/Android/.test(ua);
if(ios||and)document.querySelectorAll('.install-card').forEach(c=>{if(c.dataset.platform!==(ios?'ios':'android'))c.hidden=true});
if(matchMedia('(display-mode: standalone)').matches||navigator.standalone)document.querySelectorAll('.install-card').forEach(c=>c.hidden=true);})();

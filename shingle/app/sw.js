// Shingle service worker: caches the app's own files so it works offline.
// It never caches or sends user data. Your data lives in localStorage on the device.
// Bump VERSION on every release so phones pick up the new files.
const VERSION='shingle-web-1.0-2026-10-15';
const FILES=[
  './',
  '../assets/icons/favicon.ico',
  '../assets/icons/favicon.svg',
  '../assets/icons/apple-touch-icon-180.png',
  '../assets/icons/pwa-192.png',
  '../assets/install-card.css',
  '../assets/img/shingle-icon.svg',
  'app.js',
  'assets/apple-touch-icon-180.png',
  'assets/empty/no-buyers.svg',
  'assets/empty/no-offers.svg',
  'assets/empty/no-replies.svg',
  'assets/empty/no-showings.svg',
  'assets/empty/no-timeline.svg',
  'assets/empty/sign-not-made.svg',
  'assets/favicon.ico',
  'assets/favicon.svg',
  'assets/fonts/Gelasio-var.woff2',
  'assets/fonts/Inter-var.woff2',
  'assets/onboarding/compare-offers.svg',
  'assets/onboarding/list-your-home.svg',
  'assets/onboarding/screen-buyers.svg',
  'assets/pwa-icon-192.png',
  'assets/pwa-icon-512-maskable.png',
  'assets/pwa-icon-512.png',
  'index.html',
  'legal.js',
  'manifest.webmanifest',
  'sign.js',
  'styles.css',
  'tools.js',
  'vendor/jspdf.umd.min.js',
  'vendor/qrcode.js',
  'web.js',
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return; // outside links go straight to the network
  if(r.mode==='navigate'){e.respondWith(fetch(r).catch(()=>caches.match('./index.html',{ignoreSearch:true})));return}
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(hit=>hit||fetch(r)));
});

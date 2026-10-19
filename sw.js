const V='bansko-v5',T='bansko-tiles-v3';
const SHELL=['./','index.html','app.js','style.css','manifest.json','lib/maplibre-gl.js','lib/maplibre-gl.css','data/bansko.geojson','data/splash.jpg','data/official-georef.json','data/bansko-official-full.jpg','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V&&x!==T).map(x=>caches.delete(x)))));self.clients.claim();});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);
 if(/api\.maptiler\.com/.test(u.host)){e.respondWith(caches.open(T).then(async c=>{const r=await c.match(e.request);if(r&&Date.now()-(+r.headers.get('x-sw-t')||0)<864e5)return r;try{const n=await fetch(e.request);if(n.ok){const b=await n.clone().blob();const hd=new Headers(n.headers);hd.set('x-sw-t',Date.now());c.put(e.request,new Response(b,{status:n.status,headers:hd}));}return n;}catch(x){return r||new Response('',{status:504});}}));return;}
 if(/arcgisonline\.com|opentopomap\.org|elevation-tiles-prod/.test(u.href)){e.respondWith(caches.open(T).then(async c=>{const r=await c.match(e.request);if(r)return r;try{const n=await fetch(e.request);if(n.ok)c.put(e.request,n.clone());return n;}catch(x){return new Response('',{status:504});}}));return;}
 if(u.origin===location.origin){e.respondWith(fetch(e.request).then(n=>{const cl=n.clone();if(n.ok)caches.open(V).then(c=>c.put(e.request,cl));return n;}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))));}
});

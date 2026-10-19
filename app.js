const $=id=>document.getElementById(id);
const toast=t=>{$('toast').textContent=t;$('toast').style.opacity=1;clearTimeout(toast.t);toast.t=setTimeout(()=>$('toast').style.opacity=0,2500);};
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
function showUser(){const u=localStorage.getItem('user');$('login').classList.toggle('hidden',!!u);$('hello').textContent=u||'Банско';$('myav').textContent=u?u[0].toUpperCase():'?';}
$('go').onclick=()=>{const n=$('uname').value.trim();if(!n)return toast('Въведете име');localStorage.setItem('user',n);showUser();};
$('logout').onclick=()=>{localStorage.removeItem('user');showUser();};showUser();
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('on',x===b));['map','friends','stats'].forEach(t=>$('t-'+t).classList.toggle('hidden',t!==b.dataset.t));renderF();});
const VIEW={center:[23.441,41.783],zoom:12.9,pitch:68,bearing:-155};
const MT_KEY='BMTlGG1fVbheeDTt9Vv8';
const MT=k=>'https://api.maptiler.com/maps/'+k+'/style.json?key='+MT_KEY;
const STYLES=[MT('winter-v4'),MT('hybrid'),MT('outdoor-v4')];
const TERRAIN={source:'mt-dem',exaggeration:1.4};
const SKY={'sky-color':'#2f7fd6','horizon-color':'#cfe6ff','fog-color':'#eef4fb','sky-horizon-blend':.6,'horizon-fog-blend':.6,'fog-ground-blend':.25,'atmosphere-blend':.8};
// Кирилски надписи: предпочитаме name:bg, после name
function bgLabels(v){if(Array.isArray(v)){if(v[0]==='get'&&typeof v[1]==='string'&&/^name(:|_)(en|latin)/.test(v[1]))return['coalesce',['get','name:bg'],['get','name']];return v.map(bgLabels);}
 if(typeof v==='string'&&/\{name(:en|:latin|_en)?\}/.test(v))return['coalesce',['get','name:bg'],['get','name']];return v;}
function transformStyle(prev,next){next.layers.forEach(l=>{if(l.layout&&l.layout['text-field'])l.layout['text-field']=bgLabels(l.layout['text-field']);});
 next.sources['mt-dem']={type:'raster-dem',url:'https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key='+MT_KEY,tileSize:256};
 next.terrain=is3d?TERRAIN:undefined;next.sky=SKY;return next;}
let is3d=true;
const map=new maplibregl.Map({container:'map',style:{version:8,sources:{},layers:[]},...VIEW,maxPitch:80,attributionControl:{compact:true},canvasContextAttributes:{preserveDrawingBuffer:true},preserveDrawingBuffer:true,transformRequest:u=>({url:u})});
map.setStyle(STYLES[0],{transformStyle});
window.map=map;
const COL={novice:'#22c55e',easy:'#22c55e',intermediate:'#3b82f6',advanced:'#ef4444',expert:'#111111',freeride:'#f59e0b'};
const DN={novice:'Начинаещи',easy:'Лесна',intermediate:'Средна',advanced:'Трудна',expert:'Експертна',freeride:'Фрийрайд'};
const LN={chair_lift:'Седалков лифт',gondola:'Кабинков лифт',drag_lift:'Ски влек',platter:'Ски влек',rope_tow:'Въжен влек',magic_carpet:'Подвижна лента'};
let pistes=[],SKI=null,started=false;
function html(cls,inner){const e=document.createElement('div');e.className=cls;e.innerHTML=inner;return e;}
// OSM писти: само на Сателит и Топо (там MapTiler няма ски слой); на Зимна са от MapTiler
function addOverlay(){if(!SKI||map.getSource('ski'))return;map.addSource('ski',{type:'geojson',data:SKI});
 const P=['==',['get','kind'],'piste'],Lf=['==',['get','kind'],'lift'];
 map.addLayer({id:'pcase',type:'line',source:'ski',filter:P,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#0f172a','line-width':['interpolate',['linear'],['zoom'],12,5,16,11],'line-opacity':.8}});
 map.addLayer({id:'pistes',type:'line',source:'ski',filter:P,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['get','col'],'line-width':['interpolate',['linear'],['zoom'],12,3,16,7]}});
 if(mode===1)map.addLayer({id:'lifts',type:'line',source:'ski',filter:Lf,paint:{'line-color':'#fff','line-width':2.2}});}
map.on('idle',()=>{if(mode===1||mode===2)addOverlay();});
map.on('load',async()=>{document.querySelectorAll('.maplibregl-compact-show').forEach(e=>e.classList.remove('maplibregl-compact-show'));
 const g=await (await fetch('data/bansko.geojson')).json();g.features.forEach(f=>{if(f.properties.kind==='piste')f.properties.col=COL[f.properties.diff]||'#22c55e';});SKI=g;
 window.GR=await (await fetch('data/official-georef.json')).json();
 pistes=g.features.filter(f=>f.properties.kind==='piste'&&f.geometry.coordinates.length>6).map(f=>({c:f.geometry.coordinates,n:f.properties.name,d:f.properties.diff}));
 if(!started){started=true;startFriends();buildPano();}
});
// контроли
map.on('rotate',()=>$('needle').style.transform='rotate('+(-map.getBearing())+'deg)');
$('compass').onclick=()=>map.flyTo({...VIEW,duration:1500});
$('dim').onclick=()=>{is3d=!is3d;$('dim').textContent=is3d?'2D':'3D';map.setTerrain(is3d?TERRAIN:null);map.easeTo({pitch:is3d?62:0,bearing:is3d?map.getBearing():0,duration:900});};
const MODES=[['Зимна','❄'],['Сателит','🛰'],['Топо','🗺'],['Панорама','🏔']];let mode=0,styleIdx=0;
function setMode(i){mode=i;const pano=i===3;$('pano').classList.toggle('hidden',!pano);$('map').style.visibility=pano?'hidden':'visible';
 document.querySelectorAll('#modes button').forEach(b=>b.classList.toggle('on',+b.dataset.m===i));['dim','compass'].forEach(x=>$(x).style.visibility=pano?'hidden':'visible');
 $('style').textContent=MODES[i][1];if(pano){panoFit();return;}
 if(styleIdx!==i){styleIdx=i;map.setStyle(STYLES[i],{transformStyle,diff:false});}}
$('style').onclick=()=>{setMode((mode+1)%4);toast(MODES[mode][0]);};
document.querySelectorAll('#modes button').forEach(b=>b.onclick=()=>setMode(+b.dataset.m));
// моя позиция
let meM,last,t0=Date.now(),st=JSON.parse(localStorage.getItem('stats')||'{"d":0,"max":0,"v":0}'),alt=null;
const dist=(a,b)=>{const R=6371e3,r=Math.PI/180,dl=(b[1]-a[1])*r,dn=(b[0]-a[0])*r,x=Math.sin(dl/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x));};
function draw(sp){sp=Math.round(sp||0);$('sSpeed').textContent=$('mSpeed').textContent=sp;$('sMax').textContent=Math.round(st.max);$('sDist').textContent=(st.d/1000).toFixed(2);$('mDist').textContent=(st.d/1000).toFixed(1);$('sVert').textContent=Math.round(st.v);$('sAlt').textContent=alt!=null?Math.round(alt):'-';const m=Math.floor((Date.now()-t0)/60000);$('sTime').textContent=Math.floor(m/60)+':'+String(m%60).padStart(2,'0');}
draw(0);setInterval(()=>draw(+$('sSpeed').textContent),30000);
if('geolocation' in navigator)navigator.geolocation.watchPosition(p=>{const c=p.coords,ll=[c.longitude,c.latitude];alt=c.altitude;
 if(!meM)meM=new maplibregl.Marker({element:html('me','')}).setLngLat(ll).addTo(map);meM.setLngLat(ll);
 $('gps').textContent='GPS ±'+Math.round(c.accuracy)+' м';
 let sp=c.speed!=null&&c.speed>=0?c.speed*3.6:0;
 if(last&&c.accuracy<50){const dd=dist(last.ll,ll),dt=(p.timestamp-last.t)/1000;if(dd>3&&dt>0){if(c.speed==null)sp=dd/dt*3.6;if(sp<150){st.d+=dd;st.max=Math.max(st.max,sp);}if(c.altitude!=null&&last.alt!=null&&last.alt>c.altitude)st.v+=last.alt-c.altitude;}}
 if(c.accuracy<50||!last)last={ll,t:p.timestamp,alt:c.altitude};localStorage.setItem('stats',JSON.stringify(st));draw(sp);
},()=>{$('gps').textContent='Няма достъп до GPS';},{enableHighAccuracy:true,maximumAge:2000});
$('me').onclick=()=>meM?map.flyTo({center:meM.getLngLat(),zoom:15.5,pitch:60,duration:1800}):toast('Търсене на местоположение...');
$('reset').onclick=()=>{st={d:0,max:0,v:0};t0=Date.now();localStorage.setItem('stats',JSON.stringify(st));draw(0);toast('Сесията е нулирана');};
// симулирани приятели
const FR=[{n:'Мария Петрова',c:'#ec4899'},{n:'Иван Георгиев',c:'#f59e0b'},{n:'Татко',c:'#a855f7'},{n:'Ели',c:'#14b8a6'}];
const ini=n=>n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
function startFriends(){FR.forEach((f,i)=>{f.p=pistes[(i*5+2)%pistes.length];f.s=0;f.seen=Date.now()-i*40000;f.v=.6+Math.random()*.6;
  const el=html('fm','<div class="ring" style="--c:'+f.c+'"><div class="in">'+ini(f.n)+'</div></div><div class="tag">'+f.n.split(' ')[0]+'</div>');el.querySelector('.ring').style.background=f.c;
  el.onclick=e=>{e.stopPropagation();fly(f);};f.m=new maplibregl.Marker({element:el,anchor:'top',offset:[0,-24]}).setLngLat(f.p.c[0]).addTo(map);});
 let lt=performance.now();(function tick(t){const dt=(t-lt)/1000;lt=t;FR.forEach((f,i)=>{if(i===3&&(t/20000|0)%2)return;f.s+=dt*f.v*.25;if(f.s>=f.p.c.length-1){f.p=pistes[Math.floor(Math.random()*pistes.length)];f.s=0;}
  const k=Math.floor(f.s),a=f.p.c[k],b=f.p.c[k+1]||a,u=f.s-k;f.pos=[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u];f.m.setLngLat(f.pos);f.seen=Date.now();f.sp=Math.round(18+f.v*25);});requestAnimationFrame(tick);})(lt);
 setInterval(renderF,2000);renderF();}
let follow=null;map.on('dragstart',()=>follow=null);setInterval(()=>{if(follow&&!map.isMoving())map.easeTo({center:follow.pos,padding:{top:80,bottom:Math.min(innerHeight*.5,380)},duration:1000});},1200);
function fly(f){if(mode===3){panoCenter(f.pos);toast(f.n);return;}follow=f;map.flyTo({center:f.pos||f.m.getLngLat(),zoom:15.2,pitch:62,bearing:map.getBearing()+20,padding:{top:80,bottom:Math.min(innerHeight*.5,380)},duration:2200});toast(f.n+' - '+(f.p.n||'писта'));}
function ago(t){const s=Math.round((Date.now()-t)/1000);return s<10?'току-що':s<60?'преди '+s+' сек':'преди '+Math.round(s/60)+' мин';}
function renderF(){if($('t-friends').classList.contains('hidden')||!FR[0].m)return;$('flist').innerHTML='';FR.forEach(f=>{const li=document.createElement('li');
 li.innerHTML='<div class="av" style="background:'+f.c+'">'+ini(f.n)+'</div><div class="info"><b>'+f.n+'</b><small><span class="dot"></span>'+(f.p.n||'Писта без име')+' · '+(DN[f.p.d]||'')+'</small><small>'+f.sp+' км/ч · видян '+ago(f.seen)+'</small></div><span class="go">Покажи ›</span>';
 li.onclick=()=>fly(f);$('flist').appendChild(li);});}

// Панорама: проекция гео -> пиксел чрез TPS по контролни точки
const IMGW=2302,PW=1150;let pz={s:1,x:0,y:0},pmk=[];
function tps(w,X,q){let n=X.length,v=w[n]+w[n+1]*q[0]+w[n+2]*q[1];for(let i=0;i<n;i++){const d=Math.hypot(q[0]-X[i][0],q[1]-X[i][1]);if(d>0)v+=w[i]*d*d*Math.log(d);}return v;}
function geo2px(ll){if(!ll||!window.GR)return[0,0];if(!ll||!window.GR)return[0,0];const t=GR.tps,q=[(ll[0]-t.lon0)*t.kx/1000,(ll[1]-t.lat0)*t.ky/1000],k=PW/IMGW;return[tps(t.wx,t.X,q)*k,tps(t.wy,t.X,q)*k];}
function buildPano(){FR.forEach(f=>{const el=html('fm','<div class="ring" style="background:'+f.c+'"><div class="in">'+ini(f.n)+'</div></div><div class="tag">'+f.n.split(' ')[0]+'</div>');const w=document.createElement('div');w.appendChild(el);$('pmk').appendChild(w);w.onclick=()=>panoCenter(f.pos);pmk.push([w,()=>f.pos]);});
 const me=document.createElement('div');me.appendChild(html('me',''));$('pmk').appendChild(me);pmk.push([me,()=>meM&&meM.getLngLat().toArray()]);
 (function loop(){if(mode===3)pmk.forEach(([el,g])=>{const p=g();if(!p){el.style.display='none';return;}const [x,y]=geo2px(p);el.style.display='';el.style.left=x+'px';el.style.top=y+'px';el.style.transform='translate(-50%,-50%) scale('+(.75/pz.s)+')';});requestAnimationFrame(loop);})();}
function panoApply(){$('pinner').style.transform='translate('+pz.x+'px,'+pz.y+'px) scale('+pz.s+')';}
function panoFit(){const r=innerWidth/PW;pz.s=Math.max(r,.34);pz.x=(innerWidth-PW*pz.s)/2;pz.y=0;panoCenter([23.444,41.775],1.1);}
function panoCenter(ll,s){if(!ll)return;if(s)pz.s=s*innerWidth/PW;const [x,y]=geo2px(ll);pz.x=innerWidth/2-x*pz.s;pz.y=innerHeight*.3-y*pz.s;panoApply();}
(()=>{const el=$('pano'),pts=new Map();let st=null;
 el.addEventListener('pointerdown',e=>{el.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);st=null;});
 el.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;const prev=[...pts.values()];pts.set(e.pointerId,[e.clientX,e.clientY]);const cur=[...pts.values()];
  if(cur.length===1){pz.x+=cur[0][0]-prev[0][0];pz.y+=cur[0][1]-prev[0][1];}
  else if(cur.length===2){const d0=Math.hypot(prev[0][0]-prev[1][0],prev[0][1]-prev[1][1]),d1=Math.hypot(cur[0][0]-cur[1][0],cur[0][1]-cur[1][1]),cx=(cur[0][0]+cur[1][0])/2,cy=(cur[0][1]+cur[1][1])/2,k=d1/d0,ns=Math.min(Math.max(pz.s*k,.3),4);pz.x=cx-(cx-pz.x)*ns/pz.s;pz.y=cy-(cy-pz.y)*ns/pz.s;pz.s=ns;}panoApply();});
 const up=e=>pts.delete(e.pointerId);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
 el.addEventListener('wheel',e=>{e.preventDefault();const ns=Math.min(Math.max(pz.s*(e.deltaY<0?1.1:.9),.3),4);pz.x=e.clientX-(e.clientX-pz.x)*ns/pz.s;pz.y=e.clientY-(e.clientY-pz.y)*ns/pz.s;pz.s=ns;panoApply();},{passive:false});})();

// Presentation consumes snapshots only. Ball orientation comes from integrated q.
import {add,mul,rot,qm} from './math.js';import {pose,compileShape} from './geometry.js';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const f=x=>Number(x).toFixed(2),fmt=v=>v.map(x=>x.toFixed(2)).join('  ');
const cache=new WeakMap();
function prepared(c){if(!cache.has(c))cache.set(c,{...c,q:c.q||[0,0,0,1],v:c.v||[0,0,0],w:c.w||[0,0,0],epoch:0,shapes:c.shapes.map(compileShape)});return cache.get(c);}
export function frameAt(s,time){const frames=s.frames;let lo=0,hi=frames.length-1;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(frames[m].time<=time)lo=m;else hi=m-1;}let f=frames[lo];const e=(s.events||[]).filter(e=>e.time>=f.time&&e.time<=time&&e.velocity).at(-1);if(e)f={...f,mode:e.velocity[1]>.025?'AIRBORNE':f.mode,v:e.velocity,w:e.spin,p:e.position||(e.point?add(e.point,mul(e.normal,.11)):f.p)};return f;}

function projection(s,mode,W,H,focus){
 if(mode==='contact'){const scale=Math.min(W/2.8,H/2.6);return p=>[W/2+((p[0]-focus[0])+.4*(p[2]-focus[2]))*scale,H*.52+(.25*(p[2]-focus[2])-(p[1]-focus[1]))*scale,scale];}
 const xs=s.frames.map(f=>f.p[0]),zs=s.frames.map(f=>f.p[2]);const h=Math.max(1.6,...s.frames.map(f=>f.p[1]));
 let x0=Math.min(-.8,...xs),x1=Math.max(2.2,...xs),z0=Math.min(-1.5,...zs),z1=Math.max(1.5,...zs);
 if(s.id.includes('post')||s.id.includes('crossbar')){z0=Math.min(z0,-4.2);z1=Math.max(z1,4.2);}
 if(s.id==='tackle-loose'){x0=-1.2;x1=4;z0=-1.6;z1=5;}
 const center=[(x0+x1)/2,0,(z0+z1)/2];
 if(mode==='touchline'){
  // Exact CAMERA_V1 frozen basis from match.js buildFrozenBasis: height30,
  // distance43 beyond pitch width68, pitch22°, FOV28°. Only rail travel changes.
  const th=22*Math.PI/180,F=[0,-Math.sin(th),-Math.cos(th)],U=[0,Math.cos(th),-Math.sin(th)],C=[center[0],30,77],fp=(H/2)/Math.tan(14*Math.PI/180);
  return p=>{const v=[p[0]-C[0],p[1]-C[1],p[2]-C[2]],d=v[1]*F[1]+v[2]*F[2];return [W/2+fp*v[0]/d,H/2-fp*(v[1]*U[1]+v[2]*U[2])/d,fp/d];};
 }
 if(mode==='top'){
  const scale=Math.min((W-70)/(x1-x0),(H-90)/(z1-z0));return p=>[W/2+(p[0]-center[0])*scale,H/2+(p[2]-center[2])*scale,scale];
 }
 // Diagnostic is an orthographic close view. The extent is fixed for the clip,
 // never rescaled during contact; the same world metre always has the same size.
 const ext=(x1-x0)+.36*(z1-z0),scale=Math.min((W-70)/ext,(H-90)/(h+.32*(z1-z0)+.5));
 return p=>[W/2+((p[0]-center[0])+.36*(p[2]-center[2]))*scale,H*.72+(.26*(p[2]-center[2])-p[1])*scale,scale];
}
export function sceneSVG(s,time,{width=1000,height=560,camera='close',debug=true,comparison=null,label=null}={}){
 const b=frameAt(s,time),P=projection(s,camera,width,height,b.p),all=[],push=x=>all.push(x),pt=p=>P(p).slice(0,2).map(f).join(',');
 const line=(a,b,col,w=1,extra='')=>push(`<path d="M${pt(a)}L${pt(b)}" fill="none" stroke="${col}" stroke-width="${w}" ${extra}/>`);
 const poly=(ps,col,stroke='#d5f3e34a')=>push(`<polygon points="${ps.map(pt).join(' ')}" fill="${col}" stroke="${stroke}" stroke-width=".6"/>`);
 push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><radialGradient id="ball"><stop stop-color="#fff"/><stop offset=".7" stop-color="#e8f1ec"/><stop offset="1" stop-color="#87a99b"/></radialGradient></defs><rect width="100%" height="100%" fill="#122b27"/>`);
 // World metre grid and pitch stripe spacing. Not scaled to the football.
 const xmin=Math.floor(Math.min(...s.frames.map(x=>x.p[0])))-4,xmax=Math.ceil(Math.max(...s.frames.map(x=>x.p[0])))+4;
 const zmin=Math.floor(Math.min(...s.frames.map(x=>x.p[2]),-5))-2,zmax=Math.ceil(Math.max(...s.frames.map(x=>x.p[2]),5))+2;
 const stride=(xmax-xmin)>40?5:1;
 for(let x=xmin;x<=xmax;x+=stride)line([x,0,zmin],[x,0,zmax],'#64ad8b26',1);
 for(let z=zmin;z<=zmax;z+=stride)line([xmin,0,z],[xmax,0,z],'#64ad8b26',1);
 line([xmin,0,0],[xmax,0,0],'#bfe5cd55',1.2);
 const path=s.frames.filter((_,i)=>i%3===0&&s.frames[i].time<=time).map(x=>x.p);if(path.length>1)push(`<polyline points="${path.map(pt).join(' ')}" fill="none" stroke="#6fe6c3" stroke-width="2" opacity=".65"/>`);
 if(comparison){const old=comparison.frames.filter((_,i)=>i%3===0&&comparison.frames[i].time<=time).map(x=>x.p);push(`<polyline points="${old.map(pt).join(' ')}" fill="none" stroke="#efac78" stroke-width="2" stroke-dasharray="5 5"/>`);const p=P(frameAt(comparison,time).p);push(`<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${f(Math.max(2.2,.11*p[2]))}" fill="#efac78"/>`);}
 const objects=(s.colliders||[]).map(prepared);const polygons=[];
 for(const co of objects){const tr=pose(co,time);for(const sh of co.shapes){const q=qm(tr.q,sh.rot),o=add(tr.p,rot(tr.q,sh.pos)),wp=p=>add(o,rot(q,p));const col=co.material==='post'?'#e1ebe5':co.material==='boot'?'#e9b66a':'#6e9ece';
  if(sh.type==='hull'){for(const fc of sh.faces)polygons.push({ps:fc.points.map(wp),col});}
  else if(sh.type==='box'){const h=sh.he,vs=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(v=>wp(v.map((x,i)=>x*h[i])));for(const ids of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[0,3,7,4],[1,5,6,2]])polygons.push({ps:ids.map(i=>vs[i]),col});}
  else {const ra=sh.r??sh.rBot,rb=sh.r??sh.rTop,half=sh.half||0;const a=P(wp([0,-half,0])),b=P(wp([0,half,0]));
   push(`<path d="M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}" stroke="${col}" stroke-width="${f(2*Math.max(ra*a[2],rb*b[2]))}" stroke-linecap="round" opacity=".9"/>`);}
 }}
 polygons.sort((a,b)=>a.ps.reduce((s,p)=>s+p[2],0)/a.ps.length-b.ps.reduce((s,p)=>s+p[2],0)/b.ps.length);for(const x of polygons)poly(x.ps,x.col);
 const pp=P(b.p),shadow=P([b.p[0],0,b.p[2]]),R=.11*pp[2];push(`<ellipse cx="${f(shadow[0])}" cy="${f(shadow[1])}" rx="${f(Math.max(1,R*1.5))}" ry="${f(Math.max(1,R*.45))}" fill="#031912" opacity=".48"/>`);
 push(`<circle cx="${f(pp[0])}" cy="${f(pp[1])}" r="${f(Math.max(1.4,R))}" fill="url(#ball)" stroke="#d3efe2" stroke-width=".5"/>`);
 // Physical orientation: three fixed body-space panel dots, q-integrated.
 for(const n of [[1,0,0],[0,1,0],[0,0,1],[-1,0,0],[0,-1,0],[0,0,-1]]){const nn=rot(b.q||[0,0,0,1],n);if(nn[2]<-.1&&camera!=='top')continue;const d=P(add(b.p,mul(nn,.104)));push(`<circle cx="${f(d[0])}" cy="${f(d[1])}" r="${f(Math.max(.5,R*.19))}" fill="#183d34"/>`);}
 const recent=s.events.filter(e=>e.time<=time&&time-e.time<.65),event=recent.at(-1);
 if(debug){line(b.p,add(b.p,mul(b.v,.10)),'#72e8cb',2);line(b.p,add(b.p,mul(b.w,.009)),'#b5a2ff',2);
  if(event?.point){line(event.point,add(event.point,mul(event.normal,.65)),'#ffb96b',2.5);const p=P(event.point);push(`<circle cx="${f(p[0])}" cy="${f(p[1])}" r="5" fill="none" stroke="#ffb96b"/>`);}
 }
 push(`<rect x="18" y="16" width="${width-36}" height="58" rx="9" fill="#0b171bdf"/><text x="33" y="40" font-family="Arial,sans-serif" font-size="16" fill="#f0f5f2" font-weight="bold">${esc(label||s.title)}</text><text x="33" y="61" font-family="Arial,sans-serif" font-size="12" fill="#94b6a7">${width<500?'CONTACT CLOSE':camera==='touchline'?'TOUCHLINE CAMERA_V1 · 30 m / 22° / 28°':camera==='top'?'TOP VIEW · trajectory / deflection':camera==='contact'?'CONTACT CLOSE VIEW · follows physical ball':'TRAJECTORY OVERVIEW · physical collider geometry'} · t ${time.toFixed(3)} s</text>`);
 if(debug){const w=Math.min(width-36,660);push(`<rect x="18" y="${height-103}" width="${w}" height="86" rx="9" fill="#0b171be8"/><text x="32" y="${height-81}" font-family="monospace" font-size="12" fill="#d9eee4">p ${fmt(b.p)} m | ${b.mode||'LEGACY'}</text><text x="32" y="${height-60}" font-family="monospace" font-size="12" fill="#6fe6c3">v ${fmt(b.v)} m/s | slip ${(b.slip||0).toFixed(3)}</text><text x="32" y="${height-39}" font-family="monospace" font-size="12" fill="#b9a7ff">ω ${fmt(b.w||[0,0,0])} rad/s | spin ${(Math.hypot(...(b.w||[0,0,0]))/(2*Math.PI)).toFixed(2)} rev/s</text>`);}
 if(event){const launch=event.kind==='AUTHORITATIVE_LAUNCH',color=launch?'#6fe6c3':'#ffb96b',text=launch?'AUTHORITATIVE DELIBERATE LAUNCH':event.kind==='PHYSICAL_CONTACT'?`PHYSICAL COLLISION · ${event.collider} · J ${Math.hypot(...event.impulse).toFixed(3)} N·s`:event.kind;
  push(`<rect x="18" y="83" width="${width-36}" height="27" rx="5" fill="${color}"/><text x="30" y="101" font-family="Arial,sans-serif" font-size="12" font-weight="bold" fill="#0c211b">${esc(width<500?(launch?'AUTHORITATIVE LAUNCH':'PHYSICAL CONTACT · '+(event.collider||'')):text)}</text>`);}
 push('</svg>');return all.join('');
}

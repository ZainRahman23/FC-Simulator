import {touchlineProjection} from '../ballfeel1/camera.js';
export const COLORS={0:'#d3dde3',25:'#8dabb8',50:'#f3cf80',60:'#e1b563',70:'#aed98f',75:'#7ed9aa',80:'#61cfc0',85:'#6bbded',90:'#80b9ff',95:'#baa1ed',99:'#ed9cda'};
const f=(x,n=2)=>Number(x).toFixed(n),esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;'),xy=p=>p.slice(0,2).map(v=>f(v)).join(',');
function at(frames,t){let lo=0,hi=frames.length-1;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(frames[m].time<=t)lo=m;else hi=m-1;}return frames[lo];}
function camera(r,view,w,h){
 const o=r.scenario.origin,D=r.scenario.depth;
 if(view==='touchline'){const base=touchlineProjection(w,h,D/2);return p=>base([p[0]-o[0],p[1],p[2]-34]);}
 if(view==='top'){const scale=Math.min((w-120)/(D+3),(h-110)/21);return p=>[w/2+(p[0]-o[0]-D/2)*scale,h-60-(p[2]-o[2]+1)*scale,scale];}
 if(view==='goal')return p=>[w/2+(p[2]-34)*45,h*.70-p[1]*45,45];
 // Behind-shooter perspective, fixed identically across the rating comparison.
 const eye=[o[0]-8,4.2,o[2]-1],look=[105,1.0,34],norm=v=>{const l=Math.hypot(...v);return v.map(n=>n/l);},dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],forward=norm(look.map((v,i)=>v-eye[i])),right=norm(cross(forward,[0,1,0])),up=cross(right,forward);
 return p=>{const q=p.map((v,i)=>v-eye[i]),d=Math.max(1,dot(q,forward)),scale=480/d;return [w/2+dot(q,right)*scale,h*.5-dot(q,up)*scale,scale];};
}
function pane(r,t,{x=0,y=0,w=960,h=485,view='touchline',trail=false,clip='p'}={}){
 const frames=r.keeper?.frames??r.physical.frames,b=at(frames,t),g=b.keeper,P=camera(r,view,w,h),s=[],push=v=>s.push(v);
 const line=(a,b,c='#dfeddb88',width=1.2,dash='')=>push(`<path d="M${xy(P(a))}L${xy(P(b))}" stroke="${c}" stroke-width="${width}" fill="none" ${dash?`stroke-dasharray="${dash}"`:''}/>`);
 const circle=(p,rad,color,min=0)=>{const q=P(p);push(`<circle cx="${f(q[0])}" cy="${f(q[1])}" r="${f(Math.max(min,rad*q[2]))}" fill="${color}"/>`);};
 push(`<g transform="translate(${x},${y})"><defs><clipPath id="${clip}"><rect width="${w}" height="${h}" rx="12"/></clipPath></defs><g clip-path="url(#${clip})"><rect width="${w}" height="${h}" fill="#245a40"/>`);
 if(view!=='goal')for(let X=60;X<110;X+=5){const p=[[X,0,0],[X+5,0,0],[X+5,0,68],[X,0,68]].map(P);push(`<polygon points="${p.map(xy).join(' ')}" fill="${X%10?'#286345':'#2c694b'}"/>`);}
 line([105,0,0],[105,0,68]);
 for(const [depth,half] of [[16.5,20.16],[5.5,9.16]]){line([105-depth,0,34-half],[105-depth,0,34+half]);line([105-depth,0,34-half],[105,0,34-half]);line([105-depth,0,34+half],[105,0,34+half]);}
 if(view==='goal'){for(const z of [30.34,37.66])line([105,0,z],[105,2.44,z],'#ffffff',5);line([105,2.44,30.34],[105,2.44,37.66],'#ffffff',5);}
 else{
  for(const z of [30.34,37.66]){line([105,0,z],[105,2.44,z],'#f6f4e3',2.5);line([105,2.44,z],[107,1.9,z],'#e4ebdc66');line([107,1.9,z],[107,0,z],'#e4ebdc66');}
  line([105,2.44,30.34],[105,2.44,37.66],'#f6f4e3',2.5);line([107,1.9,30.34],[107,1.9,37.66],'#e4ebdc66');
  for(let z=30.34;z<37.67;z+=.61)line([105,2.44,z],[107,0,z],'#d6e7d522',.7);
 }
 if(trail){const ps=frames.filter((p,i)=>i%3===0&&p.time<=t).map(p=>P(p.p));push(`<polyline points="${ps.map(xy).join(' ')}" fill="none" stroke="${COLORS[r.curve]}" stroke-width="2" opacity=".8"/>`);}
 if(g){const root=g.root,hip=[root[0],g.height*.49,root[2]],shoulder=[root[0],g.height*.82,root[2]],scale=P(root)[2];
  circle(root,.22,'#183e3388');line([root[0],0,root[2]-.16],hip,'#59bfc8',Math.max(2,.12*scale));line([root[0],0,root[2]+.16],hip,'#59bfc8',Math.max(2,.12*scale));line(hip,shoulder,'#51b9c5',Math.max(3,.37*scale));line(shoulder,g.hand,'#cae5de',Math.max(2,.09*scale));circle(g.hand,.055,'#fff0a8',1.5);circle([root[0],g.height*.94,root[2]],.105,'#dfc3a0');if(g.leg)line([root[0],.15,root[2]],g.leg,'#59bfc8',Math.max(2,.14*scale));
 }
 if(view!=='goal'){const o=r.scenario.origin,root=[o[0]-.40,0,o[2]-.30],hip=[root[0],.88,root[2]],shoulder=[root[0]-.12,1.5,root[2]],scale=P(root)[2];line(root,hip,'#e4daca',.12*scale);line([o[0]+.15*Math.exp(-t*5),.12,o[2]],hip,'#e4daca',.12*scale);line(hip,shoulder,'#e5bd65',.36*scale);circle([shoulder[0],1.69,shoulder[2]],.12,'#dfc3a0');}
 circle([b.p[0],0,b.p[2]],.13,'#102e2577');circle(b.p,.11,'#fffbee',1.2);const bp=P(b.p);push(`<circle cx="${f(bp[0]+.025*bp[2])}" cy="${f(bp[1]-.02*bp[2])}" r="${f(Math.max(.4,.025*bp[2]))}" fill="#33524c"/>`);
 push(`</g><rect x="14" y="12" width="${view==='touchline'?230:300}" height="56" rx="8" fill="#102b24e8"/><text x="28" y="36" fill="${COLORS[r.curve]}" font-family="Arial" font-size="21" font-weight="bold">${r.curve} CURVE</text><text x="28" y="56" fill="#c6d4cb" font-family="Arial" font-size="13">${view==='touchline'?'Touchline · 1× camera scale':view==='top'?'Top-down · physical path':view==='behind'?'Behind shooter':'Goalkeeper-facing · orthographic'}</text>`);
 const ended=r.keeper&&t>=r.keeper.end.t;push(`<rect x="14" y="${h-40}" width="${w-28}" height="28" rx="6" fill="#102b24dc"/><text x="28" y="${h-21}" fill="#dae4d8" font-family="Arial" font-size="14">${f(Math.min(t,r.keeper?.end.t??t),2)} s · spin ${f(Math.abs(r.physical.action.spin[1]),2)} rad/s${ended?' · '+esc(r.keeper.outcome):''}</text></g>`);return s.join('');
}
function shell(title,subtitle,body,w=1920,h=1096){return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#10251f"/><text x="28" y="35" fill="#f3eedb" font-family="Arial" font-size="27" font-weight="bold">${esc(title)}</text><text x="28" y="61" fill="#b2cbbb" font-family="Arial" font-size="16">${esc(subtitle)}</text>${body}<text x="28" y="${h-15}" fill="#9fb9aa" font-family="Arial" font-size="13">CURVE-1 · 30 m/s at every rating · frozen Courtois · physical ball / keeper geometry proxies · no flight steering</text></svg>`;}
export function comparisonSVG(runs,scenario,mode,t,{ratings=[50,75,90,99]}={}){
 const rs=ratings.map(c=>runs.find(r=>r.scenario.id===scenario&&r.mode===mode&&r.curve===c));
 const body=rs.map((r,i)=>pane(r,t,{x:16+(i%2)*952,y:80+Math.floor(i/2)*493,w:936,h:477,clip:'p'+i})).join('');
 const footer=ratings.length===3?`<text x="1000" y="690" fill="#d4e2d6" font-size="25" font-family="Arial">Same launch. Different spin.</text><text x="1000" y="734" fill="#a9c5b3" font-size="18" font-family="Arial">0 → ${f(Math.abs(rs[1].physical.action.spin[1]))} → ${f(Math.abs(rs[2].physical.action.spin[1]))} rad/s</text><text x="1000" y="774" fill="#a9c5b3" font-size="18" font-family="Arial">${f(rs[0].aim.yawDeg)}° yaw · ${f(rs[0].aim.elevationDeg)}° elevation</text>`:'';
 return shell(`SCENARIO ${scenario} — ${ratings.join(' / ')} CURVE`,`${mode==='fixed'?'FIXED LAUNCH DIRECTION · Only Curve changes':'SAME FAR-CORNER TARGET · Initial direction solved before contact'} · synchronized contact · 1× playback`,body+footer);
}
export function diagnosticSVG(r,t){const body=['touchline','top','behind','goal'].map((view,i)=>pane(r,t,{x:16+(i%2)*952,y:80+Math.floor(i/2)*493,w:936,h:477,view,trail:true,clip:'d'+i})).join('');return shell(`SCENARIO ${r.scenario.id} — ${r.curve} CURVE · FOUR CAMERAS`,`Fixed launch · 0.5× diagnostic playback · trails show actual sampled positions`,body);}
export function overlaySVG(runs,scenario,{all=false}={}){
 const rs=runs.filter(r=>r.mode==='fixed'&&r.scenario.id===scenario&&(all||[0,50,75,90,99].includes(r.curve))),o=rs[0].scenario.origin,D=rs[0].scenario.depth,W=1200,H=700,L=85,R=950,T=85,B=610,X=x=>L+(x-o[0])/(D+1)*(R-L),Z=z=>B-(z-o[2]+1)/21*(B-T),s=[`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="1200" height="700" fill="#10251f"/><text x="44" y="38" fill="#f1ecdb" font-family="Arial" font-size="25">SCENARIO ${scenario} · fixed-launch physical trajectories</text><text x="44" y="65" fill="#aec8b9" font-family="Arial" font-size="15">Unopposed paths to goal plane · 240 Hz samples · identical initial velocity · no keeper/contact distortion</text>`];
 for(let d=0;d<=D;d+=5)s.push(`<path d="M${X(o[0]+d)} ${T}V${B}" stroke="#59756655"/><text x="${X(o[0]+d)}" y="${B+26}" fill="#c0d2c6" font-family="Arial" font-size="14">${d} m</text>`);
 for(let z=Math.ceil(o[2]);z<=42;z+=2)s.push(`<path d="M${L} ${Z(z)}H${R}" stroke="#59756633"/><text x="${L-12}" y="${Z(z)+5}" text-anchor="end" fill="#aac4b3" font-family="Arial" font-size="13">${z-o[2]} m</text>`);
 s.push(`<path d="M${X(105)} ${T}V${B}" stroke="#e9db9a88" stroke-dasharray="5 5"/><path d="M${X(105)} ${Z(30.34)}V${Z(37.66)}" stroke="#faf4dd" stroke-width="7"/>`);
 rs.forEach((r,i)=>{const ps=r.physical.frames.filter(f=>f.time<r.physical.plane.t).map(f=>[X(f.p[0]),Z(f.p[2])]);ps.push([X(105),Z(r.physical.plane.p[2])]);s.push(`<polyline points="${ps.map(xy).join(' ')}" stroke="${COLORS[r.curve]}" stroke-width="${all?2:3}" fill="none"/><text x="985" y="${110+i*(all?43:75)}" fill="${COLORS[r.curve]}" font-family="Arial" font-size="17">${r.curve} Curve</text><text x="985" y="${128+i*(all?43:75)}" fill="#afc7b8" font-family="Arial" font-size="13">${f(r.physical.metrics.goal.bend)} m bend</text>`);});
 s.push(`<text x="420" y="665" fill="#c0d2c6" font-family="Arial" font-size="15">Forward distance from contact</text><text x="42" y="690" fill="#8eab99" font-family="Arial" font-size="12">Lateral travel includes the shared aim angle; reported bend subtracts that initial tangent. Goal mouth shown white.</text></svg>`);return s.join('');
}

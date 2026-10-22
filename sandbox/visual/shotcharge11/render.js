// One fixed behind-shooter camera. The ball is native authoritative replay data.
export const WIDTH=1920,HEIGHT=1080;
export const CAMERA=Object.freeze({eye:[74,5.5,23],look:[105,1.6,34],focal:1450,principal:[960,300],width:WIDTH,height:HEIGHT});
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=v=>v.map(x=>x/Math.hypot(...v));
const forward=norm(CAMERA.look.map((v,i)=>v-CAMERA.eye[i])),right=norm(cross(forward,[0,1,0])),up=cross(right,forward);
export function project(p){const q=p.map((v,i)=>v-CAMERA.eye[i]),d=dot(q,forward),s=CAMERA.focal/Math.max(1,d);return [CAMERA.principal[0]+dot(q,right)*s,CAMERA.principal[1]-dot(q,up)*s,s,d];}
const f=(x,n=2)=>Number(x).toFixed(n),xy=p=>p.slice(0,2).map(v=>f(v)).join(',');
export function frameAt(frames,t){let lo=0,hi=frames.length-1;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(frames[m].time<=t)lo=m;else hi=m-1;}return frames[lo];}
export function behindSVG(run,t,comparison=null){
 const b=frameAt(run.frames,Math.max(0,t)),s=[];
 const line=(a,b,color='#ecf1d9a0',width=2)=>s.push(`<path d="M${xy(project(a))}L${xy(project(b))}" stroke="${color}" stroke-width="${f(width)}" fill="none" stroke-linecap="round"/>`);
 const circle=(p,r,color)=>{const q=project(p);s.push(`<circle cx="${f(q[0])}" cy="${f(q[1])}" r="${f(r*q[2])}" fill="${color}"/>`);};
 s.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><defs><radialGradient id="ball" cx="32%" cy="25%"><stop stop-color="#fffef5"/><stop offset=".75" stop-color="#e9eddf"/><stop offset="1" stop-color="#b8c2b7"/></radialGradient></defs><rect width="1920" height="1080" fill="#285e43"/>`);
 for(let x=80;x<195;x+=5){const corners=[[x,0,0],[x+5,0,0],[x+5,0,68],[x,0,68]];s.push(`<polygon points="${corners.map(p=>xy(project(p))).join(' ')}" fill="${x%10?'#2c6648':'#306d4c'}"/>`);}
 line([105,0,0],[105,0,68]);
 for(const [depth,half] of [[16.5,20.16],[5.5,9.16]]){line([105-depth,0,34-half],[105-depth,0,34+half]);line([105-depth,0,34-half],[105,0,34-half]);line([105-depth,0,34+half],[105,0,34+half]);}

 // Reference goal only: no net or goal colliders in this isolated range harness.
 for(const z of [30.34,37.66])line([105,0,z],[105,2.44,z],'#f7f5e6',4.3);
 line([105,2.44,30.34],[105,2.44,37.66],'#f7f5e6',4.3);
 for(const d of [5,10,15,19]){
  const x=86+d;line([x,.005,33.1],[x,.005,34.9],'#eff4dd70',1.5);
  const label=project([x,.005,36]);s.push(`<text x="${f(label[0])}" y="${f(label[1])}" fill="#e0ead6" font-family="Arial,sans-serif" font-size="${f(Math.max(12,.24*label[2]))}">${d} m</text>`);
 }
 // Illustrative shooter only; the measured contact occurs at the fixed ball origin.
 const o=run.initial.p,root=[o[0]-.4,0,o[2]-.3],hip=[root[0],.88,root[2]],shoulder=[root[0]-.12,1.5,root[2]],scale=project(root)[2],follow=Math.sin(Math.min(1,Math.max(0,t)/.18)*Math.PI/2);
 line([root[0],.05,root[2]-.09],hip,'#e0c6a1',.115*scale);
 line([o[0]+.4*follow,.10+.2*follow,o[2]],hip,'#e0c6a1',.115*scale);
 line([root[0]-.08,.045,root[2]-.09],[root[0]+.16,.045,root[2]-.09],'#243a35',.11*scale);
 line([o[0]+.4*follow,.09+.2*follow,o[2]],[o[0]+.16+.4*follow,.09+.2*follow,o[2]],'#243a35',.11*scale);
 line(hip,[root[0]-.03,1.03,root[2]],'#ece7d9',.33*scale);line([root[0]-.03,1.03,root[2]],shoulder,'#dfb45e',.37*scale);
 line([shoulder[0],1.40,shoulder[2]-.14],[root[0]-.14,1.0,root[2]-.36],'#e0c6a1',.09*scale);line([shoulder[0],1.40,shoulder[2]+.14],[root[0]+.12,1.13,root[2]+.31],'#e0c6a1',.09*scale);
 circle([shoulder[0],1.70,shoulder[2]],.12,'#e0c6a1');circle([shoulder[0]-.025,1.78,shoulder[2]],.087,'#393b31');
 const colors=['#e4b95e','#66d7e7','#ef879e','#b5a2f2','#e2ead8'];
 const drawBall=(r,color=null,index=0)=>{
  const fstate=frameAt(r.frames,Math.max(0,t));
  if(comparison&&t>0){
   const trace=r.frames.filter((f,i)=>i%3===0&&f.time>0&&f.time<=Math.min(t,r.metrics.firstLanding.time));
   if(trace.length)s.push(`<path d="M${trace.map(f=>xy(project(f.p))).join('L')}" fill="none" stroke="${color}" stroke-width="2.1" stroke-opacity=".62"/>`);
  }
  circle([fstate.p[0],0,fstate.p[2]],.13,'#123c2c66');
  const bp=project(fstate.p),rad=.11*bp[2],q=fstate.q??[0,0,0,1],angle=2*Math.atan2(q[2],q[3]);
  s.push(`<circle cx="${f(bp[0])}" cy="${f(bp[1])}" r="${f(rad)}" fill="url(#ball)" stroke="${color??'#f9f9e9'}" stroke-width="${color?2.4:.55}"/><ellipse cx="${f(bp[0]+Math.sin(angle)*rad*.45)}" cy="${f(bp[1]-rad*.15)}" rx="${f(rad*.24)}" ry="${f(rad*.24)}" fill="#405950"/>`);
  if(comparison&&t>.12)s.push(`<text x="${f(bp[0]+11)}" y="${f(bp[1]-10-index*2)}" fill="${color}" stroke="#1a402e" stroke-width="2.5" paint-order="stroke" font-family="Arial,sans-serif" font-size="19" font-weight="700">${r.shotPower}</text>`);
 };
 if(comparison)comparison.forEach((r,i)=>drawBall(r,colors[i],i));else drawBall(run);
 const apex=run.metrics.desiredApex.toFixed(2);
 if(comparison){
  s.push(`<rect x="38" y="34" width="605" height="124" rx="12" fill="#102c23e8"/><text x="62" y="75" fill="#f1ecdc" font-family="Arial,sans-serif" font-size="29" font-weight="700">${run.holdMs} ms · Target apex ${apex} m</text>`);
  comparison.forEach((r,i)=>s.push(`<circle cx="${68+i*112}" cy="122" r="5" fill="${colors[i]}"/><text x="${82+i*112}" y="130" fill="${colors[i]}" font-family="Arial,sans-serif" font-size="23" font-weight="700">${r.shotPower} SP</text>`));
 }else s.push(`<rect x="38" y="34" width="610" height="70" rx="12" fill="#102c23e8"/><text x="62" y="78" fill="#f1ecdc" font-family="Arial,sans-serif" font-size="28" font-weight="700">${run.shotPower} SP · ${run.holdMs} ms · Apex ${apex} m</text>`);
 s.push(`<text x="1882" y="1050" text-anchor="end" fill="#dfebd8" font-family="Arial,sans-serif" font-size="22">${comparison?'Synchronized physical replays · ':''}1× speed · Reference goal</text></svg>`);
 return s.join('');
}

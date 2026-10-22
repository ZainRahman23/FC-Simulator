// A single fixed behind-shooter camera. All ball/keeper positions are replay data.
export const WIDTH=1920,HEIGHT=1080;
export const CAMERA=Object.freeze({eye:[76,4.2,25],look:[105,1,34],focal:1450,principal:[960,260],width:WIDTH,height:HEIGHT});
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=v=>v.map(x=>x/Math.hypot(...v));
const forward=norm(CAMERA.look.map((v,i)=>v-CAMERA.eye[i])),right=norm(cross(forward,[0,1,0])),up=cross(right,forward);
export function project(p){const q=p.map((v,i)=>v-CAMERA.eye[i]),d=dot(q,forward),s=CAMERA.focal/Math.max(1,d);return [CAMERA.principal[0]+dot(q,right)*s,CAMERA.principal[1]-dot(q,up)*s,s,d];}
const f=(x,n=2)=>Number(x).toFixed(n),xy=p=>p.slice(0,2).map(v=>f(v)).join(',');
export function frameAt(frames,t){let lo=0,hi=frames.length-1;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(frames[m].time<=t)lo=m;else hi=m-1;}return frames[lo];}
export function behindSVG(run,t){
 const b=frameAt(run.keeper.frames,Math.max(0,t)),g=b.keeper,s=[];
 const line=(a,b,color='#ecf1d9a0',width=2)=>s.push(`<path d="M${xy(project(a))}L${xy(project(b))}" stroke="${color}" stroke-width="${f(width)}" fill="none" stroke-linecap="round"/>`);
 const circle=(p,r,color)=>{const q=project(p);s.push(`<circle cx="${f(q[0])}" cy="${f(q[1])}" r="${f(r*q[2])}" fill="${color}"/>`);};
 s.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><defs><radialGradient id="ball" cx="32%" cy="25%"><stop stop-color="#fffef5"/><stop offset=".75" stop-color="#e9eddf"/><stop offset="1" stop-color="#b8c2b7"/></radialGradient></defs><rect width="1920" height="1080" fill="#285e43"/>`);
 for(let x=80;x<145;x+=5){const corners=[[x,0,0],[x+5,0,0],[x+5,0,68],[x,0,68]];s.push(`<polygon points="${corners.map(p=>xy(project(p))).join(' ')}" fill="${x%10?'#2c6648':'#306d4c'}"/>`);}
 line([105,0,0],[105,0,68]);
 for(const [depth,half] of [[16.5,20.16],[5.5,9.16]]){line([105-depth,0,34-half],[105-depth,0,34+half]);line([105-depth,0,34-half],[105,0,34-half]);line([105-depth,0,34+half],[105,0,34+half]);}
 circle([94,0,34],.09,'#dce8cc');
 // Net and frame provide scale only; ball and goal contacts come from BALL-PHYS.
 s.push(`<polygon points="${[[107,0,30.34],[107,1.9,30.34],[107,1.9,37.66],[107,0,37.66]].map(p=>xy(project(p))).join(' ')}" fill="#142e2633"/>`);
 for(let z=30.34;z<37.67;z+=.3){line([107,0,z],[107,1.9,z],'#d9e7d540',.8);line([105,2.44,z],[107,1.9,z],'#d9e7d540',.8);}
 for(let y=0;y<=1.9;y+=.25)line([107,y,30.34],[107,y,37.66],'#d9e7d540',.8);
 for(const z of [30.34,37.66]){line([105,0,z],[107,0,z],'#e6ead755',1.5);line([105,2.44,z],[107,1.9,z],'#e6ead788',2);line([107,0,z],[107,1.9,z],'#e6ead788',2);line([105,0,z],[105,2.44,z],'#f7f5e6',4.3);}
 line([105,2.44,30.34],[105,2.44,37.66],'#f7f5e6',4.3);
 if(g){const root=g.root,hip=[root[0],g.height*.49,root[2]],shoulder=[root[0],g.height*.82,root[2]],scale=project(root)[2];
  circle(root,.23,'#143b2d66');
  for(const z of [-.16,.16])line([root[0],.06,root[2]+z],hip,'#42a5b4',.13*scale);
  line(hip,shoulder,'#4fb8c7',.38*scale);line(shoulder,g.hand,'#e8d2ad',.10*scale);circle(g.hand,.075,'#f9edb4');
  line([shoulder[0],shoulder[1]-.1,shoulder[2]-.15],[root[0],g.height*.56,root[2]-.28],'#e8d2ad',.09*scale);
  circle([root[0],g.height*.94,root[2]],.11,'#e2c39b');
  if(g.leg)line([root[0],.15,root[2]],g.leg,'#42a5b4',.14*scale);
 }
 // Illustrative shooter only; the measured contact occurs at the fixed ball origin.
 const o=run.scenario.origin,root=[o[0]-.4,0,o[2]-.3],hip=[root[0],.88,root[2]],shoulder=[root[0]-.12,1.5,root[2]],scale=project(root)[2],follow=Math.sin(Math.min(1,Math.max(0,t)/.18)*Math.PI/2);
 line([root[0],.05,root[2]-.09],hip,'#e0c6a1',.115*scale);
 line([o[0]+.4*follow,.10+.2*follow,o[2]],hip,'#e0c6a1',.115*scale);
 line([root[0]-.08,.045,root[2]-.09],[root[0]+.16,.045,root[2]-.09],'#243a35',.11*scale);
 line([o[0]+.4*follow,.09+.2*follow,o[2]],[o[0]+.16+.4*follow,.09+.2*follow,o[2]],'#243a35',.11*scale);
 line(hip,[root[0]-.03,1.03,root[2]],'#ece7d9',.33*scale);line([root[0]-.03,1.03,root[2]],shoulder,'#dfb45e',.37*scale);
 line([shoulder[0],1.40,shoulder[2]-.14],[root[0]-.14,1.0,root[2]-.36],'#e0c6a1',.09*scale);line([shoulder[0],1.40,shoulder[2]+.14],[root[0]+.12,1.13,root[2]+.31],'#e0c6a1',.09*scale);
 circle([shoulder[0],1.70,shoulder[2]],.12,'#e0c6a1');circle([shoulder[0]-.025,1.78,shoulder[2]],.087,'#393b31');
 circle([b.p[0],0,b.p[2]],.13,'#123c2c66');
 const bp=project(b.p),rad=.11*bp[2],q=b.q??[0,0,0,1],angle=2*Math.atan2(q[1],q[3]);
 s.push(`<circle cx="${f(bp[0])}" cy="${f(bp[1])}" r="${f(rad)}" fill="url(#ball)" stroke="#f9f9e9" stroke-width=".55"/><ellipse cx="${f(bp[0]+Math.sin(angle)*rad*.45)}" cy="${f(bp[1]-rad*.15)}" rx="${f(rad*.24)}" ry="${f(rad*.24)}" fill="#405950"/>`);
 s.push(`<rect x="38" y="34" width="208" height="66" rx="12" fill="#102c23e8"/><text x="62" y="78" fill="#f1ecdc" font-family="Arial,sans-serif" font-size="31" font-weight="700">${run.curve} CURVE</text></svg>`);
 return s.join('');
}

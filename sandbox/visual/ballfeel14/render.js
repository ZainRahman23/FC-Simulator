import {feelSVG} from '../ballfeel1/render.js';import {closeSVG} from '../ballfeel13/render.js';import {touchlineProjection} from '../ballfeel1/camera.js';import {frameAt} from '../ballphys1/render.js';import {runnerPosition} from './experiments.js';import {RUNNER} from './config.js';
export {closeSVG};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),n=(v,d=2)=>Number(v).toFixed(d),colors=['#93a8a0','#edc76c','#75d7be'];
export function laneSVG(s,t,{width=1280,height=450,ghost=true,zoom=1.7}={}){
 let svg=feelSVG(s,t,{width,height,label:false});const b=frameAt(s,t),P=touchlineProjection(width,height,s.target/2),parts=[];
 if(ghost&&s.definition?.family==='through'){
  const x=runnerPosition(t),p=P([x,0,1.4]),hip=P([x,.8,1.4]),neck=P([x,1.4,1.4]),head=P([x,1.68,1.4]),left=P([x-.18,0,1.4]),right=P([x+.18,0,1.4]);
  parts.push(`<path d="M${left[0]} ${left[1]}L${hip[0]} ${hip[1]}L${right[0]} ${right[1]}M${hip[0]} ${hip[1]}L${neck[0]} ${neck[1]}" stroke="#ffcf78" stroke-width="${p[2]*.18}" fill="none" opacity=".8"/><circle cx="${head[0]}" cy="${head[1]}" r="${p[2]*.12}" fill="#ffcf78"/><text x="${p[0]}" y="${head[1]-18}" fill="#ffe3b0" text-anchor="middle" font-size="13">SPRINT ghost</text>`);
  const a=P([RUNNER.zone[0],0,-1]),z=P([RUNNER.zone[1],0,-1]);parts.push(`<path d="M${a[0]} ${a[1]}L${z[0]} ${z[1]}" stroke="#f4d47c" stroke-width="4" opacity=".7"/>`);
 }
 svg=svg.replace('</svg>',parts.join('')+'</svg>');parts.length=0;
 if(zoom!==1){const start=svg.indexOf('>')+1,body=svg.slice(start,-6);svg=svg.slice(0,start)+`<g transform="translate(${width/2*(1-zoom)} ${height/2*(1-zoom)}) scale(${zoom})">${body}</g></svg>`;}
 parts.push(`<text x="20" y="30" fill="#f0f3dc" font-family="Arial" font-size="18">${n(t)} s · ${n(b.p[0],1)} m · ${n(Math.hypot(b.v[0],b.v[2]),1)} m/s</text><text x="20" y="${height-20}" fill="#c1d4c6" font-family="Arial" font-size="14">${b.mode} · physical bottom clearance ${n(Math.max(0,b.p[1]-.11)*100,1)} cm</text>`);
 return svg.replace('</svg>',parts.join('')+'</svg>');
}
export function chartSVG(rows,refs,{kind='time',family='through',width=1000,height=350}={}){
 const L=62,R=width-24,T=50,B=height-48,W=R-L,H=B-T,heightPlot=kind==='height',distance=kind!=='time',xMax=distance?(family==='through'?55:30):(family==='through'?4:3),yMax=heightPlot?Math.max(.10,...rows.map(r=>r.metrics.apex*1.15)):['through','ground'].includes(family)?26:42;
 const X=x=>L+x/xMax*W,Y=y=>B-y/yMax*H,a=[`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#102d26"/><text x="${L}" y="26" fill="#f0ecd7" font-family="Arial" font-size="17">${heightPlot?'Ball-bottom clearance vs distance':distance?'Horizontal speed vs distance':'Horizontal speed vs time'}</text>`];
 if(family==='through'){
  // Distance thirds belong to the disclosed 25 m lane. Time markers use A's
  // observed plane crossings, not invented source-camera timing.
  const selected=rows.find(r=>r.definition?.variant==='A')??rows[0],at=x=>selected.frames.find(f=>f.p[0]>=x)?.time??xMax;
  const zoneStart=distance?20:at(20),zoneEnd=distance?31:at(31);
  a.push(`<rect x="${X(zoneStart)}" y="${T}" width="${X(zoneEnd)-X(zoneStart)}" height="${H}" fill="#d4c17b" opacity=".08"/><text x="${X((zoneStart+zoneEnd)/2)}" y="${T+16}" fill="#baa974" text-anchor="middle" font-size="11">${distance?'receiver zone':'A in receiver zone'}</text>`);
  [25/3,50/3,25].forEach((d,i)=>{const x=distance?d:at(d);a.push(`<path d="M${X(x)} ${T}V${B}" stroke="#b5a76866" stroke-dasharray="4 6"/><text x="${X(x)+4}" y="${T+32}" fill="#baa974" font-size="10">${['1/3','2/3','25 m'][i]}${distance?'':' · A'}</text>`);});
 }
 for(let j=0;j<=4;j++){const v=yMax*j/4;a.push(`<path d="M${L} ${Y(v)}H${R}" stroke="#2d4a40"/><text x="${L-9}" y="${Y(v)+4}" fill="#aec2b5" text-anchor="end" font-size="12">${n(heightPlot?v*100:v,heightPlot?1:0)}</text>`);}for(let j=0;j<=5;j++){const v=xMax*j/5;a.push(`<text x="${X(v)}" y="${B+21}" fill="#aec2b5" text-anchor="middle" font-size="12">${n(v,1)}</text>`);}
 if(heightPlot&&['through','ground'].includes(family)){const end=family==='through'?25:13;a.push(`<rect x="${X(0)}" y="${Y(.08)}" width="${X(end)-X(0)}" height="${Y(0)-Y(.08)}" fill="#c6c9cb" opacity=".11"/><text x="${X(.5)}" y="${Y(.075)}" fill="#c3ceca" font-size="11">Reference: 0–8 cm visual envelope; NOT measured heights or contact times</text>`);}
 else if(family==='through'&&!heightPlot){
  const seg=refs.through.speedSegments,points=seg.map(p=>[distance?p.distance:p.t,p.low,p.high]);const band=[...points.map(p=>`${X(p[0])},${Y(p[2])}`),...points.slice().reverse().map(p=>`${X(p[0])},${Y(p[1])}`)].join(' ');a.push(`<polygon points="${band}" fill="#d6dde0" opacity=".18"/>`);for(const p of seg)a.push(`<circle cx="${X(distance?p.distance:p.t)}" cy="${Y(p.speed)}" r="4" fill="#dce4df"/>`);
 } else if(family==='ground'&&!heightPlot){a.push(`<rect x="${X(0)}" y="${Y(23)}" width="${X(distance?2:.12)-X(0)}" height="${Y(16)-Y(23)}" fill="#e8ece4" opacity=".22"/><text x="${X(distance?3:.2)}" y="${Y(23)}" fill="#c3ceca" font-size="11">Reference launch estimate 16–23 m/s · arrival 10–17 m/s</text>`);}
 rows.forEach((s,i)=>{const launch=s.events.find(e=>e.kind==='AUTHORITATIVE_LAUNCH'),source=!heightPlot&&launch?[{time:launch.time,p:launch.position,v:launch.velocity},...s.frames.filter(f=>f.time>launch.time)]:s.frames,frames=source.filter(f=>(distance?f.p[0]:f.time)<=xMax),pts=frames.map(f=>`${X(distance?f.p[0]:f.time)},${Y(heightPlot?Math.max(0,f.p[1]-.11):Math.hypot(f.v[0],f.v[2]))}`).join(' ');a.push(`<polyline points="${pts}" fill="none" stroke="${colors[i]}" stroke-width="2.4"/>`);if(heightPlot)for(const e of s.impacts.filter(e=>e.x<=xMax))a.push(`<circle cx="${X(e.x)}" cy="${Y(0)}" r="${3+i*.5}" fill="${colors[i]}"/>`);});a.push(`<text x="${width/2}" y="${height-8}" text-anchor="middle" fill="#bdcec1" font-size="12">${distance?'forward distance (m)':'time (s)'} · ${heightPlot?'height axis in cm, exaggerated vertically':'speed axis in m/s'} · grey CURRENT / gold A / mint B</text></svg>`);return a.join('');
}
export function runnerSVG(rows,{width=1000,height=350}={}){
 const L=62,R=width-24,T=45,B=height-45,X=t=>L+t/4*(R-L),Y=x=>B-x/55*(B-T),a=[`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#102d26"/><text x="${L}" y="25" fill="#ede8cd" font-size="17">Runner window · world distance vs time</text><rect x="${L}" y="${Y(31)}" width="${R-L}" height="${Y(20)-Y(31)}" fill="#eacb78" opacity=".08"/>`];
 for(const y of [0,10,20,30,40,50])a.push(`<path d="M${L} ${Y(y)}H${R}" stroke="#2b493f"/><text x="${L-10}" y="${Y(y)+4}" fill="#b5c6b9" text-anchor="end" font-size="12">${y} m</text>`);
 rows.forEach((r,i)=>a.push(`<polyline points="${r.frames.filter(f=>f.time<=4).map(f=>`${X(f.time)},${Y(f.p[0])}`).join(' ')}" stroke="${colors[i]}" stroke-width="2.5" fill="none"/>`));
 for(const speed of [5,6.5,8.2]){const pts=Array.from({length:81},(_,i)=>`${X(i/20)},${Y(runnerPosition(i/20,speed))}`).join(' ');a.push(`<polyline points="${pts}" stroke="#c3b6ed" stroke-dasharray="5 5" opacity="${speed/8.2}" fill="none"/><text x="${X(3.75)}" y="${Y(runnerPosition(3.75,speed))-8}" fill="#c3b6ed" font-size="12">${speed} m/s</text>`);}
 for(const r of rows)for(const hit of r.runner??[])if(hit.runnerSpeed===8.2&&hit.catchAt&&hit.catchAt.time<4)a.push(`<circle cx="${X(hit.catchAt.time)}" cy="${Y(hit.catchAt.distance)}" r="6" fill="none" stroke="#fff" stroke-width="2"/>`);a.push(`<text x="${width/2}" y="${height-10}" text-anchor="middle" fill="#bdcec1" font-size="12">0–4 seconds · dashed = runner envelope · circles = sprint catch window · ball continues under physics</text></svg>`);return a.join('');
}

import {frameAt,sceneSVG} from '../ballphys1/render.js';
import {rot} from '../ballphys1/math.js';
import {touchlineProjection} from './camera.js';
const fmt=n=>Number(n).toFixed(2),esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
export function feelSVG(s,time,{width=1280,height=720,debug=false,camera='touchline',label=true}={}){
 const view=s.displayFrames?{...s,frames:s.displayFrames,events:s.displayEvents}:s;
 if(camera!=='touchline')return sceneSVG(view,time,{width,height,camera,debug,label:s.title});
 const b=frameAt(view,time),D=s.target||15,center=D/2;
 // CAMERA_V1: exact frozen match basis. Same rail position / field scale for
 // every candidate in this action. Never zoom to make a slower ball look fast.
 const P=touchlineProjection(width,height,center);
 const a=[],push=x=>a.push(x),pt=p=>P(p).slice(0,2).map(fmt).join(',');
 const line=(x,y,col='#d2ead08a',w=1.3,extra='')=>push(`<path d="M${pt(x)}L${pt(y)}" fill="none" stroke="${col}" stroke-width="${w}" ${extra}/>`);
 const poly=(ps,color,stroke='none')=>push(`<polygon points="${ps.map(pt).join(' ')}" fill="${color}" stroke="${stroke}"/>`);
 push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><radialGradient id="b"><stop stop-color="#fff"/><stop offset="1" stop-color="#cddbd4"/></radialGradient></defs><rect width="100%" height="100%" fill="#183c30"/>`);
 const shot=!!s.colliders?.some(c=>c.material==='post'),right=shot?D:center+52.5,left=right-105;
 for(let x=left;x<right;x+=7.5)poly([[x,0,-34],[Math.min(right,x+7.5),0,-34],[Math.min(right,x+7.5),0,34],[x,0,34]],Math.round((x-left)/7.5)%2?'#286b49':'#2b704d');
 for(const z of [-34,34])line([left,0,z],[right,0,z]);for(const x of [left,right])line([x,0,-34],[x,0,34]);
 if(shot){for(const [depth,half] of [[16.5,20.16],[5.5,9.16]]){line([D-depth,0,-half],[D-depth,0,half]);line([D-depth,0,-half],[D,0,-half]);line([D-depth,0,half],[D,0,half]);}const spot=P([D-11,0,0]);push(`<circle cx="${fmt(spot[0])}" cy="${fmt(spot[1])}" r="1.7" fill="#d1e8ce"/>`);}
 else {line([D,0,-3],[D,0,3],'#e5e5ad',1.8,'stroke-dasharray="7 7"');const p=P([D,0,3.4]);push(`<text x="${fmt(p[0])}" y="${fmt(p[1]+15)}" text-anchor="middle" font-family="Arial" font-size="13" fill="#e6f2d6">${D} m receiving plane</text>`);}
 // Scale mannequins are visual references only, offset from the ball corridor.
 function mannequin(x,z,color){const p=P([x,0,z]),head=P([x,1.68,z]),neck=P([x,1.43,z]),hip=P([x,.85,z]),L=P([x-.17,0,z]),R=P([x+.17,0,z]);push(`<ellipse cx="${fmt(p[0])}" cy="${fmt(p[1])}" rx="${fmt(p[2]*.36)}" ry="${fmt(p[2]*.12)}" fill="#163e31"/>`);push(`<path d="M${L[0]},${L[1]}L${hip[0]},${hip[1]}L${R[0]},${R[1]} M${hip[0]},${hip[1]}L${neck[0]},${neck[1]}" fill="none" stroke="${color}" stroke-width="${fmt(p[2]*.21)}" stroke-linecap="round"/>`);push(`<circle cx="${fmt(head[0])}" cy="${fmt(head[1])}" r="${fmt(p[2]*.125)}" fill="${color}"/>`);}
 mannequin(-.55,1.3,'#b9d7c7');if(!shot)mannequin(D,2,'#c9cba8');else mannequin(D+.5,5,'#b9d7c7');
 if(shot){for(const z of [-3.66,3.66]){const p=P([D,0,z]);line([D,0,z],[D,2.44,z],'#edf1de',Math.max(1,.12*p[2]));}line([D,2.44,-3.66],[D,2.44,3.66],'#edf1de',Math.max(1,.12*P([D,2.44,0])[2]));}
 if(debug){line([0,0,0],[D,0,0],'#e6e5b78a',1,'stroke-dasharray="5 5"');const trail=view.frames.filter((f,i)=>i%2===0&&f.time<=time).map(f=>pt(f.p));push(`<polyline points="${trail.join(' ')}" fill="none" stroke="#a3eac9" stroke-width="1.5" opacity=".7"/>`);}
 const p=P(b.p),sh=P([b.p[0],0,b.p[2]]),r=.11*p[2];push(`<ellipse cx="${fmt(sh[0])}" cy="${fmt(sh[1])}" rx="${fmt(r*1.15)}" ry="${fmt(r*.42)}" fill="#0c291f" opacity=".7"/><circle cx="${fmt(p[0])}" cy="${fmt(p[1])}" r="${fmt(r)}" fill="url(#b)" stroke="#fff" stroke-width=".4"/>`);
 for(const n of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const q=rot(b.q??[0,0,0,1],n);if(q[2]<0)continue;const d=P(b.p.map((v,i)=>v+q[i]*.102));push(`<circle cx="${fmt(d[0])}" cy="${fmt(d[1])}" r="${fmt(r*.22)}" fill="#264337"/>`);}
 if(label){push(`<rect x="24" y="24" width="${width-48}" height="66" rx="8" fill="#0c211bd9"/><text x="42" y="51" font-family="Arial" font-size="19" font-weight="bold" fill="#f3f5e9">${esc(s.title)} · ${D} m · ${esc(s.candidate??'physical ball')}</text><text x="42" y="74" font-family="Arial" font-size="12" fill="#b5c8bb">TOUCHLINE CAMERA · 30 m height / 22° pitch / 28° FOV · 1× · ${time.toFixed(2)} s</text>`);}
 if(debug){const v=Math.hypot(...b.v),spin=Math.hypot(...(b.w??[0,0,0]))/(2*Math.PI);push(`<rect x="24" y="${height-66}" width="${width-48}" height="42" rx="7" fill="#0c211be8"/><text x="42" y="${height-40}" font-family="monospace" font-size="15" fill="#d9e6d5">${esc(b.mode??'LEGACY')} · speed ${v.toFixed(2)} m/s · spin ${spin.toFixed(2)} rev/s · height ${(b.p[1]-.11).toFixed(2)} m</text>`);}
 push('</svg>');return a.join('');
}

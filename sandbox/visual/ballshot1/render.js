import {feelSVG} from '../ballfeel1/render.js';
import {frameAt} from '../ballphys1/render.js';
import {goal} from '../ballphys1/fixtures.js';
import {rot,sub,dot,cross,norm} from '../ballphys1/math.js';

export const colors={INSIDE:'#ecc36e',OUTSIDE:'#9ddcce',LACES:'#e7eee3',POWER:'#ee9b79',CHIP:'#bcb0ed'};
export const fmt=(v,d=2)=>v==null?'—':Number(v).toFixed(d);
export const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const xy=v=>v.slice(0,2).map(n=>fmt(n)).join(',');
const speed=f=>Math.hypot(...f.v);
export function shotFrame(s,t){return t<0?{...s.frames[0],v:[0,0,0],w:[0,0,0],q:[0,0,0,1]}:frameAt(s,t);}
function camera(s,mode,W,H){
 const D=s.target??19;
 if(mode==='contact'){const scale=Math.min(W/3.8,H/2.7);return p=>[W*.56+p[0]*scale,H*.81-p[1]*scale+p[2]*scale*.15,scale];}
 if(mode==='side'){const scale=Math.min((W-100)/38,(H-125)/13);return p=>[65+(p[0]+2)*scale,H-72-p[1]*scale,scale];}
 const eye=mode==='behind'?[-9,2.3,0]:[D+9,2.8,0],aim=mode==='behind'?[D,1.2,0]:[0,1.1,0],F=norm(sub(aim,eye)),R=norm(cross(F,[0,1,0])),U=cross(R,F),focal=W/(2*Math.tan(31*Math.PI/180));
 return p=>{const v=sub(p,eye),depth=dot(v,F);if(depth<=.2)return [NaN,NaN,0];return [W/2+focal*dot(v,R)/depth,H*.56-focal*dot(v,U)/depth,focal/depth];};
}
// This pose is a timing illustration. It never supplies a collider, force or
// launch value. The striking toe reaches the authoritative ball contact at t=0.
function footPose(t,prepare){
 const u=Math.max(0,Math.min(1,(t+prepare)/prepare));
 const x=t<0?-.23-.68*Math.sin(Math.PI*(1-u)/2):-.23+Math.min(.55,t*4);
 return [x,.11+(t>0?Math.min(.25,t*.9):.15*Math.sin(Math.PI*u)),0];
}
function diagnostic(s,t,{width:W,height:H,view,trail}){
 const b=shotFrame(s,t),D=s.target??19,P=camera(s,view,W,H),a=[],color=colors[s.definition?.family]??'#e5d18e';
 const push=x=>a.push(x),line=(p,q,c='#d5e5d277',w=1.2,dash='')=>{const x=P(p),y=P(q);if(!Number.isFinite(x[0]+y[0]))return;push(`<path d="M${xy(x)}L${xy(y)}" stroke="${c}" stroke-width="${w}" fill="none" ${dash?'stroke-dasharray="'+dash+'"':''}/>`);};
 const point=(p,r,fill,extra='')=>{const v=P(p);if(Number.isFinite(v[0]))push(`<circle cx="${fmt(v[0])}" cy="${fmt(v[1])}" r="${fmt(Math.max(.8,r*v[2]))}" fill="${fill}" ${extra}/>`);};
 push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#143b2d"/>`);
 for(let x=-4;x<=40;x+=5)line([x,0,-10],[x,0,10],'#6f9e7130');
 for(let z=-10;z<=10;z+=2)line([-4,0,z],[40,0,z],'#6f9e7130');
 line([0,0,0],[Math.min(36,D+5),0,0],'#c6d7b34d',1,'5 7');
 if(view!=='contact'){
  for(const z of [-3.66,3.66]){line([D,0,z],[D,2.44,z],'#f1eedc',Math.max(2,.12*P([D,1,z])[2]));line([D,0,z],[D+2,0,z],'#b7ccbe66');line([D+2,0,z],[D+2,2.44,z],'#b7ccbe66');}
  line([D,2.44,-3.66],[D,2.44,3.66],'#f1eedc',Math.max(2,.12*P([D,2.44,0])[2]));
  for(let z=-3.66;z<=3.67;z+=.61)line([D+2,0,z],[D+2,2.44,z],'#bdccc128',.8);
  for(let y=0;y<=2.45;y+=.61)line([D+2,y,-3.66],[D+2,y,3.66],'#bdccc128',.8);
  if(view==='side')for(const x of [0,5,10,15,19,25,30,35]){const p=P([x,0,0]);push(`<text x="${p[0]}" y="${p[1]+23}" text-anchor="middle" fill="#c0cfba" font-size="12">${x} m</text>`);}
 }
 const prepare=s.action?.metadata?.prepareSeconds??s.action?.metadata?.preparationSeconds??.3;
 const toe=footPose(t,prepare),hip=[-.55,.87,.28],neck=[-.58,1.42,.28],head=[-.58,1.68,.28],knee=[-.52,.49,.05];
 line([-.65,0,.49],hip,'#c1d6c5',Math.max(2,.15*P(hip)[2]));line(hip,neck,'#c1d6c5',Math.max(2,.23*P(hip)[2]));line(hip,knee,'#c1d6c5',Math.max(2,.13*P(hip)[2]));line(knee,toe,color,Math.max(2,.10*P(knee)[2]));point(head,.12,'#dbe2cb');
 line([toe[0]-.13,toe[1],0],[toe[0]+.12,toe[1],0],color,Math.max(3,.14*P(toe)[2]));
 if(trail&&t>=0){const pts=s.frames.filter((f,i)=>i%3===0&&f.time<=t).map(f=>P(f.p)).filter(p=>Number.isFinite(p[0])).map(xy);push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" opacity=".6" stroke-width="1.8"/>`);}
 const pp=P(b.p),shadow=P([b.p[0],0,b.p[2]]);
 if(Number.isFinite(pp[0])){
  push(`<ellipse cx="${fmt(shadow[0])}" cy="${fmt(shadow[1])}" rx="${fmt(Math.max(1,.13*shadow[2]))}" ry="${fmt(Math.max(.7,.04*shadow[2]))}" fill="#071e17" opacity=".75"/>`);
  point(b.p,.11,'#fbf9e9','stroke="#fff" stroke-width=".5"');
  for(const v of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const q=rot(b.q??[0,0,0,1],v);if(q[2]<0)continue;point(b.p.map((x,i)=>x+q[i]*.1),.022,'#264a3c');}
 }
 if(t>=0&&t<.07){const p=P([-.11,.11,0]);push(`<circle cx="${fmt(p[0])}" cy="${fmt(p[1])}" r="${fmt(.22*p[2])}" stroke="${color}" stroke-width="1.5" fill="none" opacity="${1-t/.07}"/>`);}
 const label={side:'SIDE · equal metre scale',behind:'BEHIND SHOOTER',goal:'GOAL-FACING',contact:'CONTACT TIMING · visual boot only'}[view];
 push(`<text x="24" y="30" fill="#e7ecda" font-family="Arial" font-size="17">${label}</text>`);
 if(view==='contact')push(`<text x="24" y="${H-80}" fill="#bbccb7" font-size="12">Toe/ball contact at t=0. Resolver owns launch; pose has no authority. Ball leaves this fixed close view.</text>`);
 push('</svg>');return a.join('');
}
export function shotSVG(s,t,{width=1280,height=720,view='touchline',trail=false,overlay=true}={}){
 let svg;
 if(view==='touchline'){
  // Goal here is presentation-only. Plane metrics use unobstructed physical
  // travel; actual post/crossbar response is covered by frozen regressions.
  const visible={...s,colliders:goal(s.target??19),events:t<0?[]:s.events};
  svg=feelSVG(visible,Math.max(0,t),{width,height,label:false,debug:trail});
 }else svg=diagnostic(s,t,{width,height,view,trail});
 if(!overlay)return svg;
 const b=shotFrame(s,t),c=colors[s.definition?.family]??'#e5d18e',prep=s.action?.metadata?.prepareSeconds??s.action?.metadata?.preparationSeconds??.3;
 const label=t<0?(t<-prep?'WAITING FOR SETUP':'PREPARING · '+fmt(-t)+' s to contact'):t<.07?'AUTHORITATIVE CONTACT':`${fmt(t)} s after contact · ${fmt(speed(b),1)} m/s · ${fmt(Math.max(0,b.p[1]-.11),2)} m clearance`;
 return svg.replace('</svg>',`<rect x="18" y="${height-60}" width="${width-36}" height="42" rx="4" fill="#0b211cdd"/><text x="32" y="${height-33}" fill="${c}" font-family="Arial" font-size="16">${esc(label)}</text></svg>`);
}
export function profileSVG(rows,{kind='height',width=1000,height=330}={}){
 const L=65,R=width-25,T=48,B=height-52,X=x=>L+x/35*(R-L),max=kind==='height'?14:kind==='lateral'?4:55,min=kind==='lateral'?-4:0,Y=y=>B-(y-min)/(max-min)*(B-T),a=[];
 const labels={height:'Ball-bottom height vs distance',speed:'Ball speed vs distance',lateral:'Lateral bend vs distance'};
 a.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#102a23"/><text x="${L}" y="26" fill="#e8eddb" font-size="17">${labels[kind]}</text>`);
 a.push(`<defs><clipPath id="profile-clip"><rect x="${L}" y="${T}" width="${R-L}" height="${B-T}"/></clipPath></defs>`);
 for(let i=0;i<=4;i++){const v=min+(max-min)*i/4;a.push(`<path d="M${L} ${Y(v)}H${R}" stroke="#2c4839"/><text x="${L-10}" y="${Y(v)+4}" fill="#a8c0ad" font-size="12" text-anchor="end">${fmt(v,1)}</text>`);}
 for(const x of [0,5,10,15,19,25,30,35])a.push(`<text x="${X(x)}" y="${B+23}" fill="#b8c7b8" font-size="12" text-anchor="middle">${x}</text>`);
 a.push(`<path d="M${X(19)} ${T}V${B}" stroke="#e9d5a255" stroke-dasharray="4 6"/><text x="${X(19)+6}" y="${T+14}" fill="#c7ba8f" font-size="11">19 m plane</text>`);
 rows.forEach((s,i)=>{const color=rows.every(r=>r.definition.family===s.definition.family)?['#8da89a','#edc66e','#ee9c7f'][i%3]:colors[s.definition.family],launch={time:0,p:[0,.11,0],v:s.action.velocity},points=[launch,...s.frames.filter((f,j)=>j%2===0&&f.time>0&&f.p[0]<=35)].map(f=>`${X(f.p[0])},${Y(kind==='height'?Math.max(0,f.p[1]-.11):kind==='lateral'?f.p[2]:speed(f))}`).join(' ');a.push(`<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" clip-path="url(#profile-clip)"/>`);});
 a.push(`<text x="${width/2}" y="${height-9}" text-anchor="middle" fill="#b9c8b7" font-size="12">Forward distance (m) · ${kind==='height'?'height (m), vertically exaggerated in plot only':kind==='lateral'?'lateral offset (m), existing frozen Magnus':'speed (m/s)'}</text></svg>`);return a.join('');
}

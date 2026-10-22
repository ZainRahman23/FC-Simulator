import {BallWorld} from '../ballfeel14/world.js';
import {scheduledLaunch} from '../ballshot11/resolver.js';
import {cellOf} from './config.js';
import {FAMILIES as SHOT} from '../ballshot11/config.js';
export {BallWorld};
export function crossing(a,b,x){if(!(a.p[0]<x&&b.p[0]>=x))return null;const u=(x-a.p[0])/(b.p[0]-a.p[0]),mix=(a,b)=>a+(b-a)*u;return {t:mix(a.time,b.time),p:a.p.map((v,i)=>mix(v,b.p[i])),v:a.v.map((v,i)=>mix(v,b.v[i])),w:a.w.map((v,i)=>mix(v,b.w[i]))};}
export function launch(family,origin,yaw,elevation,foot='R'){return scheduledLaunch({family,shotPower:80,bracket:'fast',charge:1,aim:{yawDeg:yaw,elevationDeg:elevation},attributes:{preferredFoot:foot},context:{selectedFoot:foot}},{position:origin});}
export function freeFlight(action,{record=false,duration=4,colliders=[],stopAtWhole=true,stopAtLanding=false,measurePlanes=[]}={}){
 const world=new BallWorld({p:action.position,colliders});world.schedule(action);const planes={};let prev=world.snapshot(),plane=null,whole=null,landing=null,apex=.11,frames=record?[prev]:null;
 world.onSubstep=f=>{for(const x of measurePlanes)if(!planes[x])planes[x]=crossing(prev,f,x);if(record)frames.push(f);apex=Math.max(apex,f.p[1]);if(!plane)plane=crossing(prev,f,105);if(!whole)whole=crossing(prev,f,105.11);prev=f;};
 for(let i=0;i<duration*60;i++){world.step();if(whole&&!record&&stopAtWhole)break;if(stopAtLanding&&world.events.some(e=>e.kind==='PHYSICAL_CONTACT'&&e.collider==='turf'))break;}
 landing=world.events.find(e=>e.kind==='PHYSICAL_CONTACT'&&e.collider==='turf');
 return {plane,whole,planes,landing:landing?{t:landing.time,p:landing.point}:null,apex,frames,events:record?world.events:null};
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Aim is solved entirely before launch at fixed family speed/spin/charge. The
// low rising/descending branch nearest the approved family elevation is used.
export function solveAim(family,origin,lateral,height,{foot='R',initial=null,tolerance=.00003,maxIterations=14}={}){
 let yaw=initial?.yaw??(Math.atan2(34+lateral-origin[2],105-origin[0])*180/Math.PI+SHOT[family].yawDeg*(foot==='R'?1:-1)),elevation=initial?.elevation??SHOT[family].angleDeg,best=null,calls=0;
 const run=(y,e)=>{calls++;const action=launch(family,origin,y,e,foot),f=freeFlight(action);return {action,...f,yaw:y,elevation:e};};
 for(let i=0;i<maxIterations;i++){
  const r=run(yaw,elevation);if(!r.plane){elevation=Math.max(.1,elevation-3);continue;}
  const a=r.plane.p[2]-34-lateral,b=r.plane.p[1]-height,error=Math.hypot(a,b);if(!best||error<best.error)best={...r,error,iterations:i+1};if(error<tolerance)break;
  const dy=.025,de=.025,ry=run(clamp(yaw+dy,-74.9,74.9),elevation),re=run(yaw,clamp(elevation+de,.01,74.9));if(!ry.plane||!re.plane)break;
  const A=(ry.plane.p[2]-r.plane.p[2])/dy,B=(re.plane.p[2]-r.plane.p[2])/de,C=(ry.plane.p[1]-r.plane.p[1])/dy,D=(re.plane.p[1]-r.plane.p[1])/de,det=A*D-B*C;
  if(Math.abs(det)<1e-7){elevation+=.8;continue;}
  yaw=clamp(yaw-clamp((D*a-B*b)/det,-8,8),-74.9,74.9);elevation=clamp(elevation-clamp((-C*a+A*b)/det,-4,4),.01,74.9);
 }
 // Near first landing, the height surface is continuous but not smooth; a
 // Newton step can straddle the bounce. Bracket that same physical surface.
 if(!best||best.error>=tolerance){
  const aligned=e=>{let y=yaw,r;for(let k=0;k<5;k++){r=run(y,e);if(!r.plane)return null;const err=r.plane.p[2]-34-lateral;if(Math.abs(err)<1e-8)break;const q=run(y+.02,e);if(!q.plane)break;const d=(q.plane.p[2]-r.plane.p[2])/.02;if(Math.abs(d)<1e-8)break;y=clamp(y-err/d,-74.8,74.8);}return r;};
  let last=null;const brackets=[];
  for(let e=Math.max(.01,SHOT[family].angleDeg-18);e<=Math.min(74,SHOT[family].angleDeg+14);e+=.4){const r=aligned(e);if(r?.plane){r.residual=r.plane.p[1]-height;if(last&&last.residual*r.residual<=0)brackets.push([last,r]);last=r;}}
  brackets.sort((a,b)=>Math.abs((a[0].elevation+a[1].elevation)/2-SHOT[family].angleDeg)-Math.abs((b[0].elevation+b[1].elevation)/2-SHOT[family].angleDeg));
  for(let [a,b] of brackets){for(let k=0;k<28;k++){const r=aligned((a.elevation+b.elevation)/2);if(!r?.plane)break;const residual=r.plane.p[1]-height,error=Math.hypot(r.plane.p[2]-34-lateral,residual);if(!best||error<best.error)best={...r,error,iterations:maxIterations+k+1,fallback:'bracketed physical aim surface'};if(error<tolerance)break;r.residual=residual;if(a.residual*residual<=0)b=r;else a=r;}if(best?.error<tolerance)break;}
 }
 // The fixed-step bounce surface can have millimetre discontinuities. A real
 // trajectory within 2 cm and the SAME measured grid cell is a legitimate
 // placement; retain its exact error and bin its actual crossing. Never snap.
 const subcell=best&&best.error<.02&&JSON.stringify(cellOf(best.plane))===JSON.stringify(cellOf({p:[105,height,34+lateral]}));
 return best?{...best,calls,solved:best.error<tolerance||subcell,aimPrecision:best.error<tolerance?'exact solve':'physical same-cell approximation'}: {solved:false,calls,error:null};
}

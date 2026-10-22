import {chargeRange} from './range-capability.mjs';

// Provisional intent geometry only. No ability, RNG or physics enters selection.
export const TARGET_ASSISTANCE=Object.freeze({version:'PASS-TARGET-9-provisional',
 SHORT:Object.freeze({widthLimit:6,distanceScale:18,minDistance:.5,maxDistance:60,fullHoldMs:350,depthNear:8,depthFar:40,depthExponent:1.2,directionWeight:3,depthWeight:1,switchMargin:.025}),
 CROSS:Object.freeze({widthLimit:9,distanceScale:22,minDistance:5,maxDistance:90,fullHoldMs:550,depthNear:10,depthFar:70,depthExponent:2,directionWeight:2,depthWeight:1,switchMargin:.025})});
export const corridorWidth=(family,d)=>TARGET_ASSISTANCE[family].widthLimit*(-Math.expm1(-d/TARGET_ASSISTANCE[family].distanceScale));
export function preferredDepth(family,holdMs){
 const c=TARGET_ASSISTANCE[family];if(!c||!Number.isFinite(holdMs)||holdMs<0)throw Error('Valid assistance family and hold required');
 const q=Math.max(0,Math.min(1,holdMs/c.fullHoldMs));
 return {holdMs,q,preferred:c.depthNear+(c.depthFar-c.depthNear)*q**c.depthExponent,fullHoldMs:c.fullHoldMs,near:c.depthNear,far:c.depthFar,exponent:c.depthExponent};
}
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
const vector=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);
export function rawAimTarget(i){
 if(!vector(i.origin)||!vector(i.aimPoint))throw Error('Finite passer and aim positions required');
 const d=distance(i.origin,i.aimPoint);if(d<.5)throw Error('Aim at least 0.5 m away');
 if(i.family!=='CROSS'||i.manualTargetMode==='point')return i.aimPoint.slice();
 const range=i.requestedDistance??chargeRange('CROSS',i.holdMs,i.attributes.shot_power);
 return [i.origin[0]+(i.aimPoint[0]-i.origin[0])*range/d,.11,i.origin[2]+(i.aimPoint[2]-i.origin[2])*range/d];
}
export function selectPassTarget(i){
 if(!TARGET_ASSISTANCE[i.family])return null;
 const c=TARGET_ASSISTANCE[i.family],depth=preferredDepth(i.family,i.holdMs),rawTarget=rawAimTarget(i),d=distance(i.origin,i.aimPoint),ux=(i.aimPoint[0]-i.origin[0])/d,uz=(i.aimPoint[2]-i.origin[2])/d,ids=new Set();
 const candidates=(i.candidates??[i.receiver]).map(r=>{
  if(!r||typeof r.id!=='string'||!r.id||r.id==='__manual_target__'||ids.has(r.id))throw Error('Unique teammate IDs required');ids.add(r.id);
  if(!vector(r.position)||!vector(r.velocity)||Math.hypot(...r.velocity)>12)throw Error('Invalid teammate position or velocity');
  const dx=r.position[0]-i.origin[0],dz=r.position[2]-i.origin[2],range=Math.hypot(dx,dz),forward=dx*ux+dz*uz,lateral=-dx*uz+dz*ux,width=corridorWidth(i.family,range),angle=Math.atan2(lateral,forward)*180/Math.PI;
  const alignment=width>0?Math.abs(lateral)/width:Infinity,directionCost=c.directionWeight*alignment**2,depthCost=range>0?c.depthWeight*Math.log(range/depth.preferred)**2:Infinity;
  return {id:r.id,receiver:structuredClone(r),distance:range,forward,perpendicular:Math.abs(lateral),signedPerpendicular:lateral,angleDeg:angle,width,eligible:forward>0&&range>=c.minDistance&&range<=c.maxDistance&&Math.abs(lateral)<=width+1e-9,
   alignment,directionCost,depthCost,score:Math.round((directionCost+depthCost)*1e9)/1e9};
 });
 // Continuous alignment/depth cost; quantized numerical ties use angle then ID.
 const ranked=candidates.filter(r=>r.eligible).sort((a,b)=>a.score-b.score||Math.round(Math.abs(a.angleDeg)*1e9)-Math.round(Math.abs(b.angleDeg)*1e9)||(a.id<b.id?-1:a.id>b.id?1:0));
 const best=ranked[0]??null,previous=ranked.find(r=>r.id===i.assistancePreviousId),retained=!!(previous&&best&&previous.id!==best.id&&previous.score<=best.score+c.switchMargin);
 const chosen=retained?previous:best;
 return {version:TARGET_ASSISTANCE.version,family:i.family,targetMode:chosen?'RECEIVER':'MANUAL',selectedId:chosen?.id??null,receiver:chosen?.receiver??null,
  rawTarget,assistedTarget:chosen?.receiver.position.slice()??rawTarget.slice(),rawDirection:[ux,0,uz],rawRange:distance(i.origin,rawTarget),candidates,depth,
  geometry:c,scoreRule:'directionWeight × u² + ln(receiver distance / preferred depth)²; u = perpendicular / corridor radius; angle then stable ID tie-break',
  hysteresis:{previousId:i.assistancePreviousId??null,bestId:best?.id??null,retained,margin:c.switchMargin,units:'dimensionless score',rule:'retain previous only while eligible and within score margin of best; no expanded exit corridor'},
  rangeIntentRule:i.family==='CROSS'?'Receiver lock requests receiver distance, then Shot Power caps physical range. Manual uses raw charge range or explicit aim point.':'Receiver lock uses existing moving-receiver lead and pace. Manual uses a stationary point.'};
}
export function assistInput(i){
 if(!i.targetAssistance||!TARGET_ASSISTANCE[i.family])return {input:i,assistance:null};
 const assistance=selectPassTarget(i),receiver=assistance.receiver??{id:'__manual_target__',position:assistance.rawTarget.slice(),velocity:[0,0,0]};
 const input={...structuredClone(i),targetAssistance:false,receiver:structuredClone(receiver),candidates:[structuredClone(receiver)],aimPoint:assistance.assistedTarget.slice()};
 if(i.family==='CROSS'){input.requestedDistance=distance(i.origin,assistance.assistedTarget);if(input.requestedDistance<5)throw Error('Manual Cross target is too close for this aerial lab. Aim at least 5 m away; use Short Pass for nearby feet.');}
 return {input,assistance};
}

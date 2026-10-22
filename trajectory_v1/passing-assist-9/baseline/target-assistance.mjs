import {chargeRange} from './range-capability.mjs';

// Provisional intent geometry only. No ability, RNG or physics enters selection.
export const TARGET_ASSISTANCE=Object.freeze({version:'PASS-TARGET-8-provisional',
 SHORT:Object.freeze({widthLimit:3,distanceScale:18,minDistance:.5,maxDistance:60,switchMargin:.20}),
 CROSS:Object.freeze({widthLimit:4.5,distanceScale:22,minDistance:5,maxDistance:90,switchMargin:.30})});
export const corridorWidth=(family,d)=>TARGET_ASSISTANCE[family].widthLimit*(-Math.expm1(-d/TARGET_ASSISTANCE[family].distanceScale));
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
 const c=TARGET_ASSISTANCE[i.family],rawTarget=rawAimTarget(i),d=distance(i.origin,rawTarget),ux=(rawTarget[0]-i.origin[0])/d,uz=(rawTarget[2]-i.origin[2])/d,ids=new Set();
 const candidates=(i.candidates??[i.receiver]).map(r=>{
  if(!r||typeof r.id!=='string'||!r.id||r.id==='__manual_target__'||ids.has(r.id))throw Error('Unique teammate IDs required');ids.add(r.id);
  if(!vector(r.position)||!vector(r.velocity)||Math.hypot(...r.velocity)>12)throw Error('Invalid teammate position or velocity');
  const dx=r.position[0]-i.origin[0],dz=r.position[2]-i.origin[2],range=Math.hypot(dx,dz),forward=dx*ux+dz*uz,lateral=-dx*uz+dz*ux,width=corridorWidth(i.family,range),angle=Math.atan2(lateral,forward)*180/Math.PI;
  return {id:r.id,receiver:structuredClone(r),distance:range,forward,perpendicular:Math.abs(lateral),signedPerpendicular:lateral,angleDeg:angle,width,eligible:forward>0&&range>=c.minDistance&&range<=c.maxDistance&&Math.abs(lateral)<=width,
   score:Math.round(Math.abs(lateral)*1e6)/1e6};
 });
 // Perpendicular miss is primary; absolute angle then stable ID resolve ties.
 const ranked=candidates.filter(r=>r.eligible).sort((a,b)=>a.score-b.score||Math.abs(a.angleDeg)-Math.abs(b.angleDeg)||(a.id<b.id?-1:a.id>b.id?1:0));
 const best=ranked[0]??null,previous=ranked.find(r=>r.id===i.assistancePreviousId),retained=!!(previous&&best&&previous.id!==best.id&&previous.perpendicular<=best.perpendicular+c.switchMargin);
 const chosen=retained?previous:best;
 return {version:TARGET_ASSISTANCE.version,family:i.family,targetMode:chosen?'RECEIVER':'MANUAL',selectedId:chosen?.id??null,receiver:chosen?.receiver??null,
  rawTarget,assistedTarget:chosen?.receiver.position.slice()??rawTarget.slice(),rawDirection:[ux,0,uz],rawRange:d,candidates,
  geometry:c,scoreRule:'minimum perpendicular metres; then absolute angle; then stable ID',
  hysteresis:{previousId:i.assistancePreviousId??null,bestId:best?.id??null,retained,margin:c.switchMargin,rule:'retain previous only while eligible and within margin of best; no expanded exit corridor'},
  rangeIntentRule:i.family==='CROSS'?'Receiver lock requests receiver distance, then Shot Power caps physical range. Manual uses raw charge range or explicit aim point.':'Receiver lock uses existing moving-receiver lead and pace. Manual uses a stationary point.'};
}
export function assistInput(i){
 if(!i.targetAssistance||!TARGET_ASSISTANCE[i.family])return {input:i,assistance:null};
 const assistance=selectPassTarget(i),receiver=assistance.receiver??{id:'__manual_target__',position:assistance.rawTarget.slice(),velocity:[0,0,0]};
 const input={...structuredClone(i),targetAssistance:false,receiver:structuredClone(receiver),candidates:[structuredClone(receiver)],aimPoint:assistance.assistedTarget.slice()};
 if(i.family==='CROSS'){input.requestedDistance=distance(i.origin,assistance.assistedTarget);if(input.requestedDistance<5)throw Error('Manual Cross target is too close for this aerial lab. Aim at least 5 m away; use Short Pass for nearby feet.');}
 return {input,assistance};
}

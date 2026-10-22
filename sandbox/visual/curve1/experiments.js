import {BallWorld} from './world.js';
import {crossing} from '../gkshotmap1/aim.js';
import {runShot} from './keeper-simulation.js';
import {scheduledLaunch} from './resolver.js';
import {COURTOIS,RATINGS,PRIMARY,SCENARIOS} from './config.js';
export {BallWorld};
const deg=180/Math.PI,len=v=>Math.hypot(...v);
export function launch(s,curve,aim){return scheduledLaunch({family:'INSIDE',shotPower:90,charge:1,attributes:{curve,preferredFoot:'R'},context:{selectedFoot:'R'},aim},{position:s.origin});}
export function trace(action,{duration=2.2}={}){
 const w=new BallWorld({p:action.position});w.launch(action);const frames=[w.snapshot()];
 let previous=frames[0],plane=null,whole=null;const checkpoints={};
 w.onSubstep=f=>{for(const d of [5,10,15,20,25,30])if(!checkpoints[d])checkpoints[d]=crossing(previous,f,action.position[0]+d);if(!plane)plane=crossing(previous,f,105);if(!whole)whole=crossing(previous,f,105.11);frames.push(f);previous=f;};
 for(let i=0;i<Math.ceil(duration*60);i++)w.step();
 const pre=frames.filter(f=>f.time<=(plane?.t??duration)),landing=w.events.find(e=>e.kind==='PHYSICAL_CONTACT'&&e.collider==='turf');
 const yaw=Math.atan2(action.velocity[2],action.velocity[0]),bend=p=>p?p.p[2]-action.position[2]-Math.tan(yaw)*(p.p[0]-action.position[0]):null;
 let maxLateralAcceleration=0,maxWorldZAcceleration=0,maxTurnStep=0,minForward=Infinity,maxHeadingDeviation=0;const curvature=[];
 for(let i=1;i<pre.length;i++){
  const a=pre[i-1],b=pre[i],h=b.time-a.time,ax=(b.v[0]-a.v[0])/h,az=(b.v[2]-a.v[2])/h,vx=(a.v[0]+b.v[0])/2,vz=(a.v[2]+b.v[2])/2,vh=Math.hypot(vx,vz),an=(vx*az-vz*ax)/vh;
  const heading=Math.atan2(b.v[2],b.v[0]),old=Math.atan2(a.v[2],a.v[0]);maxLateralAcceleration=Math.max(maxLateralAcceleration,Math.abs(an));maxWorldZAcceleration=Math.max(maxWorldZAcceleration,Math.abs(az));maxTurnStep=Math.max(maxTurnStep,Math.abs(heading-old)*deg);minForward=Math.min(minForward,b.v[0]);maxHeadingDeviation=Math.max(maxHeadingDeviation,Math.abs(heading-yaw)*deg);
  curvature.push({t:b.time,forward:b.p[0]-action.position[0],normalAcceleration:an,curvature:an/(vh*vh),spin:len(b.w),headingDeg:heading*deg});
 }
 const point=p=>p?{time:p.t,position:p.p,velocity:p.v,speed:len(p.v),spin:p.w,spinMagnitude:len(p.w),bend:bend(p),beforeLanding:!landing||p.t<landing.time}:null;
 return {action,plane,whole,landing:landing?{t:landing.time,p:landing.point}:null,apex:Math.max(...pre.map(f=>f.p[1])),frames,events:w.events,stats:w.stats,
  metrics:{launchSpeed:len(action.velocity),initialSpin:action.spin,spinAxis:action.metadata.spinAxis,checkpoints:Object.fromEntries(Object.entries(checkpoints).map(([d,p])=>[d,point(p)])),goal:point(plane),apexCenter:Math.max(...pre.map(f=>f.p[1])),maxLateralAcceleration,maxWorldZAcceleration,maxTurnStepDegrees:maxTurnStep,minForwardVelocity:minForward,maxHeadingDeviationDegrees:maxHeadingDeviation,
   finite:frames.every(f=>[...f.p,...f.v,...f.w,...f.q].every(Number.isFinite)),reversed:minForward<=0,preGoalTurfContact:!!landing&&landing.time<(plane?.t??duration),curvature}
 };
}
// Pure pre-contact physical aiming. No keeper, save result or rating-dependent
// tolerance enters this solve. Every rating uses the same target and precision.
export function solveTarget(s,curve,{anchorSpin=null}={}){
 const spin=anchorSpin===null?Math.abs(launch(s,curve,{yawDeg:0,elevationDeg:13}).spin[1]):anchorSpin*(curve/75)**2.7;
 // Spin-aware initial guess only, then the same physical Newton solve for all.
 // This avoids starting a high-spin search on a post-bounce height branch.
 let yaw=Math.atan2(s.target[2]-s.origin[2],s.depth)*deg-spin*s.depth*.007,elevation=s.depth>23?15:13,best=null;
 const run=(y,e)=>{const a=launch(s,curve,{yawDeg:y,elevationDeg:e});if(anchorSpin!==null){a.spin=[0,-anchorSpin*(curve/75)**2.7,0];a.metadata.spinAxis=[0,-1,0];}return trace(a,{duration:1.8});};
 for(let iteration=0;iteration<22;iteration++){
  const r=run(yaw,elevation);if(!r.plane)throw Error('Aim path did not reach goal plane');
  const dz=r.plane.p[2]-s.target[2],dy=r.plane.p[1]-s.target[1],error=Math.hypot(dz,dy);best={...r,aim:{yawDeg:yaw,elevationDeg:elevation},target:s.target,error,iterations:iteration+1};if(error<.00001)return best;
  const h=.02,a=run(yaw+h,elevation),b=run(yaw,elevation+h),A=(a.plane.p[2]-r.plane.p[2])/h,B=(b.plane.p[2]-r.plane.p[2])/h,C=(a.plane.p[1]-r.plane.p[1])/h,D=(b.plane.p[1]-r.plane.p[1])/h,det=A*D-B*C;
  if(Math.abs(det)<1e-8)throw Error('Degenerate aim Jacobian');
  yaw-=Math.max(-6,Math.min(6,(D*dz-B*dy)/det));elevation-=Math.max(-3,Math.min(3,(-C*dz+A*dy)/det));
 }
 throw Error('Aim failed '+JSON.stringify({scenario:s.id,curve,error:best.error}));
}
export function outcomeFlags(r){return {goal:r.goal,save:r.saved,catch:r.contacts.some(c=>c.held),parry:r.contacts.some(c=>!c.held),contactButGoal:r.goal&&r.contacts.length>0,miss:!r.goal&&!r.saved&&!r.frameHit,postOrCrossbar:r.frameHit};}
export function makeReview(){
 const runs=[],fixedAims=[];
 for(const s of SCENARIOS){
  const reference=solveTarget(s,75);fixedAims.push({scenario:s.id,aim:reference.aim,referenceCurve:75,target:s.target,error:reference.error,method:'Unopposed physical prelaunch solve; fixed unchanged for all ratings'});
  for(const curve of RATINGS){const physical=trace(launch(s,curve,reference.aim));const keeper=PRIMARY.includes(curve)||curve===0?runShot(physical,{profile:COURTOIS,record:true}):null;runs.push({id:`${s.id}-fixed-${curve}`,scenario:s,curve,mode:'fixed',aim:reference.aim,physical,keeper,flags:keeper?outcomeFlags(keeper):null});}
  for(const curve of PRIMARY){const physical=solveTarget(s,curve),keeper=runShot(physical,{profile:COURTOIS,record:true});runs.push({id:`${s.id}-targeted-${curve}`,scenario:s,curve,mode:'targeted',aim:physical.aim,aimError:physical.error,physical,keeper,flags:outcomeFlags(keeper)});}
 }
 return {fixedAims,runs};
}

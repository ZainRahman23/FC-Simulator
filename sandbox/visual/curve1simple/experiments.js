import {BallWorld} from '../curve1/world.js';
import {scheduledLaunch} from '../curve1/resolver.js';
import {crossing} from '../gkshotmap1/aim.js';
import {runShot} from '../curve1/keeper-simulation.js';
import {COURTOIS,RATINGS,SCENARIO,SHOT_POWER} from './config.js';
export {BallWorld};
const deg=180/Math.PI,len=v=>Math.hypot(...v);

// Every velocity/power/execution field comes from the frozen resolver. This
// review corrects only the pre-contact signed technique-axis convention.
export function launch(s,curve,aim){
 const action=scheduledLaunch({family:'INSIDE',shotPower:SHOT_POWER,charge:1,attributes:{curve,preferredFoot:'R'},context:{selectedFoot:'R'},aim},{position:s.origin});
 const inherited=action.spin.slice(),spin=[inherited[0],inherited[1]===0?0:-inherited[1],inherited[2]],spinMagnitude=len(spin);
 return {...action,spin,metadata:{...action.metadata,spin,angularVelocity:spin,spinMagnitude,spinAxis:spinMagnitude?spin.map(v=>v/spinMagnitude):[0,0,0],
  aim:{...action.metadata.aim,kind:'Physical target compensation solved before launch; no post-launch control'},
  curve:{...action.metadata.curve,intentionalSideSpin:spin[1]},
  techniqueDirection:{scope:'Local CURVE-1 simple review, pre-contact only',inheritedSpin:inherited,correctedSpin:spin,preferredFoot:'R',selectedFoot:'R',reason:'Positive world-Y gives inward -Z Magnus for +X forward; inherited negative Y gave outward +Z Magnus'},postLaunchControl:false}};
}
export function directBearing(s){return Math.atan2(s.target[2]-s.origin[2],s.target[0]-s.origin[0])*deg;}
export function departure(s,p){const dx=s.target[0]-s.origin[0],dz=s.target[2]-s.origin[2];return (dx*(p[2]-s.origin[2])-dz*(p[0]-s.origin[0]))/Math.hypot(dx,dz);}
export function maxDeparture(s,frames,end=Infinity){
 let best={metres:0,time:0,position:s.origin.slice()};
 for(const f of frames)if(f.time<=end+1e-10){const d=departure(s,f.p);if(d>best.metres)best={metres:d,time:f.time,position:f.p.slice()};}
 return best;
}
export function aimOffset(s,action){const yaw=Math.atan2(action.velocity[2],action.velocity[0])*deg;return {directBearingDegrees:directBearing(s),launchBearingDegrees:yaw,degrees:yaw-directBearing(s),initialRayGoalPlaneOffsetMetres:s.origin[2]+action.velocity[2]/action.velocity[0]*(s.target[0]-s.origin[0])-s.target[2]};}
export function trace(action,{scenario=SCENARIO,duration=5,stopAtLanding=true}={}){
 const w=new BallWorld({p:action.position});w.launch(action);const frames=[w.snapshot()];let previous=frames[0],plane=null,whole=null;
 w.onSubstep=f=>{if(!plane)plane=crossing(previous,f,scenario.target[0]);if(!whole)whole=crossing(previous,f,scenario.target[0]+.11);frames.push(f);previous=f;};
 let landing=null;
 for(let i=0;i<Math.ceil(duration*60);i++){w.step();landing=w.events.find(e=>e.kind==='PHYSICAL_CONTACT'&&e.collider==='turf');if(stopAtLanding&&landing)break;}
 const airborneEnd=landing?.time??w.time,pre=frames.filter(f=>f.time<=Math.min(plane?.t??airborneEnd,airborneEnd)+1e-10),yaw=Math.atan2(action.velocity[2],action.velocity[0]);
 let minForward=Infinity,maxTurnStep=0;const curvature=[];
 for(let i=1;i<pre.length;i++){const a=pre[i-1],b=pre[i],h=b.time-a.time,vx=(a.v[0]+b.v[0])/2,vz=(a.v[2]+b.v[2])/2,ax=(b.v[0]-a.v[0])/h,az=(b.v[2]-a.v[2])/h,vh=Math.hypot(vx,vz);minForward=Math.min(minForward,b.v[0]);const heading=Math.atan2(b.v[2],b.v[0]);maxTurnStep=Math.max(maxTurnStep,Math.abs(heading-Math.atan2(a.v[2],a.v[0]))*deg);curvature.push({t:b.time,normalAcceleration:(vx*az-vz*ax)/vh,headingDegrees:heading*deg});}
 return {action,plane,whole,landing:landing?{t:landing.time,p:landing.point}:null,apex:Math.max(...pre.map(f=>f.p[1])),frames,events:w.events,stats:w.stats,
  metrics:{launchSpeed:len(action.velocity),initialSpin:action.spin,spinAxis:action.metadata.spinAxis,goal:plane?{time:plane.t,position:plane.p,velocity:plane.v,speed:len(plane.v),spin:plane.w,bend:plane.p[2]-action.position[2]-Math.tan(yaw)*(plane.p[0]-action.position[0])}:null,
   aimOffset:aimOffset(scenario,action),maxSignedDepartureFirstFlight:maxDeparture(scenario,frames,airborneEnd),maxSignedDepartureThroughGoal:maxDeparture(scenario,frames,Math.min(plane?.t??airborneEnd,airborneEnd)),firstFlightEndTime:airborneEnd,firstFlightCompleted:!!landing,
   finite:frames.every(f=>[...f.p,...f.v,...f.w,...f.q].every(Number.isFinite)),reversed:minForward<=0,minForwardVelocity:minForward,maxTurnStepDegrees:maxTurnStep,preGoalTurfContact:!!landing&&landing.time<(plane?.t??duration),curvature}}
}
// Same two-variable physical Newton solve and tolerance for all eleven shots.
// No keeper outcome enters the initial guess, residual, Jacobian or acceptance.
export function solveTarget(s,curve){
 const spin=launch(s,curve,{yawDeg:0,elevationDeg:13}).spin[1];
 let yaw=directBearing(s)+spin*s.depth*.007,elevation=17,best=null;
 const run=(y,e)=>trace(launch(s,curve,{yawDeg:y,elevationDeg:e}),{scenario:s});
 for(let iteration=0;iteration<24;iteration++){
  const r=run(yaw,elevation);if(!r.plane||r.metrics.preGoalTurfContact)throw Error(`First-flight target unavailable for Curve ${curve}`);
  const dz=r.plane.p[2]-s.target[2],dy=r.plane.p[1]-s.target[1],error=Math.hypot(dz,dy);best={...r,aim:{yawDeg:yaw,elevationDeg:elevation},target:s.target,error,iterations:iteration+1};if(error<1e-7)return best;
  const h=.01,a=run(yaw+h,elevation),b=run(yaw,elevation+h);if(!a.plane||!b.plane)throw Error('Aim derivative did not reach target plane');
  const A=(a.plane.p[2]-r.plane.p[2])/h,B=(b.plane.p[2]-r.plane.p[2])/h,C=(a.plane.p[1]-r.plane.p[1])/h,D=(b.plane.p[1]-r.plane.p[1])/h,det=A*D-B*C;
  if(Math.abs(det)<1e-8)throw Error('Degenerate aim Jacobian');
  yaw-=Math.max(-6,Math.min(6,(D*dz-B*dy)/det));elevation-=Math.max(-3,Math.min(3,(-C*dz+A*dy)/det));
 }
 throw Error('Aim failed '+JSON.stringify({curve,error:best?.error}));
}
export function outcomeFlags(r){return {goal:r.goal,save:r.saved,catch:r.contacts.some(c=>c.held),parry:r.contacts.some(c=>!c.held),contactButGoal:r.goal&&r.contacts.length>0,miss:!r.goal&&!r.saved&&!r.frameHit,postOrCrossbar:r.frameHit};}
export function makeReview(){
 const runs=[];
 for(const curve of RATINGS){
  const physical=solveTarget(SCENARIO,curve),keeper=runShot(physical,{profile:COURTOIS,record:true});
  const actualEnd=Math.min(keeper.contacts[0]?.t??Infinity,keeper.actual?.t??Infinity,keeper.landing?.t??Infinity,keeper.end.t);
  const actualDeparture=maxDeparture(SCENARIO,keeper.frames,actualEnd);
  keeper.metrics={maxSignedDepartureBeforeContactOrPlane:actualDeparture,measurementEndTime:actualEnd,measurementEndReason:keeper.contacts[0]?.t===actualEnd?'first goalkeeper contact':keeper.actual?.t===actualEnd?'goal plane':keeper.landing?.t===actualEnd?'first turf contact':'simulation end'};
  runs.push({id:`A-targeted-${curve}`,scenario:SCENARIO,curve,mode:'targeted',aim:physical.aim,aimError:physical.error,aimOffset:physical.metrics.aimOffset,physical,keeper,flags:outcomeFlags(keeper)});
 }
 return {runs};
}

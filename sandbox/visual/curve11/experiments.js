import {trace,directBearing,maxDeparture,outcomeFlags,BallWorld} from '../curve1simple/experiments.js';
import {runShot} from '../curve1/keeper-simulation.js';
import {launch} from './resolver.js';
import {COURTOIS,SCENARIO,RATINGS} from './config.js';
import {health} from './health.js';
export {launch,trace,BallWorld};

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
export function makeReview(){
 const runs=[];
 for(const curve of RATINGS){
  let physical;try{physical=solveTarget(SCENARIO,curve);}catch(error){runs.push({id:`A-targeted-${curve}`,curve,scenario:SCENARIO,error:String(error),health:{rejected:true,reasons:['Target not naturally resolved']}});continue;}
  const keeper=runShot(physical,{profile:COURTOIS,record:true}),end=Math.min(keeper.contacts[0]?.t??Infinity,keeper.actual?.t??Infinity,keeper.landing?.t??Infinity,keeper.end.t);
  keeper.metrics={maxSignedDepartureBeforeContactOrPlane:maxDeparture(SCENARIO,keeper.frames,end),measurementEndTime:end};
  runs.push({id:`A-targeted-${curve}`,curve,scenario:SCENARIO,mode:'targeted',aim:physical.aim,aimError:physical.error,aimOffset:physical.metrics.aimOffset,physical,keeper,health:health(physical),flags:outcomeFlags(keeper)});
 }
 return {runs};
}

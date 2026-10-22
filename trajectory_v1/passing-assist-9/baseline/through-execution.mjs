// Passing-only stabilization. Sample execution in delivery space, then invert
// its weight before contact so turf/ceiling sensitivity cannot improve precision.
import {C,rad,deg,rotate,clamp} from './config.mjs';
import {makeWorld} from './physics.mjs';
import {candidateErrors} from './space-accuracy.mjs';
export const THROUGH_DEMAND=Object.freeze({
 version:'through-demand-6',referenceSpeed:14.246347713107472,
 referenceTime:2.264673629006303,endpointSpeed:2.5,
 referenceDifficulty:.12+.85*(20/30)**2+.2*(8/200)**2,
 tolerance:.0001,maxIterations:18
});
export const referenceControlDistance=THROUGH_DEMAND.referenceTime*(THROUGH_DEMAND.referenceSpeed-THROUGH_DEMAND.endpointSpeed);
export function throughDemand(solved,redirect=0,motion=0){
 const speed=solved.solution.speed,time=solved.arrivalTime,reduction=speed-THROUGH_DEMAND.endpointSpeed;
 const controlDistance=time*reduction,ratio=controlDistance/referenceControlDistance;
 const terms={paceAndDyingControl:THROUGH_DEMAND.referenceDifficulty*ratio,redirection:.25*(redirect/180)**2,motion:.2*(motion/8.2)**2};
 return {value:Object.values(terms).reduce((a,b)=>a+b,0),terms,controlDistance,ratio,launchSpeed:speed,endpointSpeed:THROUGH_DEMAND.endpointSpeed,travelTime:time,requiredSpeedReduction:reduction,referenceControlDistance,formula:'D = D20 × [T × (launchSpeed − endpointSpeed)] / [T20 × (launchSpeed20 − endpointSpeed)] + existing redirection + motion'};
}
function positionAt(speed,spin,time){
 const world=makeWorld({id:'through-execution-probe',tick:0,position:[0,C.radius,0],velocity:[speed,0,0],spin:[0,0,spin]});
 // Probe-only observation: identical world/substeps; no deep state copies.
 world.snapshot=()=>({time:world.time,x:world.ball.p[0]});let prev=world.snapshot(),point=null;
 world.onSubstep=f=>{if(point===null&&prev.time<=time&&f.time>=time)point=prev.x+(f.x-prev.x)*(time-prev.time)/(f.time-prev.time);prev=f;};
 while(point===null&&world.time<time+C.dt)world.step();return point??world.ball.p[0];
}
export function resolveThroughExecution(solved,sigma,draws){
 const start=performance.now(),c=THROUGH_DEMAND,raw=candidateErrors('THROUGH',sigma,draws.z),d=solved.intent.distance;
 const lateral=d*Math.tan(rad(raw.direction)),depth=referenceControlDistance*raw.weight,forward=d+depth,wanted=Math.hypot(forward,lateral),yaw=solved.intent.directYaw+deg(Math.atan2(lateral,forward));
 if(raw.direction===0&&raw.weight===0)return {action:solved.action,params:[solved.solution.speed,0,solved.yaw],error:{directionDeg:0,depthFraction:0,lateral:0,depth:0,backspinMultiplier:1},diagnostics:{residual:0,candidates:0,iterations:0,candidateRetries:0,fallback:false,cpuMs:performance.now()-start,referenceTime:solved.arrivalTime,requestedLateral:0,requestedDepth:0,weightControl:0}};
 let candidates=0,iterations=0,best=null,paths=0;
 const evaluate=(speed,spin)=>{const distance=positionAt(speed,spin,solved.arrivalTime);candidates++;return {q:speed/solved.solution.speed-1,speed,spin,distance,residual:distance-wanted};};
 // Keep the ideal backspin whenever possible. Small spin offsets bridge discrete
 // slide/roll transitions. At the pace ceiling an overrun requires less dying
 // control; bounded alternatives include forward roll for genuine overhits.
 const spin0=solved.solution.spin[2],spins=[spin0,...[.125,-.125,.5,-.5,1,-1,4,-4,16,-16,64,-64,256,-256].map(x=>clamp(spin0+x,-solved.ceiling/C.radius,400)),-solved.ceiling/C.radius];
 for(const spin of spins){
  paths++;let lo=.5,hi=solved.ceiling,a=evaluate(lo,spin),b=evaluate(hi,spin);
  if(a.residual>0||b.residual<0)continue;
  for(let n=0;n<c.maxIterations;n++){
   iterations++;const speed=clamp((lo*b.residual-hi*a.residual)/(b.residual-a.residual),lo+.04*(hi-lo),hi-.04*(hi-lo)),e=evaluate(speed,spin);
   if(!best||Math.abs(e.residual)<Math.abs(best.residual))best=e;
   if(Math.abs(e.residual)<c.tolerance)break;
   if(e.residual>0){hi=speed;b=e;a={...a,residual:a.residual*.5};}else{lo=speed;a=e;b={...b,residual:b.residual*.5};}
  }
  if(best&&Math.abs(best.residual)<c.tolerance)break;
 }
 if(!best||Math.abs(best.residual)>.001)throw Error('UNRESOLVED Through execution: '+Math.abs(best?.residual??Infinity).toFixed(4)+' m residual '+JSON.stringify({d,rating:sigma.rating,event:draws.drawEventId,best,wanted}));
 const action={...solved.action,velocity:rotate([best.speed,0,0],yaw),spin:rotate([0,0,best.spin],yaw)};
 return {action,params:[best.speed,0,yaw],error:{directionDeg:raw.direction,depthFraction:depth/d,lateral,depth,backspinMultiplier:best.spin/solved.solution.spin[2]},diagnostics:{method:'Physical-demand spread → bounded delivery error → contact-only pace/backspin inverse',residual:Math.abs(best.residual),candidates,iterations,candidateRetries:paths-1,fallback:paths>1,cpuMs:performance.now()-start,referenceTime:solved.arrivalTime,requestedLateral:lateral,requestedDepth:depth,weightControl:best.q}};
}

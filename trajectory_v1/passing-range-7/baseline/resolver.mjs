import {C,clamp,charge,speedCeiling,launchVector,rotate,deg,magnitude} from './config.mjs';
import {executionDraws} from './rng.mjs';
import {candidate,simulate,atTime} from './physics.mjs';
export {C,charge,speedCeiling};
export function validateInput(i){
 if(!['SHORT','THROUGH','CROSS'].includes(i.family))throw Error('Unknown pass family');
 for(const k of ['short_passing','long_passing','crossing','shot_power'])if(!Number.isFinite(i.attributes[k])||i.attributes[k]<1||i.attributes[k]>99)throw Error('Attributes must be 1–99');
 for(const p of [i.origin,i.receiver.position,i.receiver.velocity,i.aimPoint])if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))throw Error('Expected finite three-dimensional vectors');
 if(Math.hypot(i.aimPoint[0]-i.origin[0],i.aimPoint[2]-i.origin[2])<.5)throw Error('Aim at least 0.5 m away');
 if(magnitude(i.receiver.velocity)>12)throw Error('Receiver speed exceeds calibration envelope');
 if(i.origin[1]!==C.radius)throw Error('Pass contact must be at the grounded ball centre');
 if(!Number.isFinite(i.holdMs)||i.holdMs<0)throw Error('Invalid hold duration');
 if(!Number.isFinite(i.facingYaw??0))throw Error('Invalid facing');
 if(!/^[a-zA-Z0-9:_-]{1,80}$/.test(String(i.drawEventId)))throw Error('Invalid execution draw key');
 if(!/^\d{1,16}$/.test(String(i.seed)))throw Error('Seed must contain 1–16 digits');
}
export function targetAt(i,t,headstart=0){return [i.aimPoint[0]+i.receiver.velocity[0]*(t+headstart),i.family==='CROSS'?C.cross.arrivalHeight:C.radius,i.aimPoint[2]+i.receiver.velocity[2]*(t+headstart)];}
export function targetDistance(i,p){return Math.hypot(p[0]-i.origin[0],p[2]-i.origin[2]);}
function ground(i,q,ceiling){
 const runner=Math.hypot(i.receiver.velocity[0],i.receiver.velocity[2]),through=i.family==='THROUGH';
 const arrival=through?Math.max(3,runner+C.ground.throughExtra[0]+(C.ground.throughExtra[1]-C.ground.throughExtra[0])*q):C.ground.shortArrival[0]+(C.ground.shortArrival[1]-C.ground.shortArrival[0])*q**1.2;
 const headstart=through?C.ground.throughHeadstart[0]+(C.ground.throughHeadstart[1]-C.ground.throughHeadstart[0])*q:0;
 const lift=C.ground.lift[0]+(C.ground.lift[1]-C.ground.lift[0])*q,capH=Math.sqrt(Math.max(0,ceiling**2-lift**2));let count=0,cpu=0;
 const evaluate=s=>{const start=performance.now(),spin=[0,0,-s*C.ground.rollingFraction/C.radius],velocity=[s,lift,0],f=candidate(velocity,spin,{arrivalSpeed:arrival}),target=targetAt(i,f.endpoint.time,headstart);count++;cpu+=performance.now()-start;return {speed:s,velocity,spin,flight:f,target,residual:f.endpoint.p[0]-targetDistance(i,target)};};
 let lo=Math.min(arrival+.001,capH),hi=capH,best=evaluate(hi);const capabilityLimited=best.residual<0||arrival>=capH;
 if(!capabilityLimited){for(let n=0;n<C.ground.iterations;n++){const m=(lo+hi)/2,e=evaluate(m);if(Math.abs(e.residual)<Math.abs(best.residual))best=e;if(e.residual>0)hi=m;else lo=m;}}
 return {...best,requestedArrivalSpeed:arrival,requestedApex:null,headstart,valid:!capabilityLimited&&Math.abs(best.residual)<.04,status:capabilityLimited?'CAPABILITY LIMITED: requested arrival weight cannot reach this moving target':Math.abs(best.residual)<.04?'resolved':'APPROXIMATE WEIGHT: turf contact transition leaves a bounded residual',candidates:count,trajectoryCpuMs:cpu};
}
function cross(i,q,ceiling){
 let count=0,cpu=0;const h=C.cross.arrivalHeight;
 const desired=d=>Math.max(C.cross.apexFloor,C.cross.apexIntercept+C.cross.apexPerMetre*d)*(C.cross.floatFactor-C.cross.firmReduction*q);
 const evaluate=(speed,pitch)=>{const start=performance.now(),velocity=launchVector(speed,pitch,0),spin=[0,0,C.cross.backspin],flight=candidate(velocity,spin,{arrivalHeight:h}),target=targetAt(i,flight.endpoint.time),d=targetDistance(i,target),apex=desired(d);count++;cpu+=performance.now()-start;return {speed,pitch,velocity,spin,flight,target,requestedApex:apex,residual:flight.endpoint.p[0]-d,heightResidual:flight.apex-apex};};
 const d=targetDistance(i,i.aimPoint),apex=desired(d),vy=Math.sqrt(2*9.81*(apex-C.radius)),time=(vy+Math.sqrt(Math.max(0,vy*vy-2*9.81*(h-C.radius))))/9.81;
 let s=clamp(Math.hypot(d/time,vy)*1.08,3,ceiling),p=clamp(deg(Math.atan2(vy,d/time)),5,75),best=null;
 for(let k=0;k<C.cross.iterations;k++){
  const e=evaluate(s,p),score=Math.hypot(e.residual,e.heightResidual*3);if(!best||score<best.score)best={...e,score};
  if(e.flight.hit&&Math.abs(e.residual)<.025&&Math.abs(e.heightResidual)<.025)break;
  const a=evaluate(s+.12,p),b=evaluate(s,p+.15),j00=(a.residual-e.residual)/.12,j10=(a.heightResidual-e.heightResidual)/.12,j01=(b.residual-e.residual)/.15,j11=(b.heightResidual-e.heightResidual)/.15,det=j00*j11-j01*j10;
  if(!Number.isFinite(det)||Math.abs(det)<1e-8)break;
  s=clamp(s-clamp((j11*e.residual-j01*e.heightResidual)/det,-4,4),3,ceiling);
  p=clamp(p-clamp((-j10*e.residual+j00*e.heightResidual)/det,-12,12),5,75);
 }
 const valid=best.flight.hit&&Math.abs(best.residual)<.08&&Math.abs(best.heightResidual)<.06;
 return {...best,requestedArrivalSpeed:null,headstart:0,valid,status:valid?'resolved':'UNRESOLVED / CAPABILITY LIMITED: closest bounded physical candidate shown',candidates:count,trajectoryCpuMs:cpu};
}
export function solveIdeal(input){
 validateInput(input);const started=performance.now(),i=structuredClone(input),q=charge(i.holdMs),ceiling=speedCeiling(i.attributes.shot_power,i.family),solution=i.family==='CROSS'?cross(i,q,ceiling):ground(i,q,ceiling);
 const yaw=deg(Math.atan2(solution.target[2]-i.origin[2],solution.target[0]-i.origin[0]));
 const action={id:(i.passId??'pass')+':ideal',tick:0,position:i.origin.slice(),velocity:rotate(solution.velocity,yaw),spin:rotate(solution.spin,yaw),metadata:{version:C.version,family:i.family}};
 const ideal=simulate(action,solution.target),arrivalTime=ideal.plane?.time??solution.flight.endpoint.time;
 const receiverArrival=i.receiver.position.map((v,k)=>v+i.receiver.velocity[k]*arrivalTime);
 const result={input:i,q,ceiling,yaw,solution:{...solution,flight:undefined},target:solution.target,action,ideal,arrivalTime,receiverArrival,
 performance:{candidates:solution.candidates,trajectoryCpuMs:solution.trajectoryCpuMs,resolverCpuMs:performance.now()-started}};
 return result;
}
export function difficultyOf(i,solved){const d=targetDistance(i,solved.target),yaw=solved.yaw,redirect=Math.abs(((yaw-(i.facingYaw??yaw)+540)%360)-180)/180,speed=magnitude(solved.action.velocity),motion=Math.hypot(i.receiver.velocity[0],i.receiver.velocity[2]);const w=C.difficulty;
 const terms={floor:w.floor,distance:w.distance*(d/w.distanceScale)**2,speed:w.speed*(speed/w.speedScale)**2,redirection:w.redirection*redirect**2,height:i.family==='CROSS'?w.height*(solved.solution.requestedApex/w.heightScale)**2:0,motion:w.motion*(motion/w.motionScale)**2};return {value:Object.values(terms).reduce((a,b)=>a+b,0),terms,distance:d,redirectionDeg:redirect*180};}
export function precision(family,rating,difficulty){const p=C.precision[family],x=((99-rating)/89)**C.precision.exponent;return {rating,factor:x,sigmaDirection:(p.yawFloor+p.yawRange*x)*difficulty,sigmaWeight:(p.weightFloor+p.weightRange*x)*difficulty,sigmaElevation:(p.elevationFloor+p.elevationRange*x)*difficulty};}
export async function execute(input,solved=solveIdeal(input)){
 validateInput(input);const start=performance.now(),i=structuredClone(input),draws=await executionDraws(i),difficulty=difficultyOf(i,solved),attribute=C.ratingAttribute[i.family],sigma=precision(i.family,i.attributes[attribute],difficulty.value);
 const direction=sigma.sigmaDirection*draws.z.direction,weight=sigma.sigmaWeight*draws.z.weight,elevation=sigma.sigmaElevation*draws.z.elevation,idealSpeed=magnitude(solved.action.velocity),pitch=deg(Math.atan2(solved.action.velocity[1],Math.hypot(solved.action.velocity[0],solved.action.velocity[2])));
 const actualSpeed=clamp(idealSpeed*(1+weight),.5,solved.ceiling),actualPitch=i.family==='CROSS'?clamp(pitch+elevation,1,85):deg(Math.asin(Math.min(solved.action.velocity[1],actualSpeed*.95)/actualSpeed)),velocity=launchVector(actualSpeed,actualPitch,solved.yaw+direction);
 // Ground errors never add elevation. Spin is generated at contact for the actual
 // strike direction/weight; after contact only the shared physics may change it.
 const spin=i.family==='CROSS'?rotate([0,0,C.cross.backspin],solved.yaw+direction):[velocity[2]*C.ground.rollingFraction/C.radius,0,-velocity[0]*C.ground.rollingFraction/C.radius];
 const actualAction={...solved.action,id:i.passId??'pass',velocity,spin};
 const audit={version:C.version,input:i,attribute,rating:i.attributes[attribute],charge:qInfo(i),idealTarget:solved.target,receiverAtIdealArrival:solved.receiverArrival,aimOffset:i.aimPoint.map((v,k)=>v-i.receiver.position[k]),ceiling:solved.ceiling,difficulty,sigma,draws,error:{directionDeg:direction,requestedWeightFraction:weight,appliedWeightFraction:actualSpeed/idealSpeed-1,elevationDeg:elevation},idealLaunch:solved.action,actualLaunch:actualAction,idealArrival:solved.ideal.plane,solver:solved.solution,performance:{...solved.performance,executionCpuMs:performance.now()-start},excludedContext:['pressure','vision','weak foot','fatigue','receiving','match AI']};
 return {audit,actualAction,idealAction:solved.action,ideal:solved.ideal,target:solved.target,arrivalTime:solved.arrivalTime};
}
function qInfo(i){return {holdMs:i.holdMs,normalized:charge(i.holdMs),tapMs:C.charge.tapMs,fullMs:C.charge.fullMs};}
export async function preparePass(i){return execute(i,solveIdeal(i));}
export function measurements(prepared,actual){
 const ideal=prepared.ideal,t=prepared.arrivalTime,ref=actual.atReference??atTime(actual.frames,t),int=ideal.plane??atTime(ideal.frames,t),o=prepared.actualAction.position,target=prepared.target,d=targetDistance({origin:o},target),ux=(target[0]-o[0])/d,uz=(target[2]-o[2])/d,dx=ref.p[0]-int.p[0],dz=ref.p[2]-int.p[2],v=prepared.audit.input.receiver.velocity,rv=Math.hypot(v[0],v[2]),plane=actual.plane;
 const lateral=dx*(-uz)+dz*ux,depth=dx*ux+dz*uz,height=ref.p[1]-int.p[1],crossingLateral=plane?(plane.p[0]-target[0])*(-uz)+(plane.p[2]-target[2])*ux:null;
 const rp=prepared.audit.input.receiver.position,runnerTime=rv>0?((target[0]-rp[0])*v[0]+(target[2]-rp[2])*v[2])/(rv*rv):null,runnerPathOffset=runnerTime===null?Math.hypot(target[0]-rp[0],target[2]-rp[2]):Math.hypot(target[0]-rp[0]-v[0]*runnerTime,target[2]-rp[2]-v[2]*runnerTime);
 let closestApproach={distance:Infinity,time:0};for(const f of actual.frames){const gap=Math.hypot(f.p[0]-rp[0]-v[0]*f.time,f.p[1]-rp[1],f.p[2]-rp[2]-v[2]*f.time);if(gap<closestApproach.distance)closestApproach={distance:gap,time:f.time,ball:f.p,receiver:rp.map((x,k)=>x+v[k]*f.time)};}
 return {runnerTargetTime:runnerTime,runnerPathOffset,closestApproach,referenceTime:t,idealPoint:int.p,actualPoint:ref.p,lateral,depth,height,physicalMiss:Math.hypot(dx,dz,height),targetPlane:plane,planeLateral:crossingLateral,planeHeightError:plane&&ideal.plane?plane.p[1]-ideal.plane.p[1]:null,planeTimeError:plane&&ideal.plane?plane.time-ideal.plane.time:null,ballRunnerTimingError:plane&&runnerTime!==null?plane.time-runnerTime:null,idealBallRunnerTiming:runnerTime===null?null:t-runnerTime,idealArrivalSpeed:ideal.plane?magnitude(ideal.plane.v):null,actualArrivalSpeed:plane?magnitude(plane.v):null,arrivalVerticalVelocity:plane?.v[1]??null,idealLanding:ideal.landing?.p??null,actualLanding:actual.landing?.p??null,landingError:ideal.landing&&actual.landing?actual.landing.p.map((x,k)=>x-ideal.landing.p[k]):null,apex:actual.apex.height,launchCount:actual.launchCount};
}
export function defaultInput(){return {family:'SHORT',passId:'pass-1',drawEventId:'draw-1',seed:'20261018',passerId:'calibration-passer',origin:[65,.11,34],facingYaw:0,receiver:{id:'receiver-1',position:[80,.11,34],velocity:[0,0,0]},aimPoint:[80,.11,34],holdMs:270,attributes:{short_passing:80,long_passing:80,crossing:80,shot_power:80}};}

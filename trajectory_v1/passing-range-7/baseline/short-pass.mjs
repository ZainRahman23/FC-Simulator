// SHORT-PASS-TAP-1. All constants remain provisional. Legacy families are untouched.
import {C,clamp,deg,rotate,magnitude} from './config.mjs';
import {candidate,simulate} from './physics.mjs';
import {executionDraws} from './rng.mjs';
import {validateInput,precision} from './resolver.mjs';
import {passingAccuracy} from './passing-attributes.mjs';
export const SHORT=Object.freeze({version:'SHORT-PASS-TAP-1-provisional',fullHoldMs:350,chargeExponent:2,tapArrival:8,maxArrival99:14,extraPaceFloor:.55,extraPaceRange:.45,spExponent:1.5,
 coneHalfAngleDeg:30,selectionDistanceWeight:.15,selectionDistanceScale:30,maxSelectionDistance:60,minimumDistance:.5,
 launchSearchLimit:32,iterations:12,solveTolerance:.004,rangeTolerance:.025,arrivalTolerance:.035,rollingFraction:1,launchLift:0});
export const shortCharge=ms=>{const t=clamp(ms/SHORT.fullHoldMs,0,1);return 1-(1-t)**SHORT.chargeExponent;};
export function arrivalCeiling(sp){return SHORT.tapArrival+(SHORT.maxArrival99-SHORT.tapArrival)*(SHORT.extraPaceFloor+SHORT.extraPaceRange*(sp/99)**SHORT.spExponent);}
export function shortPace(ms,sp){return SHORT.tapArrival+shortCharge(ms)*(arrivalCeiling(sp)-SHORT.tapArrival);}
export function selectShortReceiver(input){
 const aim=[input.aimPoint[0]-input.origin[0],input.aimPoint[2]-input.origin[2]],an=Math.hypot(...aim);if(an<SHORT.minimumDistance)throw Error('Aim at least 0.5 m away');
 const candidates=input.candidates??[input.receiver];if(!Array.isArray(candidates)||!candidates.length)throw Error('No teammates available for Short Pass');
 const ids=new Set(),scored=candidates.map(r=>{if(typeof r.id!=='string'||ids.has(r.id))throw Error('Receiver IDs must be unique strings');ids.add(r.id);for(const v of [r.position,r.velocity])if(!Array.isArray(v)||v.length!==3||!v.every(Number.isFinite))throw Error('Invalid receiver state');if(magnitude(r.velocity)>12)throw Error('Receiver speed exceeds envelope');
 const dx=r.position[0]-input.origin[0],dz=r.position[2]-input.origin[2],distance=Math.hypot(dx,dz),angle=distance?deg(Math.acos(clamp((dx*aim[0]+dz*aim[1])/(distance*an),-1,1))):180,eligible=distance>=SHORT.minimumDistance&&distance<=SHORT.maxSelectionDistance&&angle<=SHORT.coneHalfAngleDeg;
 return {id:r.id,distance,angleDeg:angle,eligible,score:(angle/SHORT.coneHalfAngleDeg)**2+SHORT.selectionDistanceWeight*distance/SHORT.selectionDistanceScale,receiver:structuredClone(r)};
 });const ranked=scored.filter(x=>x.eligible).sort((a,b)=>a.score-b.score||(a.id<b.id?-1:a.id>b.id?1:0));
 return {receiver:ranked[0]?.receiver??null,selectedId:ranked[0]?.id??null,aimDirection:[aim[0]/an,0,aim[1]/an],coneHalfAngleDeg:SHORT.coneHalfAngleDeg,candidates:scored,rule:'min((angle/30)^2 + 0.15*distance/30), inside 30 degree cone and 0.5–60 m; stable ID tie-break'};
}
function backwards(i,arrival){
 const receiver=i.receiver,origin=i.origin;let candidates=0,cpu=0;
 const evaluate=s=>{const start=performance.now(),velocity=[s,0,0],spin=[0,0,-s/C.radius],flight=candidate(velocity,spin,{arrivalSpeed:arrival}),target=receiver.position.map((v,k)=>k===1?C.radius:v+receiver.velocity[k]*flight.endpoint.time),distance=Math.hypot(target[0]-origin[0],target[2]-origin[2]);candidates++;cpu+=performance.now()-start;return {speed:s,velocity,spin,flight,target,residual:flight.endpoint.p[0]-distance};};
 const contactDistance=Math.hypot(receiver.position[0]-origin[0],receiver.position[2]-origin[2]),runner=Math.hypot(receiver.velocity[0],receiver.velocity[2]);
 // A rough kinematic estimate only seeds the bracket. Every residual and final
 // trajectory is measured in the unchanged physical world.
 let lo=arrival,fl=-contactDistance,hi=Math.min(SHORT.launchSearchLimit,Math.sqrt(arrival*arrival+16*contactDistance)+runner*1.5+1),best=evaluate(hi);
 if(best.residual<0&&hi<SHORT.launchSearchLimit){hi=SHORT.launchSearchLimit;best=evaluate(hi);}let fh=best.residual,limited=fh<0,previousSide=0;
 if(!limited)for(let n=0;n<SHORT.iterations;n++){const mid=clamp(lo+(hi-lo)*(-fl)/(fh-fl),lo+.05*(hi-lo),hi-.05*(hi-lo)),e=evaluate(mid);if(Math.abs(e.residual)<Math.abs(best.residual))best=e;if(Math.abs(e.residual)<=SHORT.solveTolerance)break;
  if(e.residual>0){hi=mid;fh=e.residual;if(previousSide===1)fl*=.5;previousSide=1;}else{lo=mid;fl=e.residual;if(previousSide===-1)fh*=.5;previousSide=-1;}}

 return {...best,valid:!limited&&Math.abs(best.residual)<=SHORT.rangeTolerance,status:limited?'OUTSIDE SHORT PASS ENVELOPE: intended pace cannot reach this receiver':'resolved',candidates,trajectoryCpuMs:cpu,requestedArrivalSpeed:arrival,requestedApex:null,headstart:0};
}
export function solveShort(input){
 validateInput(input);const start=performance.now(),selection=selectShortReceiver(input);if(!selection.receiver)throw Error('No teammate in the Short Pass aim cone. Aim closer to a teammate.');
 const i={...structuredClone(input),receiver:selection.receiver},q=shortCharge(i.holdMs),arrival=shortPace(i.holdMs,i.attributes.shot_power),solution=backwards(i,arrival),maxArrival=arrivalCeiling(i.attributes.shot_power),maximum=q===1?solution:backwards(i,maxArrival),ceiling=maximum.speed;
 const yaw=deg(Math.atan2(solution.target[2]-i.origin[2],solution.target[0]-i.origin[0])),action={id:(i.passId??'pass')+':ideal',tick:0,position:i.origin.slice(),velocity:rotate(solution.velocity,yaw),spin:rotate(solution.spin,yaw),metadata:{version:SHORT.version,family:'SHORT'}};
 const ideal=simulate(action,solution.target),arrivalTime=ideal.plane?.time??solution.flight.endpoint.time,receiverArrival=i.receiver.position.map((v,k)=>v+i.receiver.velocity[k]*arrivalTime),arrivalResidual=ideal.plane?Math.hypot(ideal.plane.v[0],ideal.plane.v[2])-arrival:null;
 const maxSolved=maximum.valid;solution.valid=solution.valid&&arrivalResidual!==null&&Math.abs(arrivalResidual)<=SHORT.arrivalTolerance;solution.status=solution.valid?'resolved':solution.status==='resolved'?'APPROXIMATE: measured receiving pace exceeds tolerance':solution.status;
 return {input:i,originalInput:structuredClone(input),selection,q,ceiling,yaw,target:solution.target,action,ideal,arrivalTime,receiverArrival,
 solution:{...solution,flight:undefined,arrivalResidual,arrivalCeiling:maxArrival,maximumLaunchSpeed:ceiling,maximumPaceResolved:maxSolved,launchSearchLimit:SHORT.launchSearchLimit,maximumPaceResidual:maximum.residual},
 performance:{candidates:solution.candidates+(q===1?0:maximum.candidates),trajectoryCpuMs:solution.trajectoryCpuMs+(q===1?0:maximum.trajectoryCpuMs),resolverCpuMs:performance.now()-start}};
}
export function shortDifficulty(i){
 // Contact geometry only: hold, pace, Shot Power and travel-time-dependent lead
 // must never enter Short Pass sigma. No pace penalty in this experiment.
 const dx=i.receiver.position[0]-i.origin[0],dz=i.receiver.position[2]-i.origin[2],distance=Math.hypot(dx,dz),yaw=deg(Math.atan2(dz,dx)),redirection=Math.abs(((yaw-(i.facingYaw??yaw)+540)%360)-180),motion=Math.hypot(i.receiver.velocity[0],i.receiver.velocity[2]),w=C.difficulty;
 const terms={floor:w.floor,distance:w.distance*(distance/w.distanceScale)**2,speed:0,redirection:w.redirection*(redirection/180)**2,height:0,motion:w.motion*(motion/w.motionScale)**2};return {value:Object.values(terms).reduce((a,b)=>a+b,0),terms,distance,redirectionDeg:redirection,definition:'Contact geometry only; no Shot Power, hold or speed dependency'};
}
export async function executeShort(input,solved=solveShort(input)){
 validateInput(input);const start=performance.now(),i={...structuredClone(input),receiver:structuredClone(solved.input.receiver)},draws=await executionDraws(i),difficulty=shortDifficulty(i),accuracy=passingAccuracy('SHORT',i.attributes),sigma=precision('SHORT',accuracy.effective,difficulty.value),direction=sigma.sigmaDirection*draws.z.direction,weight=sigma.sigmaWeight*draws.z.weight,idealSpeed=magnitude(solved.action.velocity),actualSpeed=clamp(idealSpeed*(1+weight),.5,solved.ceiling),velocity=rotate([actualSpeed,0,0],solved.yaw+direction),spin=rotate([0,0,-actualSpeed/C.radius],solved.yaw+direction),actualAction={...solved.action,id:i.passId??'pass',velocity,spin};
 const audit={version:SHORT.version,input:i,originalInput:structuredClone(input),selection:solved.selection,attribute:'short_passing',accuracy,effectivePassingAccuracy:accuracy.effective,primaryRating:i.attributes.short_passing,rating:accuracy.effective,charge:{holdMs:i.holdMs,normalized:solved.q,tapMs:0,fullMs:SHORT.fullHoldMs,curve:'1-(1-clamp(hold/350,0,1))^2'},desiredArrivalSpeed:solved.solution.requestedArrivalSpeed,arrivalCeiling:solved.solution.arrivalCeiling,idealTarget:solved.target,receiverAtIdealArrival:solved.receiverArrival,aimOffset:[0,0,0],ceiling:solved.ceiling,difficulty,sigma,draws,error:{directionDeg:direction,requestedWeightFraction:weight,appliedWeightFraction:actualSpeed/idealSpeed-1,elevationDeg:0},idealLaunch:solved.action,actualLaunch:actualAction,idealArrival:solved.ideal.plane,solver:solved.solution,performance:{...solved.performance,executionCpuMs:performance.now()-start},excludedContext:['Long Passing','Curve','Composure','Shot Power accuracy modifier','hold/speed accuracy modifier','pressure','weak foot','fatigue','receiving','match AI']};
 return {audit,actualAction,idealAction:solved.action,ideal:solved.ideal,target:solved.target,arrivalTime:solved.arrivalTime};
}
export async function prepareShort(i){return executeShort(i,solveShort(i));}
export function paceProfile(prepared){const frames=prepared.ideal.frames,origin=prepared.idealAction.position,target=prepared.target,d=Math.hypot(target[0]-origin[0],target[2]-origin[2]),axis=[(target[0]-origin[0])/d,(target[2]-origin[2])/d];
 return [0,.25,.5,.75,1,1.1,1.25].map(fraction=>{if(fraction===0)return {fraction,speed:magnitude(prepared.idealAction.velocity),time:0};const f=frames.find(f=>(f.p[0]-origin[0])*axis[0]+(f.p[2]-origin[2])*axis[1]>=fraction*d);return {fraction,speed:f?Math.hypot(f.v[0],f.v[2]):null,time:f?.time??null};});
}

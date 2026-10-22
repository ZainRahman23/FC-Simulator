import {C,clamp,deg,rad,magnitude,rotate,launchVector} from './config.mjs';
import {validateInput,precision} from './resolver.mjs';
import {executionDraws} from './rng.mjs';
import {candidate as groundCandidate,makeWorld as makeGroundWorld} from './physics.mjs';
import {candidate as crossCandidate} from './cross-physics.mjs';
import {simulate,atTime,blend} from './flight-router.mjs';
import {crossCurveCalibration} from './cross-shift.mjs';
import {candidatePrecision,candidateErrors} from './space-accuracy.mjs';
import {crossDraws,crossPrecision,resolveCrossExecution} from './cross-execution.mjs';
import {widerThroughPrecision} from './through-accuracy.mjs';
import {passingAccuracy} from './passing-attributes.mjs';
export const SPACE=Object.freeze({version:'PACE-WHIP-2-provisional',through:{fullMs:400,min:18,max:50,exponent:1.08,endpointSpeed:2.5,minimumBackspin:8,maximumBackspin:400,timeIntercept:1.25,timePerMetre:.045,runnerLookahead:.55,speedGuard:40},cross:{fullMs:550,min:20,max:70,exponent:1,spinFloor:45,spin75:64,curveExponent:2,backspin:8,arrivalHeight:1.2,apexBase:3,apexExtra:5,apexScale:35,speedGuard:65}});
export const spaceCharge=(family,ms)=>clamp(ms/SPACE[family==='THROUGH'?'through':'cross'].fullMs,0,1);
export const requestedRange=(family,ms)=>{const c=SPACE[family==='THROUGH'?'through':'cross'];return c.min+(c.max-c.min)*spaceCharge(family,ms)**c.exponent;};
export const crossSpin=(curve,model='current')=>{const c=crossCurveCalibration(curve,model);return (SPACE.cross.spinFloor+SPACE.cross.spin75*(c.effectiveCurve/75)**SPACE.cross.curveExponent)*(c.spinGate??1);};
export function spaceIntent(i){
 const distance=requestedRange(i.family,i.holdMs),lead=i.family==='THROUGH'?SPACE.through.runnerLookahead:0;
 // The selected runner supplies the path; human aim is a freely chosen offset
 // from that runner. Only Through adds a short forward projection of that path.
 const ray=[i.aimPoint[0]-i.origin[0]+i.receiver.velocity[0]*lead,0,i.aimPoint[2]-i.origin[2]+i.receiver.velocity[2]*lead],n=magnitude(ray);
 if(n<.1)throw Error('Aim and runner motion cancel; choose a clear direction');
 const target=[i.origin[0]+ray[0]/n*distance,i.family==='CROSS'?SPACE.cross.arrivalHeight:C.radius,i.origin[2]+ray[2]/n*distance];
 const v=i.receiver.velocity,rv=magnitude(v),ahead=rv?((target[0]-i.receiver.position[0])*v[0]+(target[2]-i.receiver.position[2])*v[2])/rv:null;
 return {distance,target,directYaw:deg(Math.atan2(ray[2],ray[0])),runnerLookahead:lead,aheadOfRunner:ahead,runnerId:i.receiver.id,aimOffset:i.aimPoint.map((x,k)=>x-i.receiver.position[k]),warning:ahead!==null&&ahead<=0?'Requested space is behind the runner: increase depth or change aim.':null};
}
// The world still runs its original four 240 Hz substeps. Solver-only probes
// observe at 60 Hz to avoid copying four full snapshots per step; the final
// candidate is remeasured at 240 Hz before it is accepted.
function groundProbe(velocity,spin,arrivalSpeed){
 const world=makeGroundWorld({id:'pace-probe',tick:0,position:[0,C.radius,0],velocity,spin});let prev=world.snapshot(),endpoint=null;
 while(!endpoint&&!world.ball.sleeping&&world.time<C.maxSeconds){const f=world.step(),a=Math.hypot(prev.v[0],prev.v[2]),b=Math.hypot(f.v[0],f.v[2]);if(prev.time>0&&a>arrivalSpeed&&b<=arrivalSpeed)endpoint=blend(prev,f,(a-arrivalSpeed)/(a-b));prev=f;}
 return {endpoint:endpoint??world.snapshot(),hit:!!endpoint,apex:C.radius};
}
export function throughSolve(intent){
 const c=SPACE.through;let count=0,cpu=0;const wantedTime=c.timeIntercept+c.timePerMetre*intent.distance;
 const evaluate=(s,w)=>{const t=performance.now(),velocity=[s,0,0],spin=[0,0,w],f=groundProbe(velocity,spin,c.endpointSpeed);count++;cpu+=performance.now()-t;return {speed:s,velocity,spin,flight:f,residual:f.endpoint.p[0]-intent.distance,timeResidual:f.endpoint.time-wantedTime};};
 let s=clamp(intent.distance<37?5+.46*intent.distance:23+1.2*(intent.distance-37),c.endpointSpeed,40),w=intent.distance<38?c.minimumBackspin:10+15*(intent.distance-38),best=null;
 const retain=e=>{if(!best||Math.abs(e.residual)<Math.abs(best.residual))best=e;return e;};
 // Two contact variables, two physical observations: distance at the requested
 // rolling speed, and a fast travel-time objective. No state changes after contact.
 for(let k=0;k<10;k++){
  const e=retain(evaluate(s,w));if(Math.abs(e.residual)<.01&&Math.abs(e.timeResidual)<.006){best=e;break;}
  const a=evaluate(s+.08,w),b=evaluate(s,w+1),j00=(a.residual-e.residual)/.08,j10=(a.timeResidual-e.timeResidual)/.08,j01=b.residual-e.residual,j11=b.timeResidual-e.timeResidual,det=j00*j11-j01*j10;
  if(!Number.isFinite(det)||Math.abs(det)<1e-8)break;
  const ds=clamp((j11*e.residual-j01*e.timeResidual)/det,-7,7),dw=clamp((-j10*e.residual+j00*e.timeResidual)/det,-70,70),ns=clamp(s-ds,c.endpointSpeed+.1,c.speedGuard),nw=clamp(w-dw,c.minimumBackspin,c.maximumBackspin);
  if(ns===c.speedGuard&&s===c.speedGuard&&ds<0){w=nw;break;}if(nw===c.minimumBackspin&&w===c.minimumBackspin&&dw>0){s=ns;break;}if(Math.abs(ns-s)<.0001&&Math.abs(nw-w)<.0001)break;s=ns;w=nw;
 }
 // A requested time can be infeasible on fixed turf. Honor the endpoint first:
 // solve along the active spin/speed bound instead of changing friction or braking.
 if(!(best&&Math.abs(best.residual)<.012&&Math.abs(best.timeResidual)<.02)){
 const fixedSpeed=s>=c.speedGuard-.001,low=fixedSpeed?c.minimumBackspin:c.endpointSpeed+.01,high=fixedSpeed?c.maximumBackspin:Math.min(c.speedGuard,9+.46*intent.distance);
 const eval1=x=>fixedSpeed?evaluate(c.speedGuard,x):evaluate(x,w);
 let lo=low,hi=high,a=eval1(lo),b=eval1(hi),chosen=null;
 while(!fixedSpeed&&b.residual<0&&hi<c.speedGuard){lo=hi;a=b;hi=Math.min(c.speedGuard,hi+2);b=eval1(hi);}
 if(a.residual*b.residual<=0){for(let k=0;k<20;k++){const x=clamp((lo*b.residual-hi*a.residual)/(b.residual-a.residual),lo+.05*(hi-lo),hi-.05*(hi-lo)),e=eval1(x);if(!chosen||Math.abs(e.residual)<Math.abs(chosen.residual))chosen=e;if(Math.abs(e.residual)<.004)break;if(e.residual>0){hi=x;b=e;a={...a,residual:a.residual*.5};}else{lo=x;a=e;b={...b,residual:b.residual*.5};}}}
 if(chosen&&Math.abs(chosen.residual)<.025)best=chosen;
 }
 if(best){const t=performance.now();best.flight=groundCandidate(best.velocity,best.spin,{arrivalSpeed:c.endpointSpeed});count++;cpu+=performance.now()-t;best.residual=best.flight.endpoint.p[0]-intent.distance;best.timeResidual=best.flight.endpoint.time-wantedTime;}
 const valid=best?.flight.hit&&Math.abs(best.residual)<.025&&Math.abs(best.flight.endpoint.w[2]+c.endpointSpeed/C.radius)<.1;
 return {...best,requestedArrivalSpeed:c.endpointSpeed,requestedApex:C.radius,requestedTravelTime:wantedTime,timeObjectiveReached:Math.abs(best?.timeResidual??Infinity)<.02,valid,status:valid?'resolved':'UNRESOLVED: depth or gently rolling endpoint not satisfied',candidates:count,trajectoryCpuMs:cpu,spinConstraint:'Joint speed/backspin solve for depth and fast travel time; endpoint takes priority at physical bounds',yawOffset:0,pitch:0};
}
function crossSolve(i,intent){
 const c=SPACE.cross,curve=i.attributes.curve??75,calibration=crossCurveCalibration(curve,i.crossCurveModel),side=i.dominantFoot==='left'?-1:1,spin=[0,side*crossSpin(curve,calibration.model),c.backspin],desired=c.apexBase+c.apexExtra*(1-Math.exp(-intent.distance/c.apexScale));let count=0,cpu=0,best=null;
 const evaluate=(s,p)=>{const t=performance.now(),velocity=launchVector(s,p,0),f=crossCandidate(velocity,spin,{arrivalHeight:c.arrivalHeight});count++;cpu+=performance.now()-t;return {speed:s,pitch:p,velocity,spin,flight:f,residual:Math.hypot(f.endpoint.p[0],f.endpoint.p[2])-intent.distance,heightResidual:f.apex-desired};};
 const vy=Math.sqrt(2*9.81*(desired-C.radius)),time=(vy+Math.sqrt(vy*vy-2*9.81*(c.arrivalHeight-C.radius)))/9.81;
 let s=clamp(Math.hypot(intent.distance/time,vy)*1.2,5,c.speedGuard),p=clamp(deg(Math.atan2(vy,intent.distance/time)),2,70);
 for(let k=0;k<12;k++){
  const e=evaluate(s,p),score=Math.hypot(e.residual,e.heightResidual*3);if(!best||score<best.score)best={...e,score};if(e.flight.hit&&Math.abs(e.residual)<.008&&Math.abs(e.heightResidual)<.008)break;
  const a=evaluate(s+.1,p),b=evaluate(s,p+.1),j00=(a.residual-e.residual)/.1,j10=(a.heightResidual-e.heightResidual)/.1,j01=(b.residual-e.residual)/.1,j11=(b.heightResidual-e.heightResidual)/.1,det=j00*j11-j01*j10;if(!Number.isFinite(det)||Math.abs(det)<1e-9)break;
  s=clamp(s-clamp((j11*e.residual-j01*e.heightResidual)/det,-6,6),5,c.speedGuard);p=clamp(p-clamp((-j10*e.residual+j00*e.heightResidual)/det,-12,12),2,70);
 }
 const valid=best.flight.hit&&Math.abs(best.residual)<.06&&Math.abs(best.heightResidual)<.04,yawOffset=-deg(Math.atan2(best.flight.endpoint.p[2],best.flight.endpoint.p[0]));
 return {...best,requestedArrivalSpeed:null,requestedApex:desired,valid,status:valid?'resolved':'UNRESOLVED: bounded curved aerial solve failed',candidates:count,trajectoryCpuMs:cpu,yawOffset,curve,calibration,sideSpin:spin[1],dominantFoot:i.dominantFoot??'right',contact:'inside of dominant foot'};
}
export function solveSpace(input){
 validateInput(input);const t=performance.now(),i=structuredClone(input);if(!['THROUGH','CROSS'].includes(i.family))throw Error('Space pass family required');
 if(i.family==='CROSS'&&(!Number.isFinite(i.attributes.curve??75)||(i.attributes.curve??75)<0||(i.attributes.curve??75)>99))throw Error('Curve must be 0–99');
 if(i.dominantFoot&&!['right','left'].includes(i.dominantFoot))throw Error('Invalid dominant foot');
 const intent=spaceIntent(i),s=i.family==='THROUGH'?throughSolve(intent):crossSolve(i,intent),yaw=intent.directYaw+s.yawOffset;
 const action={id:(i.passId??'pass')+':ideal',tick:0,position:i.origin.slice(),velocity:rotate(s.velocity,yaw),spin:rotate(s.spin,yaw),metadata:{version:SPACE.version,family:i.family,...(i.family==='CROSS'?{physics:'continuous-magnus'}:{})}};
 const ideal=simulate(action,intent.target),arrivalTime=ideal.plane?.time??s.flight.endpoint.time,axis=[Math.cos(rad(intent.directYaw)),Math.sin(rad(intent.directYaw))];
 const first=ideal.frames.filter(f=>f.time<=arrivalTime),reversed=first.some(f=>f.time>.01&&f.v[0]*axis[0]+f.v[2]*axis[1]<=0),maxHeading=Math.max(...first.map(f=>Math.abs(deg(Math.atan2(-f.v[0]*axis[1]+f.v[2]*axis[0],f.v[0]*axis[0]+f.v[2]*axis[1])))));
 const valid=s.valid&&!reversed&&maxHeading<80&&first.every(f=>[...f.p,...f.v,...f.w].every(Number.isFinite));
 return {input:i,intent,q:spaceCharge(i.family,i.holdMs),ceiling:SPACE[i.family==='THROUGH'?'through':'cross'].speedGuard,yaw,action,ideal,target:intent.target,arrivalTime,receiverArrival:i.receiver.position.map((v,k)=>v+i.receiver.velocity[k]*arrivalTime),solution:{...s,flight:undefined,valid,status:valid?'resolved':s.valid?'UNRESOLVED: path reversal or excessive sideways travel':s.status,reversed,maxHeading},performance:{candidates:s.candidates,trajectoryCpuMs:s.trajectoryCpuMs,resolverCpuMs:performance.now()-t}};
}
export async function executeSpace(input,solved=solveSpace(input)){
 if(!solved.solution.valid)throw Error(solved.solution.status);
 const t=performance.now(),i=structuredClone(input),draws=await (i.family==='CROSS'&&i.accuracyModel==='variation'?crossDraws:executionDraws)(i),attribute=i.family==='THROUGH'?'long_passing':'crossing',accuracy=passingAccuracy(i.family,i.attributes),redirect=Math.abs(((solved.intent.directYaw-(i.facingYaw??0)+540)%360)-180),d=solved.intent.distance;
 // Contact geometry only: Curve, Shot Power and solved launch speed cannot
 // feed back into accuracy. The two family accuracy ratings remain separate.
 const terms={floor:.12,distance:.85*(d/30)**2,redirection:.25*(redirect/180)**2,motion:.2*(magnitude(i.receiver.velocity)/8.2)**2},difficulty={value:Object.values(terms).reduce((a,b)=>a+b,0),terms,distance:d,redirectionDeg:redirect},sigma=i.accuracyModel==='variation'?(i.family==='CROSS'?crossPrecision(accuracy.effective,difficulty.value,solved,redirect,magnitude(i.receiver.velocity)):widerThroughPrecision(accuracy.effective,difficulty.value,solved)):i.accuracyModel==='candidate'?candidatePrecision(i.family,accuracy.effective,difficulty.value,solved):precision(i.family,accuracy.effective,difficulty.value);
 if(i.accuracyModel&&!['current','candidate','variation'].includes(i.accuracyModel))throw Error('Invalid passing accuracy model');
 const contact=i.accuracyModel==='candidate'||(i.accuracyModel==='variation'&&i.family==='THROUGH')?candidateErrors(i.family,sigma,draws.z):null;
 const execution=i.accuracyModel==='variation'&&i.family==='CROSS'?resolveCrossExecution(solved,sigma,draws):null;
 const direction=execution?execution.params[2]-solved.yaw:contact?.direction??sigma.sigmaDirection*draws.z.direction,weight=execution?execution.params[0]/magnitude(solved.action.velocity)-1:contact?.weight??sigma.sigmaWeight*draws.z.weight,elevation=execution?execution.params[1]-solved.solution.pitch:i.family==='CROSS'?(contact?.elevation??sigma.sigmaElevation*draws.z.elevation):0,idealSpeed=magnitude(solved.action.velocity),speed=clamp(idealSpeed*(1+weight),.5,solved.ceiling),pitch=clamp(solved.solution.pitch+elevation,0,85);
 const velocity=launchVector(speed,pitch,solved.yaw+direction),spin=rotate(contact&&i.family==='THROUGH'?solved.solution.spin.map(w=>w*contact.backspinMultiplier):solved.solution.spin,solved.yaw+direction),actualAction={...(execution?.action??{...solved.action,velocity,spin}),id:i.passId??'pass'};
 const audit={...(execution?{executionDistribution:execution.error,executionSolve:execution.diagnostics}:{}),version:SPACE.version,input:i,attribute,accuracy,effectivePassingAccuracy:accuracy.effective,primaryRating:i.attributes[attribute],rating:accuracy.effective,charge:{holdMs:i.holdMs,normalized:solved.q,fullMs:SPACE[i.family==='THROUGH'?'through':'cross'].fullMs},intent:solved.intent,idealTarget:solved.target,receiverAtIdealArrival:solved.receiverArrival,ceiling:solved.ceiling,difficulty,sigma,draws,error:{directionDeg:direction,requestedWeightFraction:weight,appliedWeightFraction:speed/idealSpeed-1,elevationDeg:elevation,spinRadPerSecond:actualAction.spin[1]-solved.action.spin[1],spinFraction:execution?.error.spinFraction??0,...(contact?{ratingError:contact.ratingError,backspinMultiplier:contact.backspinMultiplier}: {})},idealLaunch:solved.action,actualLaunch:actualAction,idealArrival:solved.ideal.plane,solver:solved.solution,performance:{...solved.performance,executionCpuMs:performance.now()-t},excludedContext:['shot power','pressure','fatigue','receiving','match AI']};
 return {audit,actualAction,idealAction:solved.action,ideal:solved.ideal,target:solved.target,arrivalTime:solved.arrivalTime};
}
export const prepareSpace=async i=>executeSpace(i,solveSpace(i));
export function dyingEndpoint(flight){
 const speed=SPACE.through.endpointSpeed;
 for(let n=2;n<flight.frames.length;n++){const a=flight.frames[n-1],b=flight.frames[n],va=Math.hypot(a.v[0],a.v[2]),vb=Math.hypot(b.v[0],b.v[2]);if(va>speed&&vb<=speed)return blend(a,b,(va-speed)/(va-vb));}
 return null;
}
export function journeySamples(prepared,flight=prepared.ideal){
 const o=prepared.idealAction.position,t=prepared.target,d=Math.hypot(t[0]-o[0],t[2]-o[2]),u=[(t[0]-o[0])/d,(t[2]-o[2])/d],frames=flight.frames;
 return [0,.25,.5,.75,1].map(q=>{let f=q===0?{...frames[0],v:flight===prepared.ideal?prepared.idealAction.velocity:prepared.actualAction.velocity,w:flight===prepared.ideal?prepared.idealAction.spin:prepared.actualAction.spin}:null;for(let n=1;!f&&n<frames.length;n++){const a=frames[n-1],b=frames[n],pa=(a.p[0]-o[0])*u[0]+(a.p[2]-o[2])*u[1],pb=(b.p[0]-o[0])*u[0]+(b.p[2]-o[2])*u[1];if(pa<=q*d&&pb>=q*d)f=blend(a,b,(q*d-pa)/(pb-pa));}return {progress:q,speed:f?Math.hypot(f.v[0],f.v[2]):null,time:f?.time??null,position:f?.p??null,spin:f?.w??null};});
}
export function whipMetrics(p,flight=p.ideal){
 const o=p.idealAction.position,t=p.target,d=Math.hypot(t[0]-o[0],t[2]-o[2]),ux=(t[0]-o[0])/d,uz=(t[2]-o[2])/d,frames=flight.frames.filter(f=>f.time<=p.arrivalTime),bend=Math.max(...frames.map(f=>Math.abs((f.p[2]-o[2])*ux-(f.p[0]-o[0])*uz))),a=flight.plane;
 return {spin:magnitude(p.idealAction.spin),sideSpin:p.audit.solver.sideSpin,maxDeparture:bend,outsideAim:p.audit.solver.yawOffset,arrivalAngle:a?deg(Math.atan2(a.v[2]*ux-a.v[0]*uz,a.v[0]*ux+a.v[2]*uz)):null,target:a?.p??null,landing:flight.landing?.p??null,apex:flight.apex.height,arrivalHeight:a?.p[1]??null,arrivalVertical:a?.v[1]??null,arrivalHorizontal:a?Math.hypot(a.v[0],a.v[2]):null};
}

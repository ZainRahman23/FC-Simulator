import fs from 'node:fs';
import assert from 'node:assert/strict';
import {C,defaultInput,solveIdeal,execute,preparePass,measurements,precision} from './resolver.mjs';
import {simulate} from './physics.mjs';
import {magnitude} from './config.mjs';
const ratings=[10,20,30,40,50,60,70,80,90,99],matrix=[],checks=[];
const check=(name,condition)=>{assert.ok(condition,name);checks.push(name);};
async function runCase(id,label,i){
 i.drawEventId='matrix-matched-1';i.passId=id;
 const solved=solveIdeal(i);let previous=null,previousZ=null;
 for(const rating of ratings){const input=structuredClone(i);input.attributes[C.ratingAttribute[input.family]]=rating;const p=await execute(input,solved),a=simulate(p.actualAction,p.target,p.arrivalTime),m=measurements(p,a),sigma=p.audit.sigma,draws=p.audit.draws.z;
  check(id+':'+rating+': finite physics',a.frames.every(f=>[...f.p,...f.v,...f.w].every(Number.isFinite)));
  check(id+':'+rating+': one launch',a.launchCount===1);
  check(id+':'+rating+': ceiling',magnitude(p.actualAction.velocity)<=solved.ceiling+1e-9);
  if(previous!==null)check(id+':'+rating+': sigma decreases',sigma.sigmaDirection<previous);
  if(previousZ)check(id+':'+rating+': matched draw',JSON.stringify(draws)===previousZ);
  previous=sigma.sigmaDirection;previousZ=JSON.stringify(draws);
  matrix.push({id,label,family:i.family,rating,hold:i.holdMs,receiverSpeed:magnitude(i.receiver.velocity),origin:i.origin,receiver:i.receiver,aim:i.aimPoint,idealTarget:p.target,idealSpeed:magnitude(p.idealAction.velocity),actualSpeed:magnitude(p.actualAction.velocity),yawError:p.audit.error.directionDeg,weightError:p.audit.error.appliedWeightFraction,elevationError:p.audit.error.elevationDeg,sigma,difficulty:p.audit.difficulty,draws,solver:p.audit.solver,performance:p.audit.performance,...m});
 }return solved;
}
for(const d of [5,10,15,20,25,30])for(const hold of [100,270,460]){const i=defaultInput();i.receiver.position=i.aimPoint=[65+d,.11,34];i.holdMs=hold;await runCase(`short-${d}-${hold}`,`${d} m · ${hold} ms`,i);}
for(const [speedName,speed] of [['jog',3],['run',5],['sprint',8.2]])for(const [distanceName,d] of [['short',8],['medium',16],['long',25]]){const i=defaultInput();i.family='THROUGH';i.receiver.position=i.aimPoint=[65+d,.11,34+d*.2];i.receiver.velocity=[speed*.94,0,speed*Math.sqrt(1-.94**2)];await runCase(`through-${speedName}-${distanceName}`,`${speedName} · ${distanceName} (${d} m forward)`,i);}
for(const [name,x,z] of [['byline',101,12],['box-edge',88.5,12],['wide-23m',82,10],['deeper-wide',71,12]])for(const [area,tz] of [['near',28],['central',34],['far',40]]){const i=defaultInput();i.family='CROSS';i.origin=[x,.11,z];i.receiver.position=i.aimPoint=[94,.11,tz];i.facingYaw=Math.atan2(tz-z,94-x)*180/Math.PI;await runCase(`cross-${name}-${area}`,`${name} → ${area}`,i);}
const examples=[];
for(const family of ['SHORT','THROUGH','CROSS'])for(const level of ['easy','difficult']){const i=defaultInput();i.family=family;const easy=level==='easy';i.receiver.position=i.aimPoint=easy?[70,.11,34]:[82.68,.11,51.68];i.facingYaw=0;i.holdMs=easy?180:400;
 if(family==='THROUGH')i.receiver.velocity=easy?[3,0,0]:[4.7,0,1.7];
 if(family==='CROSS'){i.origin=easy?[90,.11,22]:[74,.11,10];i.receiver.position=i.aimPoint=easy?[94,.11,30]:[94,.11,40];i.attributes.shot_power=99;}
 const before=matrix.length;await runCase(`example-${family}-${level}`,`${family} ${level}`,i);examples.push(...matrix.splice(before).filter(r=>[10,60,80,90,99].includes(r.rating)));
}
// Physical and contract regression cases beyond the calibration matrices.
for(const family of ['SHORT','THROUGH','CROSS']){
 const i=defaultInput();i.family=family;if(family==='THROUGH')i.receiver.velocity=[3,0,0];
 const a=await preparePass(i),b=await preparePass(i),fa=simulate(a.actualAction,a.target,a.arrivalTime),fb=simulate(b.actualAction,b.target,b.arrivalTime);
 check(family+': deterministic launch',JSON.stringify(a.actualAction)===JSON.stringify(b.actualAction));check(family+': deterministic physical trace',JSON.stringify(fa)===JSON.stringify(fb));
 const changed=structuredClone(i);changed.source='AI';changed.attributes.vision=1;const ai=await preparePass(changed);check(family+': source and Vision do not change launch',JSON.stringify(a.actualAction)===JSON.stringify(ai.actualAction));
 const r=structuredClone(i);r.attributes[C.ratingAttribute[family]]=99;const elite=await preparePass(r);check(family+': rating does not change ideal',JSON.stringify(elite.idealAction)===JSON.stringify(a.idealAction));check(family+': nonzero floor',elite.audit.sigma.sigmaDirection>0);
 const newKey=structuredClone(i);newKey.drawEventId='fresh-event';const fresh=await preparePass(newKey);check(family+': new event changes draws',JSON.stringify(fresh.audit.draws.z)!==JSON.stringify(a.audit.draws.z));
}
const far=defaultInput();far.attributes.shot_power=1;far.receiver.position=far.aimPoint=[104,.11,34];const infeasible=await preparePass(far);check('Unreachable target honestly flagged',!infeasible.audit.solver.valid);check('Unreachable launch respects ceiling',magnitude(infeasible.actualAction.velocity)<=infeasible.audit.ceiling+1e-9);
const short=matrix.filter(r=>r.family==='SHORT');check('99 simple 10 m within 1 cm',short.filter(r=>r.rating===99&&r.id.startsWith('short-10-')).every(r=>r.physicalMiss<.01));
for(const family of ['SHORT','THROUGH','CROSS']){const e=examples.find(r=>r.family===family&&r.id.endsWith('easy')&&r.rating===60),d=examples.find(r=>r.family===family&&r.id.endsWith('difficult')&&r.rating===60);check(family+': easy compression',e.sigma.sigmaDirection<d.sigma.sigmaDirection&&e.physicalMiss<d.physicalMiss);}
const perf=Object.fromEntries(['SHORT','THROUGH','CROSS'].map(f=>{const rows=matrix.filter(r=>r.family===f&&r.rating===80);return [f,{cases:rows.length,maxCandidates:Math.max(...rows.map(r=>r.performance.candidates)),worstResolverMs:Math.max(...rows.map(r=>r.performance.resolverCpuMs)),meanResolverMs:rows.reduce((n,r)=>n+r.performance.resolverCpuMs,0)/rows.length,worstTrajectoryMs:Math.max(...rows.map(r=>r.performance.trajectoryCpuMs)),unresolved:rows.filter(r=>!r.solver.valid).map(r=>r.id)}];}));
fs.writeFileSync(new URL('calibration.json',import.meta.url),JSON.stringify({version:C.version,constants:C,ratings,matrix,examples,performance:perf},null,2));
fs.writeFileSync(new URL('validation.json',import.meta.url),JSON.stringify({passed:checks.length,failed:0,checks,performance:perf},null,2));
console.log(JSON.stringify({rows:matrix.length,examples:examples.length,checks:checks.length,perf},null,2));

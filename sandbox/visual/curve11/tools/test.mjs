import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
import {launch,solveTarget,makeReview,BallWorld,trace} from '../experiments.js';
import {launch as oldLaunch,solveTarget as oldSolve,trace as oldTrace,maxDeparture,BallWorld as OldWorld} from '../../curve1simple/experiments.js';
import {runShot} from '../../curve1/keeper-simulation.js';
import {COURTOIS as OldKeeper,SCENARIO as OldScenario} from '../../curve1simple/config.js';
import {COURTOIS,SCENARIO,RATINGS,EXPONENT,SPIN_AT_75,MAGNITUDE_MULTIPLIER,DEFAULT_CURVE} from '../config.js';
import {health} from '../health.js';
import {CAMERA as OldCamera,behindSVG as OldRender} from '../../curve1simple/render.js';import {CAMERA,behindSVG} from '../render.js';
const root=fileURLToPath(new URL('..',import.meta.url)),repo=path.resolve(root,'../../..'),workspace=process.env.SHOT_WORKSPACE_ROOT??path.resolve(repo,'../..'),read=n=>JSON.parse(fs.readFileSync(path.join(root,'evidence',n+'.json'))),d=read('review'),old=JSON.parse(fs.readFileSync(path.join(root,'../curve1simple/evidence/review.json'))),tests=[],hash=b=>crypto.createHash('sha256').update(b).digest('hex'),near=(a,b,e=1e-10)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`),plain=o=>JSON.parse(JSON.stringify(o));
function test(name,fn){try{const detail=fn();tests.push({name,pass:true,detail});console.log('PASS',name);}catch(e){tests.push({name,pass:false,error:e.stack});console.error('FAIL',name,e.message);}}
test('exact eleven requested ratings, 75 default, fixed global 56 anchor and 1.40 multiplier',()=>{
 assert.deepEqual(RATINGS,[0,25,50,60,70,75,80,85,90,95,99]);assert.equal(d.runs.length,11);assert.deepEqual(d.runs.map(r=>r.curve),RATINGS);assert.equal(DEFAULT_CURVE,75);assert.equal(SPIN_AT_75,56);assert.equal(MAGNITUDE_MULTIPLIER,1.4);assert.equal(EXPONENT,2.7);
});
test('every rating has exactly 1.40 times intentional spin and unchanged relative capability',()=>{
 for(const r of d.runs){const a=r.physical.action,o=old.runs.find(x=>x.curve===r.curve).physical.action;assert.equal(a.spin[1],o.spin[1]*1.4);near(a.spin[1],56*(r.curve/75)**2.7,1e-12);assert.equal(a.metadata.curve.capability,o.metadata.curve.capability);assert.equal(a.metadata.curve.exponent,2.7);assert.equal(a.metadata.curve.referenceSpin,56);if(r.curve)near(a.spin[1]/56,o.spin[1]/40,1e-12);}
 return {ratio99To75:d.runs.at(-1).physical.action.spin[1]/56,oldRatio99To75:old.runs.at(-1).physical.action.spin[1]/40};
});
test('zero Curve has zero intentional contribution and identical physical trajectory',()=>{
 const r=d.runs[0],o=old.runs[0];assert.equal(r.physical.action.spin[1],0);assert.equal(r.physical.action.metadata.curve.intentionalSideSpin,0);assert.deepEqual(r.physical.action.metadata.spinAxis,[0,0,0]);assert.deepEqual(r.aim,o.aim);assert.deepEqual(r.physical.frames,o.physical.frames);near(r.physical.metrics.maxSignedDepartureFirstFlight.metres,0,1e-10);
});
test('same frozen speed and all non-spin launch, foot, execution and body inputs',()=>{
 for(const r of d.runs){const a=r.physical.action,o=plain(oldLaunch(SCENARIO,r.curve,r.aim)),m=a.metadata;assert.deepEqual(a.velocity,o.velocity);assert.deepEqual(a.position,o.position);const omit=x=>Object.fromEntries(Object.entries(x).filter(([k])=>!['spin','metadata'].includes(k)));assert.deepEqual(omit(a),omit(o));assert.deepEqual(m.context,o.metadata.context);assert.deepEqual(m.attributes,o.metadata.attributes);assert.equal(m.attributes.shotPower,80);assert.equal(m.context.selectedFoot,'R');assert.equal(m.executionFactor,o.metadata.executionFactor);assert.equal(m.chargeFactor,o.metadata.chargeFactor);assert.equal(m.speed,27.15099715099715);near(Math.hypot(...a.velocity),m.speed,1e-12);near(a.spin[0],o.spin[0]);near(a.spin[2],o.spin[2]);}
});
test('exact same targeted solver algorithm, physical trace, world, camera, renderer and Courtois',()=>{
 assert.equal(solveTarget.toString(),oldSolve.toString());assert.equal(trace,oldTrace);assert.equal(BallWorld,OldWorld);assert.equal(COURTOIS,OldKeeper);assert.equal(SCENARIO,OldScenario);assert.equal(CAMERA,OldCamera);assert.equal(behindSVG,OldRender);const g=d.runs[0].keeper.frames[0].keeper;for(const r of d.runs){assert.deepEqual(r.scenario,SCENARIO);assert.deepEqual(r.keeper.frames[0].keeper,g);}
 return {sameInitialGuess:true,sameNewtonSolver:true,sameTolerance:1e-7,camera:CAMERA,origin:SCENARIO.origin,target:SCENARIO.target,keeper:COURTOIS};
});
test('natural target solve and unchanged bend definition for all ratings',()=>{
 let aim=-1,bend=-1;for(const r of d.runs){assert.ok(r.aimError<1e-7);r.physical.plane.p.forEach((x,i)=>near(x,SCENARIO.target[i],1e-7));assert.ok(r.aimOffset.degrees>aim);assert.ok(r.physical.metrics.maxSignedDepartureFirstFlight.metres>bend);aim=r.aimOffset.degrees;bend=r.physical.metrics.maxSignedDepartureFirstFlight.metres;assert.deepEqual(maxDeparture(SCENARIO,r.physical.frames,r.physical.metrics.firstFlightEndTime),r.physical.metrics.maxSignedDepartureFirstFlight);if(r.curve){assert.ok(r.aimOffset.degrees>old.runs.find(o=>o.curve===r.curve).aimOffset.degrees);assert.ok(r.physical.metrics.curvature.every(c=>c.normalAcceleration<0));}}
});
test('99 full first flight is finite, forward, continuous and naturally targeted; rejection gates work',()=>{
 const r=d.runs.at(-1),h=health(r.physical);assert.deepEqual(h,r.health);assert.equal(h.rejected,false);assert.ok(h.minWorldForwardSpeed>0&&h.minTargetLineForwardSpeed>0);assert.ok(h.maxOffTargetHeadingDegrees<45);assert.ok(h.firstFlightEndTime>r.physical.plane.t);assert.ok(h.maxHeadingChangePerStepDegrees<.5);assert.ok(h.finite);assert.equal(h.ccdExhausted,0);
 const p=plain(r.physical);p.frames[2].v=[-1,0,0];assert.ok(health(p).reasons.includes('Forward reversal'));
 const s=plain(r.physical),dx=21,dz=11.25,l=Math.hypot(dx,dz);s.frames[2].v=[-dz/l,0,dx/l];assert.ok(health(s).reasons.includes('Lateral travel dominates progress toward the intended target'));
 return h;
});
test('unforced keeper results independently reproduce with frozen runtime',()=>{
 return d.runs.map(r=>{const k=runShot(r.physical,{profile:COURTOIS,record:true}),recorded={...r.keeper};delete recorded.metrics;assert.deepEqual(plain(k),recorded);return {curve:r.curve,result:k.outcome,contacts:k.contacts.length};});
});
test('postlaunch metadata cannot steer and complete eleven-shot replay is deterministic',()=>{
 const a=d.runs.at(-1).physical.action,w=new BallWorld({p:a.position}),v=new BallWorld({p:a.position});w.launch(a);v.launch({...a,metadata:{target:[-99,99,-99],curve:1,anchor:1,postLaunchControl:true}});for(let i=0;i<100;i++){w.step();v.step();assert.deepEqual(w.snapshot(),v.snapshot());}
 assert.equal(hash(JSON.stringify(makeReview())),d.parity.sha256);return d.parity;
});
test('all frozen visual sources and historical outputs retain exact hashes',()=>{
 const p=read('preservation');for(const f of p.files)assert.equal(hash(fs.readFileSync(path.join(repo,f.file))),f.sha256,f.file);for(const f of p.historicalOutputs)assert.equal(hash(fs.readFileSync(path.join(workspace,f.file))),f.sha256,f.file);return {sourceFiles:p.files.length,historicalOutputs:p.historicalOutputs.length};
});
const result={passed:tests.filter(t=>t.pass).length,total:tests.length,tests};fs.writeFileSync(path.join(root,'evidence/tests.json'),JSON.stringify(result,null,2)+'\n');console.log(`${result.passed}/${result.total} passed`);if(result.passed!==result.total)process.exitCode=1;

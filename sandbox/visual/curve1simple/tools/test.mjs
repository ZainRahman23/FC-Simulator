import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {BallWorld,makeReview,launch,trace,departure,maxDeparture} from '../experiments.js';
import {BallWorld as ExistingWorld} from '../../curve1/world.js';
import {scheduledLaunch as existingLaunch} from '../../curve1/resolver.js';
import {scheduledLaunch as powerLaunch} from '../../ballshot12/resolver.js';
import {runShot,onTarget} from '../../curve1/keeper-simulation.js';
import {COURTOIS as EXISTING_COURTOIS} from '../../curve1/config.js';
import {COURTOIS,RATINGS,SCENARIO,SHOT_POWER,DEFAULT_CURVE,SPIN_AT_75,EXPONENT} from '../config.js';

const root=fileURLToPath(new URL('..',import.meta.url)),repo=path.resolve(root,'../../..'),workspace=process.env.SHOT_WORKSPACE_ROOT??path.resolve(repo,'../..'),out=path.join(root,'evidence'),read=n=>JSON.parse(fs.readFileSync(path.join(out,n+'.json'))),review=read('review'),tests=[];
const hash=x=>crypto.createHash('sha256').update(x).digest('hex'),near=(a,b,e=1e-10)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);
function test(name,fn){try{const detail=fn();tests.push({name,pass:true,detail});console.log('PASS',name);}catch(e){tests.push({name,pass:false,error:e.stack});console.error('FAIL',name,e.message);}}

test('exact requested eleven ratings, one legal outside-box left-half-space setup, default 75',()=>{
 assert.deepEqual(RATINGS,[0,25,50,60,70,75,80,85,90,95,99]);assert.deepEqual(review.runs.map(r=>r.curve),RATINGS);assert.equal(DEFAULT_CURVE,75);assert.equal(review.defaultCurve,75);assert.equal(SHOT_POWER,80);
 assert.equal(SCENARIO.origin[0],84);assert.ok(SCENARIO.origin[0]<105-16.5);assert.ok(SCENARIO.origin[2]<34);assert.ok(onTarget({p:SCENARIO.target}));assert.ok(SCENARIO.target[2]>34&&SCENARIO.target[1]>2);
 const base=review.runs[0].physical.action.metadata;
 for(const r of review.runs){assert.deepEqual(r.scenario,SCENARIO);assert.equal(r.mode,'targeted');const m=r.physical.action.metadata;assert.deepEqual(m.context,base.context);assert.deepEqual({...m.attributes,curve:0},{...base.attributes,curve:0});assert.equal(m.attributes.preferredFoot,'R');assert.equal(m.context.selectedFoot,'R');assert.equal(m.executionFactor,1);assert.equal(m.chargeFactor,1);}
 return {origin:SCENARIO.origin,target:SCENARIO.target,defaultCurve:75};
});
test('unchanged SP80 Finesse resolver velocity/speed and exact frozen 40*(Curve/75)^2.7 magnitude',()=>{
 for(const r of review.runs){const input={family:'INSIDE',shotPower:80,charge:1,attributes:{curve:r.curve,preferredFoot:'R'},context:{selectedFoot:'R'},aim:r.aim},contact={position:SCENARIO.origin},inherited=existingLaunch(input,contact),power=powerLaunch({...input,attributes:{...input.attributes,curve:Math.max(1,r.curve)}},contact),a=r.physical.action;
  assert.deepEqual(a.velocity,inherited.velocity);assert.deepEqual(a.velocity,power.velocity);near(Math.hypot(...a.velocity),27.15099715099715);near(a.spin[1],SPIN_AT_75*(r.curve/75)**EXPONENT);near(a.spin[0],inherited.spin[0]);near(a.spin[2],inherited.spin[2]);assert.equal(a.spin[1],r.curve===0?0:-inherited.spin[1]);assert.deepEqual(a.metadata.techniqueDirection.inheritedSpin,JSON.parse(JSON.stringify(inherited.spin)));assert.equal(a.metadata.executionFactor,inherited.metadata.executionFactor);assert.equal(a.metadata.chargeFactor,inherited.metadata.chargeFactor);
 }
 return {speed:27.15099715099715,anchor:SPIN_AT_75,exponent:EXPONENT,signedCorrectionOnly:true};
});
test('right-foot inward direction is physical from first step; no mirrored trajectory or late hook',()=>{
 for(const r of review.runs){const m=r.physical.metrics;assert.ok(m.finite);assert.ok(!m.reversed);assert.ok(!m.preGoalTurfContact);assert.ok(m.maxTurnStepDegrees<.13);assert.equal(r.physical.stats.ccdExhausted,0);
  if(r.curve){assert.ok(r.physical.action.spin[1]>0);assert.ok(m.curvature.length>200);assert.ok(m.curvature.every(c=>c.normalAcceleration<0));assert.ok(m.goal.bend<0);assert.ok(departure(SCENARIO,r.physical.frames[2].p)>0);}
  else{assert.ok(m.curvature.every(c=>Math.abs(c.normalAcceleration)<1e-8));near(m.maxSignedDepartureFirstFlight.metres,0,1e-10);}
 }
});
test('same target solved before launch at common precision; outside yaw/ray offset/bend increase',()=>{
 let lastDegrees=-1,lastRay=-1,lastBend=-1;
 for(const r of review.runs){assert.ok(r.aimError<1e-7);r.physical.plane.p.forEach((x,i)=>near(x,SCENARIO.target[i],1e-7));assert.ok(onTarget(r.physical.whole));assert.ok(r.aim.yawDeg>=-75&&r.aim.yawDeg<=75);assert.ok(r.aim.elevationDeg>=0&&r.aim.elevationDeg<=75);const a=r.aimOffset,b=r.physical.metrics.maxSignedDepartureFirstFlight.metres;assert.ok(a.degrees>lastDegrees);assert.ok(a.initialRayGoalPlaneOffsetMetres>lastRay);assert.ok(b>lastBend);lastDegrees=a.degrees;lastRay=a.initialRayGoalPlaneOffsetMetres;lastBend=b;}
 near(review.runs[0].aimOffset.degrees,0,1e-10);
 return {maximumTargetError:Math.max(...review.runs.map(r=>r.aimError)),outsideAimAt99:review.runs.at(-1).aimOffset};
});
test('departure is signed perpendicular distance from direct target line, separately measured for actual flight',()=>{
 near(departure(SCENARIO,SCENARIO.origin),0);near(departure(SCENARIO,SCENARIO.target),0);assert.ok(departure(SCENARIO,[95,2,40])>0);
 for(const r of review.runs){const m=r.physical.metrics;assert.ok(m.firstFlightCompleted);assert.ok(m.firstFlightEndTime>r.physical.plane.t);assert.deepEqual(maxDeparture(SCENARIO,r.physical.frames,m.firstFlightEndTime),m.maxSignedDepartureFirstFlight);const km=r.keeper.metrics;assert.deepEqual(maxDeparture(SCENARIO,r.keeper.frames,km.measurementEndTime),km.maxSignedDepartureBeforeContactOrPlane);assert.ok(km.measurementEndTime<=r.keeper.end.t);if(r.keeper.contacts.length)assert.ok(km.measurementEndTime<=r.keeper.contacts[0].t);}
});
test('imports reuse exact existing continuous Magnus world and Courtois fixture',()=>{
 assert.equal(BallWorld,ExistingWorld);assert.equal(COURTOIS,EXISTING_COURTOIS);const a=new BallWorld(),b=new ExistingWorld();assert.deepEqual(a.cfg,b.cfg);assert.deepEqual(a.curveLaw,b.curveLaw);assert.equal(a.curveLaw.gain,1);assert.equal(a.curveLaw.early,1);assert.equal(a.curveLaw.quench,0);
 const first=review.runs[0].keeper.frames[0].keeper;for(const r of review.runs)assert.deepEqual(r.keeper.frames[0].keeper,first);
 return {world:'../curve1/world.js',goalkeeper:'../curve1/keeper-simulation.js',fixture:COURTOIS};
});
test('keeper outcomes are unforced authoritative replay results with complete recorded frames',()=>{
 const outcomes=[];for(const r of review.runs){const actual=runShot(r.physical,{profile:COURTOIS,record:true});assert.deepEqual(JSON.parse(JSON.stringify(actual)),Object.fromEntries(Object.entries(r.keeper).filter(([k])=>k!=='metrics')));assert.ok(actual.frames.length>200);assert.equal(actual.frames[0].time,0);assert.ok(actual.frames.every(f=>f.keeper&&f.p&&f.v&&f.w));outcomes.push({curve:r.curve,outcome:actual.outcome,contacts:actual.contacts.length});}return outcomes;
});
test('target/rating audit metadata cannot steer post-launch velocity, position or spin',()=>{
 const action=review.runs.at(-1).physical.action,a=new BallWorld({p:action.position}),b=new BallWorld({p:action.position});a.launch(action);b.launch({...action,metadata:{target:[-100,50,-100],curve:0,shotPower:1,postLaunchControl:true}});for(let i=0;i<180;i++){a.step();b.step();assert.deepEqual(a.snapshot(),b.snapshot());}
 const replay=trace(action);assert.deepEqual(JSON.parse(JSON.stringify(replay.frames)),review.runs.at(-1).physical.frames);
});
test('full-precision eleven-shot physical plus Courtois review replay is deterministic',()=>{const raw=JSON.stringify(makeReview());assert.equal(hash(raw),review.parity.sha256);assert.equal(Buffer.byteLength(raw),review.parity.bytes);return review.parity;});
test('all pre-existing tracked files and historical outputs preserve their recorded SHA-256',()=>{
 const p=read('preservation');assert.ok(p.files.length>0);for(const r of p.files)assert.equal(hash(fs.readFileSync(path.join(repo,r.file))),r.sha256,r.file);for(const r of p.historicalOutputs??[])assert.equal(hash(fs.readFileSync(path.join(workspace,r.file))),r.sha256,r.file);return {preservedTrackedFiles:p.files.length,preservedHistoricalOutputs:p.historicalOutputs?.length??0};
});
const result={passed:tests.filter(t=>t.pass).length,total:tests.length,tests};fs.writeFileSync(path.join(out,'tests.json'),JSON.stringify(result,null,2)+'\n');console.log(`${result.passed}/${result.total} passed`);if(result.passed!==result.total)process.exitCode=1;

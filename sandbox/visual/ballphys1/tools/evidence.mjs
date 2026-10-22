import fs from 'node:fs';import {performance} from 'node:perf_hooks';import crypto from 'node:crypto';
import {BallWorld,PARAMETERS} from '../ball.js';import {SCENARIOS,runScenario,makeScenario} from '../scenarios.js';import {fullCharacter} from '../fixtures.js';import {references} from './reference.mjs';import {resolvedAction,spinForLegacyCurve} from '../adapter.js';import {len,sub} from '../math.js';
const out=new URL('../evidence/',import.meta.url);const write=(name,data)=>fs.writeFileSync(new URL(name,out),JSON.stringify(data));
const scenes=SCENARIOS.map(s=>runScenario(s));
const hash=crypto.createHash('sha256').update(JSON.stringify(scenes.map(s=>[s.frames,s.events]))).digest('hex');
function range(frames){const moving=frames.filter(f=>len(f.v)>.015);return {distance:len(sub(frames.at(-1).p,frames[0].p)),lastMovingTime:moving.at(-1)?.time||0,peak:Math.max(...frames.map(f=>f.p[1]-.11))};}
const comparisons=references().map(r=>{const b=r.initial,spin=b.curve?spinForLegacyCurve(b.curve.s,b.curve.sgn,r.curveK):undefined;
 const action=resolvedAction({...b,...r,metadata:{targetDistance:r.targetDistance}},{id:r.id,tick:0,spin});
 const w=new BallWorld();w.schedule(action);const frames=[w.snapshot()];for(let i=0;i<1200;i++)frames.push(w.step());
 const old=range(r.frames),fresh=range(frames);return {...r,newFrames:frames,newLaunch:action,oldMetrics:old,newMetrics:fresh,rangeRatio:fresh.distance/old.distance,status:'RECALIBRATION REQUIRED — not promoted to match'};});
const rows=[];
for(const speed of [.04,.1,1,3,6,12,20]){const w=new BallWorld({v:[speed,0,0],w:[0,0,-speed/.11]});for(let i=0;i<3600&&!w.ball.sleeping;i++)w.step();rows.push({speed,distance:w.ball.p[0],timeToRest:w.time});}
function bench(name,cfg){const batches=[];for(let k=0;k<8;k++){const w=new BallWorld(cfg);for(let i=0;i<100;i++)w.step();const t=performance.now();for(let i=0;i<2000;i++)w.step();batches.push((performance.now()-t)/2000);}batches.sort((a,b)=>a-b);return {name,medianMs:batches[4],maxBatchMs:batches.at(-1),stepsPerBatch:2000,batches:8};}
const players=Array.from({length:22},(_,i)=>fullCharacter([i*3,0,8+(i%2)*4],`p${i}`)).flat();
const performanceRows=[bench('free airborne + aerodynamics',{p:[0,1000000,0],v:[25,5,0],w:[0,45,0]}),bench('ground friction + spin',{v:[20,0,0],w:[0,0,-20/.11]}),bench('22 players / 308 actual body colliders',{p:[0,1000000,0],v:[25,0,0],colliders:players})];
// Contact-heavy benchmark keeps scene duration short and excludes hull compilation.
for(const id of ['blocked-shot','tackle-loose','post-rebound']){let ms=0,steps=0,queries=0;for(let i=0;i<100;i++){const w=makeScenario(id),t=performance.now();for(let j=0;j<30;j++)w.step();ms+=performance.now()-t;steps+=30;queries+=w.stats.distanceQueries;}performanceRows.push({name:`CCD ${id}`,meanMs:ms/steps,distanceQueriesPerStep:queries/steps});}
write('review.json',{version:'BALL-PHYS-1 / 1',hash,scenes,comparisons,rolling:rows,performance:performanceRows,parameters:PARAMETERS});
write('summary.json',{version:'BALL-PHYS-1 / 1',hash,sceneCount:scenes.length,rolling:rows,performance:performanceRows,comparisons:comparisons.map(({id,oldMetrics,newMetrics,rangeRatio,status})=>({id,oldMetrics,newMetrics,rangeRatio,status}))});
console.log(JSON.stringify({hash,rolling:rows,performance:performanceRows,comparison:comparisons.map(c=>({id:c.id,old:c.oldMetrics.distance,new:c.newMetrics.distance,ratio:c.rangeRatio}))},null,2));

import {BallWorld as FoundationWorld} from '../../ballphys1/ball.js';import {BALANCED} from '../config.js';import {LAWS,resistance} from '../world.js';import {groundMatrix,curveBracket} from '../experiments.js';import {actionExperiment as oldAction} from '../../ballfeel1/experiments.js';
import assert from 'node:assert/strict';import vm from 'node:vm';import {touchlineProjection} from '../../ballfeel1/camera.js';import fs from 'node:fs';import {GLOBAL,FAMILIES} from '../config.js';import {resolveLaunch,resolveExecution,fromLegacyDecision,scheduledLaunch} from '../resolver.js';import {actionExperiment,parityPayload,lowSpeed} from '../experiments.js';import {BallWorld} from '../world.js';
const tests=[];const test=(name,fn)=>{try{const detail=fn();tests.push({name,pass:true,detail});console.log('PASS',name);}catch(e){tests.push({name,pass:false,error:e.stack});console.error('FAIL',name,e.message);}};const eq=(a,b)=>assert.equal(JSON.stringify(a),JSON.stringify(b));
for(const family of Object.keys(FAMILIES))test(family+' continuous monotone power',()=>{let prev=-1;for(let n=0;n<=100;n++){const r=resolveLaunch({family,power:n/100});assert.ok(r.audit.horizontalSpeed>=prev);if(n)assert.ok(r.audit.horizontalSpeed-prev<.25);prev=r.audit.horizontalSpeed;}return {end:prev};});
test('ground continuum estimate matches measured arrival within 0.025 m/s',()=>{for(const family of ['short','ground','firm'])for(const distance of [5,10,15,20,30])for(const power of [.15,.5,.85]){const r=actionExperiment(family,{distance,power});if(!r.launch.audit.capped)assert.ok(Math.abs(r.metrics.arrival.speed-r.launch.audit.baseArrival)<.025);}});
test('resolver does not mutate intent / environment',()=>{const a={family:'ground',actionId:'immutable',execution:{quality:.8}},before=JSON.stringify(a),cfg=JSON.stringify(GLOBAL);resolveLaunch(a);assert.equal(JSON.stringify(a),before);assert.equal(JSON.stringify(GLOBAL),cfg);});
test('inside/outside and left/right reverse spin exactly',()=>{const r=resolveLaunch({family:'curve',selectedFoot:'R'}),l=resolveLaunch({family:'curve',selectedFoot:'L'}),o=resolveLaunch({family:'curve',selectedFoot:'R',technique:'OUTSIDE'});assert.equal(r.spin[1],-l.spin[1]);assert.ok(Math.abs(r.spin[1]*1.15+o.spin[1])<1e-10);});
test('Curve skill increases attainable sidespin without changing physics',()=>{const a=[0,.5,1].map(curveSkill=>resolveLaunch({family:'curve',curveSkill}));assert.ok(Math.abs(a[0].spin[1])<Math.abs(a[1].spin[1])&&Math.abs(a[1].spin[1])<Math.abs(a[2].spin[1]));a.forEach(r=>eq(r.audit.environment,a[0].audit.environment));});
test('independent seeded errors do not depend on call order',()=>{const i={seed:12,actionId:'a',quality:.6,pressure:.7};const a=resolveExecution(i);resolveExecution({...i,actionId:'other'});eq(a,resolveExecution(i));assert.notEqual(a.yawRad,resolveExecution({...i,seed:13}).yawRad);eq(resolveExecution({...i,quality:1}).yawRad,0);});
test('engine errors are applied once; attributes and feet remain auditable',()=>{const d={action:'PASS',family:'SHORT',err:[1,-2],skill:82,pressure:.3},i=fromLegacyDecision(d,{actionId:'engine-42',delta:[15,0],selectedFoot:'L',preferredFoot:'R'}),r=resolveLaunch(i);eq(i.direction,[16,-2]);assert.equal(r.audit.execution.audit.decision.skill,82);assert.equal(r.audit.selectedFoot,'L');assert.equal(r.audit.preferredFoot,'R');assert.ok(Math.abs(r.velocity[2]/r.velocity[0]+2/16)<1e-12);});
test('lift, explicit spin and execution change only the launch',()=>{const r=resolveLaunch({family:'chip',lift:8,spinOverride:[1,2,3],execution:{quality:.8,yawRad:.02,weightFraction:.1,liftMps:.3,spinFraction:.1}});eq(r.spin,[1,2,3]);assert.equal(r.velocity[1],8.3);});
test('all families launch once then can be physically blocked',()=>{for(const family of Object.keys(FAMILIES)){const w=new BallWorld({parameters:GLOBAL,colliders:[{id:'block',p:[.8,1,0],shapes:[{type:'box',he:[.1,1,.5]}]}]});w.schedule(scheduledLaunch({family,actionId:family}));for(let n=0;n<60;n++)w.step();assert.equal(w.events.filter(e=>e.kind==='AUTHORITATIVE_LAUNCH').length,1);assert.ok(w.events.some(e=>e.kind==='PHYSICAL_CONTACT'&&e.collider==='block'));}});
test('invalid intent is rejected at boundary',()=>{for(const i of [{family:'bad'},{family:'ground',power:-1},{family:'ground',direction:[0,0]},{family:'ground',distance:Infinity},{family:'ground',execution:{yawRad:NaN}},{family:'ground',selectedFoot:'X'},{family:'ground',lift:20}])assert.throws(()=>resolveLaunch(i));});
test('low-speed displacement ordered and monotone',()=>{let prev=0;for(const v of [.5,1,2,3,4,5]){const r=lowSpeed(v);assert.ok(r.separation[1]>prev);prev=r.separation[1];assert.ok(r.separation[.1]<r.separation[.25]&&r.separation[.25]<=r.separation[.5]&&r.separation[.5]<=r.separation[1]);assert.ok(r.metrics.settled);}});
test('70 calibrated / physical scenes replay exactly',()=>eq(parityPayload(),parityPayload()));
test('camera matches actual match.js fixed reference viewport at multiple sizes',()=>{const src=fs.readFileSync(new URL('../../match.js',import.meta.url),'utf8'),code=src.slice(src.indexOf('const PROJ ='),src.indexOf('const DEPTH_ALPHA ='));let maxError=0;for(const [width,height] of [[1280,720],[1168,432],[720,480]]){const ctx=vm.createContext({Math,S:{author:{height:30,dist:43,pitch:22,yaw:0,fov:28,depthoff:3}},PITCH:{h:68},VIEW:{w:1280,h:720},RUNTIME_DEFAULTS:{smooth:.35,zoom:1},RES:1,cv:{width,height}});vm.runInContext(code+';buildFrozenBasis();TRAVEL=12.5-52.5;globalThis.project=sproj3;',ctx);const p=touchlineProjection(width,height,12.5);for(const point of [[0,.11,0],[25,0,0],[12,4.4,-3],[20,2.44,3.66]]){const a=p(point),b=ctx.project(point[0],point[1],point[2]+34);maxError=Math.max(maxError,Math.abs(a[0]-b.x),Math.abs(a[1]-b.y));assert.ok(maxError<1e-10);}}return {maxPixelError:maxError};});
test('legacy pitch-left curve sign and engine world-error axes are preserved',()=>{assert.ok(resolveLaunch({family:'curve',selectedFoot:'R'}).spin[1]>0);const p=fromLegacyDecision({action:'PASS',family:'PROGRESSIVE',err:[1,2]},{actionId:'x',delta:[0,15]});eq(p.direction,[1,17]);assert.equal(p.family,'driven');const s=fromLegacyDecision({action:'SHOOT',aim_off:20},{actionId:'s',delta:[-18,-2.9]});eq(s.direction,[-18,5.1]);});
test('approved BALANCED ground state is bit-identical through rest',()=>{
 const initial={v:[9.398939604093718,0,0],w:[0,0,-9.398939604093718/.11]};
 const a=new FoundationWorld({...initial,parameters:BALANCED}),b=new BallWorld({...initial,parameters:GLOBAL,rollingLaw:LAWS.control});
 for(let i=0;i<800;i++){a.step();b.step();eq(a.snapshot(),b.snapshot());}return {ticks:800};
});
test('vertical drop trajectories / impacts remain bit-identical',()=>{
 for(const h of [.25,.5,1,2]){const a=new FoundationWorld({p:[0,.11+h,0],parameters:BALANCED}),b=new BallWorld({p:[0,.11+h,0],parameters:GLOBAL});for(let i=0;i<600;i++){a.step();b.step();eq(a.snapshot(),b.snapshot());}eq(a.events,b.events);}
});
test('aerial centers preserve apex and first landing time within 3.1 percent',()=>{
 for(const family of ['loft','cross','chip']){const a=oldAction(family).metrics,b=actionExperiment(family).metrics;assert.ok(Math.abs(b.apex/a.apex-1)<.031);assert.ok(Math.abs(b.firstLanding.time/a.firstLanding.time-1)<.031);}
});
test('progressive resistance is continuous, dissipative and has smooth terminal decay',()=>{
 let prev=resistance(0);assert.equal(prev,0);for(let i=1;i<=50000;i++){const v=i/1000,a=resistance(v);assert.ok(Number.isFinite(a)&&a>=0&&a<=5);assert.ok(Math.abs(a-prev)<.009);prev=a;}
 assert.ok(resistance(3)>resistance(12));assert.ok(resistance(12)>resistance(25));
});
test('ground velocity has no brake jump, reverse, or energy gain',()=>{
 for(const speed of [.5,1,2,3,4,5,9.4,12.5,15,30]){const w=new BallWorld({parameters:GLOBAL,v:[speed,0,0],w:[0,0,-speed/.11]});let prev=speed,energy=w.energy(),maxDelta=0;w.onSubstep=f=>{assert.ok(f.v[0]>=0&&f.v[0]<=prev+1e-10);maxDelta=Math.max(maxDelta,prev-f.v[0]);prev=f.v[0];assert.ok(w.energy()<=energy+1e-9);energy=w.energy();};for(let i=0;i<1200&&!w.ball.sleeping;i++)w.step();assert.ok(w.ball.sleeping);assert.ok(maxDelta<.05);}
});
test('progressive surface changes rolling only, not the skid impulse',()=>{
 const initial={v:[9,0,0],w:[0,0,0]};const a=new FoundationWorld({...initial,parameters:GLOBAL}),b=new BallWorld({...initial,parameters:GLOBAL});let sliding=0;
 for(let i=0;i<60;i++){a.step();b.step();if(a.ball.mode==='SLIDING'&&b.ball.mode==='SLIDING'){eq(a.snapshot(),b.snapshot());sliding++;}else break;}assert.ok(sliding>10);return {exactSlidingTicks:sliding};
});
test('primary ground matrix is 12 candidates; preferred pair faster and shorter',()=>{
 const rows=groundMatrix(),a=rows[0].metrics,b=rows.find(r=>r.id==='ground-fast-responsive').metrics;assert.equal(rows.length,12);assert.ok(b.arrival.time<a.arrival.time*.82);assert.ok(b.range<a.range*.65);assert.ok(rows.find(r=>r.id==='ground-balanced-responsive').metrics.arrival===null);
});
test('curve bracket exceeds 1.5x, 2x, 3x and 4x without reversal or instability',()=>{
 const rows=curveBracket(),base=Math.abs(rows[0].metrics.arrival.lateral);for(let i=0;i<rows.length;i++){const r=rows[i],w=new BallWorld({parameters:GLOBAL});w.schedule(r.action);for(let n=0;n<1200&&!w.ball.sleeping;n++){w.step();assert.ok(w.ball.v[0]>=-1e-10);assert.ok(w.energy()>=0);}assert.ok(w.ball.sleeping);assert.equal(w.stats.ccdExhausted,0);if(i)assert.ok(Math.abs(r.metrics.arrival.lateral)>base*[1,1.5,2,3,4][i]);}
});
test('extreme curve probing rejects the subsequent reversing spin range',()=>{
 const w=new BallWorld({parameters:GLOBAL,v:[22.5,6.9,0],w:[0,150,0]});let min=0;for(let i=0;i<900;i++){w.step();min=Math.min(min,w.ball.v[0]);}assert.ok(min<-.5);return {rejectedSpinRadS:150,minForwardVelocity:min};
});
test('straight shot/power stays straight; poor skill and execution stay small',()=>{
 for(const family of ['shot','power']){const r=actionExperiment(family);assert.equal(r.metrics.maxLateral,0);}
 const poor=actionExperiment('curve',{curveSkill:0,execution:{quality:.3}}),elite=actionExperiment('curve',{curveSkill:1});assert.ok(Math.abs(poor.metrics.arrival.lateral)<.2);assert.ok(Math.abs(elite.metrics.arrival.lateral)>8);
});
test('distance resolver is continuous at family distances and supports 5–30m',()=>{
 for(const family of ['short','ground','firm'])for(const distance of [5,10,15,20,25,30]){const a=resolveLaunch({family,distance}),b=resolveLaunch({family,distance:distance+.001});assert.ok(Math.abs(a.velocity[0]-b.velocity[0])<.002);const r=actionExperiment(family,{distance});assert.ok(r.metrics.arrival);assert.ok(Math.abs(r.metrics.arrival.speed-r.launch.audit.baseArrival)<.02);}
});
test('global environment is shared and inputs remain immutable',()=>{for(const family of Object.keys(FAMILIES)){const r=actionExperiment(family);eq(r.parameters,GLOBAL);eq(r.rollingLaw,LAWS.responsive);}});
test('elite inside / outside curve remains forward across the default power envelope',()=>{
 for(const power of [0,.15,.5,.85,1])for(const technique of ['INSIDE','OUTSIDE']){const w=new BallWorld({parameters:GLOBAL});w.schedule(scheduledLaunch({family:'curve',power,technique,curveSkill:1,actionId:'envelope'}));for(let i=0;i<1200&&!w.ball.sleeping;i++){w.step();assert.ok(w.ball.v[0]>=-1e-10);}assert.ok(w.ball.sleeping);}
});
test('rolling law rejects invalid coefficients',()=>{for(const rollingLaw of [{constant:'2'},{constant:-1},{high:1,low:0,knee:8,terminal:.6},{high:1,low:5,knee:0,terminal:.6},{high:1,low:5,knee:8,terminal:0}])assert.throws(()=>new BallWorld({rollingLaw}));});
const result={tests,passed:tests.filter(t=>t.pass).length,total:tests.length};fs.writeFileSync(new URL('../evidence/resolver-tests.json',import.meta.url),JSON.stringify(result,null,2));console.log(`${result.passed}/${result.total}`);if(result.passed!==result.total)process.exitCode=1;

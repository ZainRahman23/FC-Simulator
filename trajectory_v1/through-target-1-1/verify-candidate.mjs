import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fixture,SCENARIOS} from './fixtures.mjs';
import {endpoint,selectRunner,prepareScenario,simulateRun,RULES,CHASE_RULES} from './core.mjs';
import * as baseline from '../through-target-1/core.mjs';
import {fixture as oldFixture} from '../through-target-1/fixtures.mjs';
const checks=[],rows=[];const check=(s,v)=>{assert.ok(v,s);checks.push(s);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),hash=a=>crypto.createHash('sha256').update(JSON.stringify(a)).digest('hex');
const canonical=r=>({frames:r.frames,plans:r.plans,events:r.events,diagnostics:r.diagnostics,receive:r.receive,actualAction:r.actualAction,idealAction:r.idealAction,outcome:r.outcome});
for(const sc of SCENARIOS){
 const i=fixture(sc.id),p=await prepareScenario(i),old=await baseline.prepareScenario(i);
 check(sc.id+': exact initial selection',same(p.selection,old.selection));
 check(sc.id+': exact endpoint intent/capability',same(p.endpoint,old.endpoint));
 for(const k of ['actualAction','idealAction'])check(sc.id+': frozen '+k,same(p.pass[k],old.pass[k]));
 for(const k of ['sigma','draws','accuracy','effectivePassingAccuracy'])check(sc.id+': frozen '+k,same(p.pass.audit[k],old.pass.audit[k]));
 const r=simulateRun(p),repeat=simulateRun(await prepareScenario(i));
 check(sc.id+': deterministic entire run',same(canonical(r),canonical(repeat)));
 check(sc.id+': finite physical states',r.frames.every(f=>[...f.ball.p,...f.ball.v,...(f.runner?.position??[]),...(f.runner?.velocity??[])].every(Number.isFinite)));
 check(sc.id+': same ball before receive and after abandon',r.diagnostics.maxFreeBallDeviation<1e-9);
 check(sc.id+': no runner reassignment',r.diagnostics.ownershipChanges===0&&new Set(r.frames.filter(f=>f.runner).map(f=>f.runner.id)).size<=1);
 check(sc.id+': full sprint during commitment',r.frames.filter(f=>f.runner&&f.phase==='FULL_SPRINT').every(f=>f.runner.sprintCommand===i.players.find(p=>p.id===f.runner.id).sprintSpeed));
 let lastAbandoned=false,remainsReleased=true,maxJump=0;for(let n=1;n<r.frames.length;n++){const a=r.frames[n-1],b=r.frames[n];if(lastAbandoned&&b.chaseState!=='ABANDONED')remainsReleased=false;if(b.chaseState==='ABANDONED')lastAbandoned=true;if(a.runner&&b.runner){const dt=b.time-a.time;const moved=Math.hypot(b.runner.position[0]-a.runner.position[0],b.runner.position[2]-a.runner.position[2]);const possible=Math.max(Math.hypot(...a.runner.velocity),Math.hypot(...b.runner.velocity))*dt+.016;maxJump=Math.max(maxJump,moved-possible);}}
 check(sc.id+': no teleport at handoff or abandonment',maxJump<=0);check(sc.id+': no flip back into chase',remainsReleased);
 const ab=r.diagnostics.abandonment;if(ab){const af=r.frames.filter(f=>f.chaseState==='ABANDONED'),first=af[0],last=af.at(-1);check(sc.id+': abandonment after commitment',ab.time>=.6-1e-8);check(sc.id+': no instant freeze',Math.hypot(...first.runner.velocity)>.05);check(sc.id+': deceleration continues simulation',af.length>30&&last.time>ab.time+1);check(sc.id+': recovery lowers speed',Math.hypot(...last.runner.velocity)<Math.hypot(...first.runner.velocity));check(sc.id+': no receive after release',!r.receive);check(sc.id+': recovery labelled',af.every(f=>f.phase==='NEUTRAL_RECOVERY'));}
 if(r.receive?.firstTouchExecuted){check(sc.id+': receives while moving',r.receive.speedBefore>1);check(sc.id+': unchanged physical RECEIVE contact',r.receive.contacts.length>0);}
 const transitions=r.frames.filter((f,n)=>!n||f.chaseState!==r.frames[n-1].chaseState||f.feasibility?.state!==r.frames[n-1].feasibility?.state).map(f=>({time:f.time,chase:f.chaseState,feasibility:f.feasibility?.state,deficit:f.feasibility?.arrivalDeficit}));
 rows.push({id:sc.id,label:sc.label,input:i,selected:p.selection.selectedId,outcome:r.outcome,abandonment:ab??null,receive:r.receive?{time:r.receive.time,point:r.receive.point,speedBefore:r.receive.speedBefore,contacts:r.receive.contacts.length,executed:r.receive.firstTouchExecuted,continuationFailed:r.receive.continuationFailed}:null,actualEndpoint:p.actualEndpoint,endpoint:p.endpoint,transitions,plans:r.plans,simulationMs:r.performance.simulationMs,maxFreeBallDeviation:r.diagnostics.maxFreeBallDeviation,traceSHA256:hash(r.frames)});
 fs.writeFileSync(new URL('run-'+sc.id+'.json',import.meta.url),JSON.stringify(r));
 console.log(JSON.stringify({id:sc.id,outcome:r.outcome,abandonment:ab??null,receive:r.receive?.time,ms:r.performance.simulationMs}));
}
// Stress only the unchanged selector; comparison has no new radius/timing assumptions.
for(const sp of [40,80,99])for(const aim of [-30,0,30])for(const holdMs of [0,200,400]){const i=oldFixture('sweep',{shotPower:sp,aimDeg:aim,holdMs});check(`selector unchanged ${sp}/${aim}/${holdMs}`,same(selectRunner(i),baseline.selectRunner(i)));}
// A selected player's technique changes movement, never pass launch or randomness.
const a=await prepareScenario(oldFixture('stride'));for(const kind of ['empty','fast','attributes']){const i=oldFixture('stride');if(kind==='empty')i.players=[];if(kind==='fast')i.players.forEach(p=>p.velocity=[-8,0,0]);if(kind==='attributes')i.players.forEach(p=>Object.assign(p,{agility:40,ballControl:40,dribbling:40}));const b=await prepareScenario(i);check(kind+': launch/RNG independent of receiver',same(a.pass.actualAction,b.pass.actualAction)&&same(a.pass.audit.draws,b.pass.audit.draws));}
const mixA=await prepareScenario(oldFixture('stride',{longPassing:60,vision:90})),mixB=await prepareScenario(oldFixture('stride',{longPassing:75,vision:55}));check('70/30 equation unchanged',mixA.pass.audit.effectivePassingAccuracy===69&&mixB.pass.audit.effectivePassingAccuracy===69&&same(mixA.pass.actualAction,mixB.pass.actualAction));
const output={version:RULES.version,status:'PASS',checks:{passed:checks.length,failed:0,list:checks},rules:{...RULES,chase:CHASE_RULES},rows};fs.writeFileSync(new URL('validation.json',import.meta.url),JSON.stringify(output,null,2));console.log(JSON.stringify({passed:checks.length,scenarios:rows.length}));

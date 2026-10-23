// Portable handoff verification. No dependency installation; Node built-ins only.
import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {ENV} from '../review/lab/sandbox/visual/tc_baseline_88573ef0/tools/pt_env.mjs';
import {run,request,scenario,AgilitySim,DT,PROFILES} from '../review/lab/sandbox/visual/agility99/cases.js';
import {DirectionBody} from '../review/lab/sandbox/visual/agility99/direction_body.js';
const read=p=>fs.readFileSync(new URL(p,import.meta.url)),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),hash=x=>sha(JSON.stringify(x));
const historical=JSON.parse(read('../review/data/verification.json')),fixture=JSON.parse(read('../review/data/v1-authoritative-reference.json'));
const out={mode:process.argv.includes('--full')?'full':'smoke',node:process.version,sourceHashChecks:0,referenceCases:0,poseNeutralCases:0,onlineReplayCases:0,onlineReplayMaxError:0,errors:[]};
for(const [f,h]of Object.entries(historical.files)){assert.equal(sha(read('../review/lab/sandbox/visual/agility99/'+f)),h);out.sourceHashChecks++;}
for(const [f,key]of [['support.js','supportSHA256'],['direction_body.js','directionBodySHA256']]){assert.equal(sha(read('../review/lab/sandbox/visual/agility99/'+f)),historical[key]);out.sourceHashChecks++;}
const refs=out.mode==='full'?fixture.rows:fixture.rows.filter(r=>r.mode==='SPRINT'&&r.phase===0&&r.sign===1&&((r.kind==='snap'&&[30,90,180].includes(r.angle))||r.kind==='circle-fast'));
for(const r of refs){const spec=scenario(r.kind,r.mode,r.angle,r.phase,r.sign),x=run(ENV,spec,'A99-C',r.ballOn);assert.equal(hash(x.ticks),r.tickSHA256,r.id+' tick arrays');assert.equal(hash(x.sim.contacts),r.contactSHA256,r.id+' contacts');assert.equal(x.sim.hash,r.simulationHash);out.referenceCases++;}
const env={...ENV,colliders:JSON.parse(read('../review/lab/sandbox/visual/dribble1/d1_colliders.json'))};
for(const profile of Object.keys(PROFILES))for(const ballOn of [false,true]){const spec=scenario('rapid'),a=new AgilitySim(env,{profile,ballOn}),b=new AgilitySim(env,{profile,ballOn}),body=new DirectionBody(env,b),poses=[];
for(let k=0;k<Math.round(spec.end/DT);k++){const q=request(k*DT<.2?null:spec.fn(k*DT));a.step(q);b.step(q);if(k%4===0){const p=body.pose(b.t);poses.push({t:b.t,J:structuredClone(p.J),support:p.support});}}
assert.equal(a.hash,b.hash);assert.deepEqual(a.contacts,b.contacts);out.poseNeutralCases++;
const replay=new DirectionBody(env,b);for(const live of poses){const p=replay.pose(live.t);for(const name of Object.keys(p.J))for(const field of ['j','t'])for(let i=0;i<3;i++)out.onlineReplayMaxError=Math.max(out.onlineReplayMaxError,Math.abs(p.J[name][field][i]-live.J[name][field][i]));assert.deepEqual(p.support,live.support);}out.onlineReplayCases++;}
assert.equal(out.onlineReplayMaxError,0);fs.writeFileSync(new URL('../review/data/handoff-verification.json',import.meta.url),JSON.stringify(out,null,2));console.log(out);

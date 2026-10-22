import fs from 'node:fs';import assert from 'node:assert/strict';
import {fixture} from '../passing-attributes-5/common.mjs';import {solveIdeal,execute,measurements} from '../passing/pass-router.mjs';import {simulate} from '../passing/flight-router.mjs';
const rows=[];
for(const family of ['THROUGH','CROSS'])for(const spec of [{name:'Technical / weaker',sp:45,r:95,v:90,curve:90},{name:'Powerful / rough',sp:95,r:55,v:60,curve:60}]){
 const i=fixture(family,30,spec.r,spec.v);i.requestedDistance=30;i.attributes.shot_power=spec.sp;i.attributes.curve=spec.curve;const s=solveIdeal(i),misses=[];
 for(let n=0;n<32;n++){i.drawEventId='range-archetype-'+n;const p=await execute(i,s),a=simulate(p.actualAction,p.target,p.arrivalTime),m=measurements(p,a);assert.equal(p.audit.capability.limited,false);assert.equal(m.launchCount,1);misses.push(m.physicalMiss);}
 rows.push({family,...spec,requestedRange:30,effective:family==='THROUGH'?.7*spec.r+.3*spec.v:.85*spec.r+.15*spec.v,physicalMax:s.intent.capability.physicalMaxRange,count:misses.length,rms:Math.sqrt(misses.reduce((s,n)=>s+n*n,0)/misses.length),max:Math.max(...misses),misses});
}
for(const f of ['THROUGH','CROSS']){const [a,b]=rows.filter(r=>r.family===f);assert.ok(b.rms>a.rms*2);}
fs.writeFileSync(new URL('archetypes.json',import.meta.url),JSON.stringify({rows,checks:'128 within-capability physical passes; one launch each; both weaker technicians substantially more accurate'}));console.log(rows.map(({misses,...r})=>r));

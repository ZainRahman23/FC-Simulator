import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fixture,stats} from '../passing-attributes-5/common.mjs';
import * as now from '../passing/pass-router.mjs';
import * as old from './baseline/pass-router.mjs';
const rows=[];
// Warm each module once. All measured cases solve their ideal afresh; no cache.
for(const mod of [old,now]) { const i=fixture('CROSS',35);await mod.execute(i,mod.solveIdeal(i)); }
const cases=[];
for(const d of [20,35,47.27,60,70])for(const curve of [1,40,80,99])for(const r of [50,80,99])for(const event of ['perf5-0','perf5-1'])cases.push({d,curve,r,event});
for(const curve of [1,40,80,99])for(const r of [1,20])cases.push({d:70,curve,r,event:'envelope-4'});
for(let n=0;n<cases.length;n++){
 const c=cases[n],i=fixture('CROSS',c.d,c.r,c.r,c.event);i.attributes.curve=c.curve;const pair={};
 for(const key of (n%2?['now','old']:['old','now'])){const mod=key==='now'?now:old,t=performance.now(),s=mod.solveIdeal(i),idealMs=performance.now()-t,p=await mod.execute(i,s);pair[key]={idealMs,actualMs:p.audit.performance.executionCpuMs,totalMs:performance.now()-t,telemetry:p.audit.executionSolve,action:p.actualAction};}
 assert.deepEqual(pair.now.action,pair.old.action);delete pair.now.action;delete pair.old.action;rows.push({...c,...pair});
}
const summary=(rs,key)=>({count:rs.length,mean:stats(rs.map(x=>x[key].totalMs)).mean,worst:Math.max(...rs.map(x=>x[key].totalMs)),p90:stats(rs.map(x=>x[key].totalMs)).p90,worstCase:rs.reduce((a,b)=>a[key].totalMs>b[key].totalMs?a:b)});
const cp=JSON.parse(fs.readFileSync(new URL(fs.readdirSync(new URL('.',import.meta.url)).find(x=>x.endsWith('.cpuprofile')),import.meta.url))),nodes=new Map(cp.nodes.map(n=>[n.id,n])),times={};
for(let n=0;n<cp.samples.length;n++){const name=nodes.get(cp.samples[n]).callFrame.functionName||'(anonymous)';times[name]=(times[name]??0)+cp.timeDeltas[n];}
const duration=Object.values(times).reduce((a,b)=>a+b,0),profile=Object.entries(times).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([name,us])=>({name,percent:100*us/duration}));
const data={method:'Uncached ideal + actual solve, alternating old/new order, single Node process; 120 requested grid cases plus 8 low-rating extreme cases.',grid:{old:summary(rows.slice(0,120),'old'),now:summary(rows.slice(0,120),'now')},all:{old:summary(rows,'old'),now:summary(rows,'now')},rows,profile};
fs.writeFileSync(new URL('performance.json',import.meta.url),JSON.stringify(data));console.log(JSON.stringify({grid:{old:data.grid.old.mean,now:data.grid.now.mean,oldWorst:data.grid.old.worst,newWorst:data.grid.now.worst},all:{oldWorst:data.all.old.worst,newWorst:data.all.now.worst},profile},null,2));

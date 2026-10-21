import fs from 'node:fs';
import {ENV} from '../tc_baseline_88573ef0/tools/pt_env.mjs';
import {run,scenario,PROFILES} from './cases.js';import {measure} from './metrics.js';
const suite=process.argv[2]||'quick',out=process.argv[3]||'a99-results.json',cases=[];
if(suite==='quick'){for(const a of [30,45,60,90,120,180])cases.push(scenario('snap','SPRINT',a));for(const k of ['rapid','repeat30','circle','circle-fast','stop'])cases.push(scenario(k));}
else{
 for(const mode of ['JOG','RUN','SPRINT'])for(const angle of [15,30,45,60,90,120,150,180])for(const phase of [0,.12,.24,.36])for(const sign of [1,-1])cases.push(scenario('snap',mode,angle,phase,sign));
 for(const mode of ['JOG','RUN','SPRINT'])for(const kind of ['gradual','ramp-fast','rapid','repeat30','sequence','circle','circle-fast','stop'])for(const phase of [0,.24])for(const sign of (kind==='stop'?[1]:[1,-1]))cases.push(scenario(kind,mode,90,phase,sign));
}
const rows=[],t=Date.now();let n=0;
for(const ballOn of [false,true])for(const c of cases)for(const p of Object.keys(PROFILES)){
 const main=run(ENV,c,p,ballOn),cfs=[];
 for(let i=0;i<c.steps.length;i++){
  const [tc]=c.steps[i],prev=c.fn(tc-1/240),end=c.steps[i+1]?.[0]??c.end;
  cfs.push(run(ENV,{...c,end,fn:t=>t<tc-1e-9?c.fn(t):prev},p,ballOn));
 }
 rows.push(measure(main,c,cfs));n++;if(n%16===0){fs.writeFileSync(out,JSON.stringify({suite,profiles:PROFILES,cases:cases.map(({fn,...x})=>x),rows},null,1));console.log(n,'/',cases.length*8,((Date.now()-t)/1000).toFixed(1)+'s',ballOn?'BALL ON':'BODY');}
}
fs.writeFileSync(out,JSON.stringify({suite,profiles:PROFILES,cases:cases.map(({fn,...x})=>x),rows},null,1));console.log('DONE',rows.length);

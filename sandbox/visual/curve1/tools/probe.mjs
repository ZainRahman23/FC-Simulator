import fs from 'node:fs';import {SCENARIOS,RATINGS} from '../config.js';import {launch,trace,solveTarget} from '../experiments.js';
// Anchor candidates are evaluated without constructing or running a keeper.
const candidates=[];
for(const anchor of [20,21,25,35,40,45,50,55,60,65,70,80,90,100,110])for(const s of SCENARIOS){
 try{
 const reference=solveTarget(s,75,{anchorSpin:anchor}),rows=[];
 for(const curve of RATINGS){const a=launch(s,curve,reference.aim);a.spin=[0,-anchor*(curve/75)**2.7,0];const r=trace(a);rows.push({curve,spin:-a.spin[1],bend:r.metrics.goal?.bend,arrival:r.metrics.goal?.time,position:r.metrics.goal?.position,headingChange:r.metrics.maxHeadingDeviationDegrees,reversed:r.metrics.reversed,groundBeforeGoal:r.metrics.preGoalTurfContact});}
 candidates.push({anchor,scenario:s.id,aim:reference.aim,monotoneBend:rows.every((r,i)=>i===0||r.bend>=rows[i-1].bend),rows});
 }catch(e){candidates.push({anchor,scenario:s.id,rejected:e.message,rows:[]});}
}
fs.writeFileSync(new URL('../evidence/anchor-probe.json',import.meta.url),JSON.stringify({method:'Separate constant-Magnus candidate. Only unopposed physical trajectories; no goalkeeper outcomes available to anchor selection',candidates},null,2)+'\n');
for(const c of candidates)console.log(JSON.stringify({anchor:c.anchor,scenario:c.scenario,monotone:c.monotoneBend,bend:c.rows.filter(r=>[50,75,90,99].includes(r.curve)).map(r=>[r.curve,r.bend==null?null:+r.bend.toFixed(3)])}));

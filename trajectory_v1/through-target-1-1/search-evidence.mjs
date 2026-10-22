import {prepareScenario,simulateRun} from './core.mjs';
import {fixture} from './fixtures.mjs';
import {writeFileSync} from 'node:fs';
const rows=[];
for(let seed=1;seed<=100;seed++){const f=fixture('closest',{requestedDistance:45,longPassing:1,vision:1,seed});const p=await prepareScenario(f);rows.push({seed,actualEndpoint:p.actualEndpoint,launch:p.pass.actualAction.velocity,miss:Math.hypot(p.actualEndpoint[0]-45,p.actualEndpoint[2])});}
writeFileSync(new URL('./search-evidence.json',import.meta.url),JSON.stringify({input:{requestedDistance:45,longPassing:1,vision:1},rows},null,2)+'\n');
console.log('over',rows.toSorted((a,b)=>b.actualEndpoint[0]-a.actualEndpoint[0]).slice(0,8));console.log('under',rows.toSorted((a,b)=>a.actualEndpoint[0]-b.actualEndpoint[0]).slice(0,8));console.log('wide',rows.toSorted((a,b)=>Math.abs(b.actualEndpoint[2])-Math.abs(a.actualEndpoint[2])).slice(0,8));

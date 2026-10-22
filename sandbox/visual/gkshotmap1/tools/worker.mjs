import fs from 'node:fs';import path from 'node:path';import {parentPort,workerData} from 'node:worker_threads';import {createGzip} from 'node:zlib';import {once} from 'node:events';
import {runCase} from '../cases.js';import {GRID} from '../config.js';
const {family,origin,out}=workerData,start=performance.now(),cpu=process.cpuUsage(),file=path.join(out,`${origin}-${family}.jsonl.gz`),gzip=createGzip({level:6}),dest=fs.createWriteStream(file);gzip.pipe(dest);
let total=0,unsolved=0,aimCalls=0,unique=0;const counts={},previous=new Array(GRID.nx).fill(null);
for(let iy=0;iy<GRID.ny;iy++)for(let ix=0;ix<GRID.nx;ix++){
 let initial=previous[ix];
 for(let attempt=0;attempt<GRID.attempts;attempt++){
  const r=runCase(origin,family,ix,iy,attempt,{});total++;if(r.unsolved)unsolved++;else{initial=r.aim;unique++;aimCalls+=r.aim.calls;counts[r.outcome]=(counts[r.outcome]||0)+1;}
  if(!gzip.write(JSON.stringify(r)+'\n'))await once(gzip,'drain');
 }
 previous[ix]=initial;
 if(ix===GRID.nx-1)parentPort.postMessage({progress:true,origin,family,rows:iy+1,total,unsolved,seconds:(performance.now()-start)/1000});
}
gzip.end();await once(dest,'close');parentPort.postMessage({done:true,origin,family,total,unique,unsolved,aimCalls,counts,seconds:(performance.now()-start)/1000,processCpuMicroseconds:process.cpuUsage(cpu),bytes:fs.statSync(file).size});

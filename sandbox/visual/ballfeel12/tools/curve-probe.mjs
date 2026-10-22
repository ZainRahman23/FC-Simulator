import {BallWorld} from '../world.js';import {measure} from '../../ballfeel1/experiments.js';
const rows=[];
for(const spin of [80,110])for(const gain of [1.8,2.5,3.5,5,8])for(const early of [.15,.5,1]){const curveLaw={gain,early,lowSpeed:17,highSpeed:23,cap:3,quench:8,quenchLow:13,quenchHigh:17};const w=new BallWorld({v:[22.5,6.9,0],w:[0,spin,0],curveLaw}),frames=[w.snapshot()];w.onSubstep=f=>frames.push(f);for(let i=0;i<1500&&!w.ball.sleeping;i++)w.step();const at=[10,15,20,22,25,30].map(d=>measure(frames,w.events,d).arrival);const maxX=Math.max(...frames.map(f=>f.p[0])),minVX=Math.min(...frames.map(f=>f.v[0]));rows.push({spin,gain,early,minVX,maxX,at});}
console.log(JSON.stringify(rows,null,2));

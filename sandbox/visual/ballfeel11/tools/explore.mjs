import {BallWorld,LAWS} from '../world.js';
import {GLOBAL} from '../../ballfeel1/config.js';
import {simulate as oldSim,actionExperiment} from '../../ballfeel1/experiments.js';
function run(speed,law){const w=new BallWorld({v:[speed,0,0],w:[0,0,-speed/.11],parameters:GLOBAL,rollingLaw:law});let a=null;for(let i=0;i<3000;i++){w.step();if(!a&&w.ball.p[0]>=15)a=[w.time,w.ball.v[0]];if(w.ball.sleeping)break;}return {speed,law:law.id,arrival:a,range:w.ball.p[0],rest:w.time};}
for(const v of [9.398937,12.5,15])for(const law of Object.values(LAWS))console.log(JSON.stringify(run(v,law)));
for(const spin of [39,60,80,110,150,190,240]){const r=oldSim({id:'curve',initial:{v:[22.5,6.9,0],w:[0,spin,0]},parameters:{...GLOBAL,maxLift:1.2},target:22,duration:3});console.log('curve',spin,r.metrics.arrival,r.metrics.firstLanding);}
for(const f of ['loft','cross','chip']){const a=actionExperiment(f),b=actionExperiment(f,'balanced',{...GLOBAL,maxLift:1.2});console.log('aerial',f,{old:[a.metrics.apex,a.metrics.firstLanding],next:[b.metrics.apex,b.metrics.firstLanding]});}
